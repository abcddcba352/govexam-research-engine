import dotenv from 'dotenv';
dotenv.config();
import { getRepositoryRegistry } from '../persistence/index.ts';
import { generateMockTestForExam } from '../mockService.ts';

async function main() {
  console.log('=== STARTING LIVE GEMINI MOCK GENERATION ===');
  console.log('Target Exam: appsc_group_2_screening');
  console.log('Blueprint: bp_appsc_g2_5q_paper1');
  console.log('AI Provider:', process.env.AI_PROVIDER || 'gemini');
  console.log('Gemini API Key:', process.env.GEMINI_API_KEY ? 'Present (AQ...)' : 'MISSING');

  const startTime = Date.now();
  const mock = await generateMockTestForExam({
    exam_id: 'appsc_group_2_screening',
    blueprint_id: 'bp_appsc_g2_5q_paper1',
    desiredQuestionCount: 5,
    difficulty: 'Standard',
    preparation_mode: 'PRE_NOTIFICATION_PREPARATION'
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎉 Mock Generated in ${durationSec}s!`);
  console.log(`Mock ID: ${mock.mock_id}`);
  console.log(`Title: ${mock.title}`);
  console.log(`Total Questions: ${mock.total_questions}`);
  console.log(`Total Marks: ${mock.total_marks}`);
  console.log(`Duration: ${mock.duration_minutes} minutes`);

  const questions = mock.sections.flatMap(s => s.questions);
  console.log(`\n--- QUESTIONS (${questions.length}) ---`);
  questions.forEach(q => {
    console.log(`\nQ${q.question_number} [${q.section_name}] | Topic: ${q.topic} | Difficulty: ${q.difficulty} | Cognitive: ${q.cognitive_level}`);
    console.log(`Provenance: ${q.generation_provenance} | Model: ${q.generation_model_id}`);
    console.log(`Stem: ${q.question_text}`);
    q.options.forEach((opt, idx) => {
      const isCorrect = idx === q.correct_option_index ? ' [CORRECT]' : '';
      console.log(`  ${String.fromCharCode(65 + idx)}. ${opt}${isCorrect}`);
    });
    console.log(`Explanation: ${q.explanation}`);
    console.log(`Source Reference: ${q.source_reference}`);
  });

  console.log('\n--- PERSISTING TO SUPABASE DATABASE ---');
  const reg = getRepositoryRegistry();
  await reg.mocks.saveMock(mock);
  console.log('✅ Mock saved to database successfully!');

  // Verify retrieval from Supabase
  const retrieved = await reg.mocks.getMockById(mock.mock_id);
  console.log('✅ Retrieved from Supabase:', retrieved?.mock_id, 'Title:', retrieved?.title, 'Questions count:', retrieved?.sections.flatMap(s => s.questions).length);
}

main().catch(err => {
  console.error('❌ Generation Error:', err);
  process.exit(1);
});

