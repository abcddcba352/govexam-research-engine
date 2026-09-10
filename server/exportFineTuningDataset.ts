import fs from 'fs';
import path from 'path';
import { getPYQQuestions } from './pyqService.ts';

/**
 * Dataset Exporter for Gemini Fine-Tuning (Option 2)
 * Converts all verified PYQ records into Google Gemini JSONL format:
 * {
 *   "contents": [
 *     { "role": "user", "parts": [{ "text": "..." }] },
 *     { "role": "model", "parts": [{ "text": "..." }] }
 *   ]
 * }
 */
export function exportFineTuningDataset(examId?: string): { count: number; outputPath: string } {
  const questions = getPYQQuestions(examId ? { exam_id: examId } : undefined);
  const dataDir = path.join(process.cwd(), 'server', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const outputPath = path.join(dataDir, examId ? `fine_tuning_${examId}.jsonl` : 'gemini_fine_tuning_pyqs.jsonl');
  const lines: string[] = [];

  for (const q of questions) {
    const userPrompt = `You are a Senior Government Examination Question Setter.
Generate an authentic multiple-choice question for:
Subject: ${q.primary_subject || 'General Studies'}
Topic: ${q.primary_topic || 'General'}
Subtopic: ${q.subtopic || 'Foundation'}
Question Type: ${q.question_type || 'DIRECT_FACT'}
Difficulty: ${q.difficulty || 'MODERATE'}
Cognitive Level: ${q.cognitive_level || 'UNDERSTAND'}
Distractor Trap Style: ${q.distractor_style || 'SAME_CATEGORY'}`;

    const modelResponse = JSON.stringify({
      question_text: q.question_en,
      options: [q.option_a_en, q.option_b_en, q.option_c_en, q.option_d_en],
      correct_option_index: q.correct_answer === 'A' ? 0 : q.correct_answer === 'B' ? 1 : q.correct_answer === 'C' ? 2 : 3,
      explanation: q.reason_summary || `Official master key verifies answer ${q.correct_answer}.`,
      core_concept: q.core_concept || q.primary_topic,
      distractor_traps: q.distractor_details || {}
    });

    const jsonlEntry = {
      contents: [
        { role: 'user', parts: [{ text: userPrompt }] },
        { role: 'model', parts: [{ text: modelResponse }] }
      ]
    };

    lines.push(JSON.stringify(jsonlEntry));
  }

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  console.log(`[FINE_TUNING_EXPORTER] Successfully exported ${lines.length} verified PYQs to ${outputPath}`);
  return { count: lines.length, outputPath };
}

// Auto-run if executed directly via CLI
if (process.argv[1]?.endsWith('exportFineTuningDataset.ts')) {
  exportFineTuningDataset();
}
