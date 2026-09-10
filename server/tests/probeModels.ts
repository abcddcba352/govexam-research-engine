import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

import { getThinkingConfig } from '../geminiConfig.ts';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found');
    process.exit(1);
  }
  const ai = new GoogleGenAI({ apiKey });

  console.log('Testing gemini-3.1-flash-lite with 5-slot batch...');
  const prompt = `Generate 5 multiple choice questions for Telangana Group-II exam in strict JSON array format:
[
  {
    "question_number": 1,
    "slot_id": "slot_1",
    "section_name": "General Studies",
    "question_text": "Sample stem",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_option_index": 0,
    "explanation": "Authoritative explanation",
    "topic": "Indian Polity",
    "difficulty": "MEDIUM",
    "source_reference": "Constitution of India"
  }
]`;
  const res = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: getThinkingConfig('MEDIUM'),
    }
  });
  console.log('gemini-3.1-flash-lite 5-slot result length:', res.text?.length);
  const parsed = JSON.parse(res.text || '[]');
  console.log('Parsed count:', parsed.length, 'Sample Q1 stem:', parsed[0]?.question_text);
}

main().catch(console.error);
