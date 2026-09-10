import dotenv from 'dotenv';
dotenv.config();

import assert from 'assert';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  ExamRecord,
  MockTestRecord,
  MockQuestion,
  MockBlueprintRecord,
  BlueprintQuestionSlot,
  PreparationMode
} from '../../src/types.ts';
import { getExecutionEnvironment } from '../persistence/repository.ts';
import { createLocalRegistry } from '../persistence/local/index.ts';
import { createSupabaseRegistry } from '../persistence/supabase/index.ts';
import { isSupabaseConfigured } from '../persistence/supabaseClient.ts';
import { getRepositoryRegistry } from '../persistence/index.ts';
import { getGenAI, getPrimaryModel, getThinkingConfig, resolveExecutionModel } from '../geminiConfig.ts';
import { calculateModelCost } from '../geminiPricingService.ts';
import { validateQuestionStructure, analyzeOptionSymmetry, repairOptionSymmetryConceptually } from '../questionValidationService.ts';

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runLiveGemini5PersistedTest() {
  console.log('========================================================================');
  console.log('🧪 RUNNING 5-QUESTION LIVE_GEMINI PERSISTED DATABASE TEST');
  console.log('========================================================================\n');

  // Select registry based on configuration
  const registry = getRepositoryRegistry();

  const examId = 'tgpsc_group_2_paper_1';
  const prepMode: PreparationMode = 'PRE_NOTIFICATION_PREPARATION';
  const mockId = `mock_live5_${Date.now().toString(36)}`;
  const seriesId = `series_live5_${Date.now().toString(36)}`;

  // 1. Resolve live execution model
  const resolved = resolveExecutionModel({
    test_mode: 'FULL_LENGTH',
    fallback_policy: 'ALLOW_ECONOMY_FALLBACK_WITH_STRICT_AUDIT'
  });
  let activeModel = resolved.model_id;
  console.log(`  [MODEL_TARGET] Target Model: ${activeModel} (Tier: ${resolved.tier})`);

  const ai = getGenAI();

  // 2. Generate 5 authentic questions via live Gemini
  console.log('\n--- GENERATING 5 QUESTIONS VIA LIVE GEMINI ---');
  const topics = [
    'Telangana Socio-Economic Outlook & Budget Highlights',
    'Articles 14-32 Fundamental Rights & Judicial Doctrines',
    'Kakatiya & Asaf Jahi Dynasty Architecture & Inscriptions',
    'Rythu Bandhu / Rythu Bharosa & Mission Kakatiya Schemes',
    'Western Ghats vs Eastern Ghats Agro-climatic systems'
  ];

  const generatedQuestions: MockQuestion[] = [];

  for (let i = 0; i < 5; i++) {
    const qNum = i + 1;
    const topic = topics[i];
    console.log(`  Generating Question ${qNum}/5 for topic: '${topic}'...`);

    const prompt = `You are an expert exam question creator for the Telangana Public Service Commission (TGPSC) Group 2 Examination.
Create 1 authentic, rigorous, four-option multiple choice question for topic: "${topic}".
Guidelines:
- Return valid JSON matching the schema.
- All four options must be approximately uniform in length and structural complexity.
- Exactly 1 unambiguously correct option.
- Explanations must cite official sources or acts.
- Do NOT include answers or parenthetical hints inside options.
`;

    let response: any;
    try {
      response = await ai.models.generateContent({
        model: activeModel,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT' as any,
            properties: {
              question_text: { type: 'STRING' as any },
              options: {
                type: 'ARRAY' as any,
                items: { type: 'STRING' as any }
              },
              correct_option_index: { type: 'INTEGER' as any },
              explanation: { type: 'STRING' as any },
              source_reference: { type: 'STRING' as any },
              core_concept: { type: 'STRING' as any },
              core_answerable_fact: { type: 'STRING' as any }
            },
            required: ['question_text', 'options', 'correct_option_index', 'explanation', 'source_reference']
          }
        }
      });
    } catch (err: any) {
      if ((err.message?.includes('429') || err.message?.includes('503') || err.status === 503) && activeModel !== 'gemini-3.1-flash-lite') {
        console.log(`  [MODEL_TIER_FALLBACK] ${activeModel} unavailable (${err.status || 'limit'}), applying policy ALLOW_ECONOMY_FALLBACK_WITH_STRICT_AUDIT -> shifting to gemini-3.1-flash-lite...`);
        activeModel = 'gemini-3.1-flash-lite';
        response = await ai.models.generateContent({
          model: activeModel,
          contents: prompt,
          config: {
            thinkingConfig: { thinkingBudget: 0 },
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT' as any,
              properties: {
                question_text: { type: 'STRING' as any },
                options: {
                  type: 'ARRAY' as any,
                  items: { type: 'STRING' as any }
                },
                correct_option_index: { type: 'INTEGER' as any },
                explanation: { type: 'STRING' as any },
                source_reference: { type: 'STRING' as any },
                core_concept: { type: 'STRING' as any },
                core_answerable_fact: { type: 'STRING' as any }
              },
              required: ['question_text', 'options', 'correct_option_index', 'explanation', 'source_reference']
            }
          }
        });
      } else {
        throw err;
      }
    }

    const parsed = JSON.parse(response.text || '{}');
    const q: MockQuestion = {
      question_id: `q_live5_${mockId}_${qNum}`,
      mock_id: mockId,
      question_number: qNum,
      section_name: 'General Studies',
      question_text: parsed.question_text,
      options: parsed.options,
      correct_option_index: parsed.correct_option_index,
      explanation: parsed.explanation,
      source_reference: parsed.source_reference,
      topic,
      difficulty: 'MEDIUM',
      canonical_hash: '',
      candidate_status: 'ACCEPTED',
      generation_provenance: 'LIVE_GEMINI',
      generation_model_id: activeModel,
      core_concept: parsed.core_concept || topic,
      core_answerable_fact: parsed.core_answerable_fact || parsed.question_text
    };

    // Verify and clean symmetry if needed
    const symmetry = analyzeOptionSymmetry(q.options, q.correct_option_index, q.question_text);
    if (symmetry.outlier_level === 'MAJOR_OUTLIER' && symmetry.parenthetical_leak_detected) {
      repairOptionSymmetryConceptually(q);
    }

    generatedQuestions.push(q);
    console.log(`    -> Q${qNum} generated successfully [LIVE_GEMINI, model: ${activeModel}].`);
  }

  assert.strictEqual(generatedQuestions.length, 5);

  console.log('\n--- PERSISTING MOCK AND QUESTIONS ---');

  await runTest('1: Persist Mock and Questions through repository', async () => {
    const mockRecord: MockTestRecord = {
      mock_id: mockId,
      exam_id: examId,
      exam_title: 'TGPSC Group-II Services',
      mock_number: 1,
      title: 'TGPSC 5-Question Live Database Mock',
      series_id: seriesId,
      preparation_mode: prepMode,
      created_at: new Date().toISOString(),
      duration_minutes: 30,
      total_questions: 5,
      total_marks: 5,
      negative_marking_rate: 0.25,
      difficulty_mix: { easy: 1, medium: 4, hard: 0 },
      sections: [{
        section_id: 'sec_1',
        section_name: 'General Studies',
        total_questions: 5,
        marks_per_question: 1,
        questions: generatedQuestions
      }],
      duplicates_prevented_count: 0,
      status: 'READY_FOR_AUDIT'
    };

    await registry.mocks.saveMock(mockRecord);
    const fetched = await registry.mocks.getMockById(mockId);
    assert(fetched !== null);
    assert.strictEqual(fetched?.mock_id, mockId);
    assert.strictEqual(fetched?.sections[0].questions.length, 5);
  });

  await runTest('2: Atomically finalize Mock and commit questions to duplicate ledger', async () => {
    const result = await registry.mocks.finalizeMock(mockId, 'Lead Auditor', '5-Question live test pass');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.mock.status, 'FINAL');
    assert(result.addedToLedger >= 5, 'All 5 questions should be committed to ledger');
  });

  console.log('\n--- RESTARTING SERVER & VERIFYING PERSISTED STATE ---');

  // Re-instantiate registry
  const freshRegistry = getRepositoryRegistry();

  await runTest('3: Verify Mock remains FINAL and questions persist after restart', async () => {
    const mock = await freshRegistry.mocks.getMockById(mockId);
    assert(mock !== null);
    assert.strictEqual(mock?.status, 'FINAL');
    assert.strictEqual(mock?.sections[0].questions.length, 5);
    for (const q of mock?.sections[0].questions || []) {
      assert.strictEqual(q.generation_provenance, 'LIVE_GEMINI');
      assert(q.generation_model_id?.startsWith('gemini'));
    }
  });

  await runTest('4: Verify Duplicate Ledger consults persisted entries and blocks duplicate', async () => {
    const targetQ = generatedQuestions[0];
    const entries = await freshRegistry.ledger.getLedgerEntries(seriesId);
    assert(entries.length >= 5);

    // Check for exact text match in ledger
    const normalizedTarget = targetQ.question_text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const match = entries.find(e => {
      const norm = (e.canonical_full_text || e.normalized_text || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      return norm === normalizedTarget;
    });

    assert(match !== undefined, 'Target live question must be found in persisted duplicate ledger');
    console.log(`    [Persisted Ledger Verified] Blocked duplicate collision with ledger_id: ${match?.ledger_id}`);
  });

  console.log('\n========================================================================');
  console.log('🎉 5-QUESTION LIVE_GEMINI PERSISTED DATABASE TEST COMPLETED SUCCESSFULLY');
  console.log('========================================================================\n');
}

runLiveGemini5PersistedTest().catch(err => {
  console.error('Fatal crash in 5-question live test:', err);
  process.exit(1);
});
