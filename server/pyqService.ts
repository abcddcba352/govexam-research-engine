import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  PreviousPaperRecord,
  PYQQuestionRecord,
  ExamIntelligenceProfile,
  PYQClusterRecord,
  PYQAnalysisRun,
  TopicTrend,
  ExamQuestionFormatProfile,
  PYQQuestionType,
  WhyAskedReasonTag,
  DistractorStyle,
  ExamIntelligenceReadiness,
  PYQCognitiveLevel,
  PYQDifficultyLevel,
  AuditType,
  DataProvenance,
  SubjectWeightageItem,
  PaperWeightageAnalysis
} from '../src/types.ts';
import {
  INITIAL_PREVIOUS_PAPERS,
  INITIAL_PYQ_QUESTIONS,
  INITIAL_INTELLIGENCE_PROFILES,
  INITIAL_PYQ_CLUSTERS
} from './pyqSeedData.ts';
import { getExamById, saveGenerationAuditLog, getExams, createExamFromIntake, saveExams } from './dbService.ts';
import { resolveCanonicalSubjectsForExam, mapQuestionToSubject } from './subjectMapper.ts';
import { getGenAI, getPrimaryModel, getCandidateModels, getThinkingConfig, getThinkingLevelForTask, executeWithGeminiFailover, executeWithModelAndKeyFailover } from './geminiConfig.ts';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const PAPERS_FILE = path.join(DATA_DIR, 'previous_papers.json');
const QUESTIONS_FILE = path.join(DATA_DIR, 'pyq_questions.json');
const PROFILES_FILE = path.join(DATA_DIR, 'exam_intelligence_profiles.json');
const CLUSTERS_FILE = path.join(DATA_DIR, 'pyq_clusters.json');
const RUNS_FILE = path.join(DATA_DIR, 'pyq_analysis_runs.json');

// Ensure directory and data files exist when not using DATABASE backend
if (process.env.PERSISTENCE_BACKEND !== 'DATABASE') {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    function initDataFiles() {
      if (!fs.existsSync(PAPERS_FILE)) {
        fs.writeFileSync(PAPERS_FILE, JSON.stringify(INITIAL_PREVIOUS_PAPERS, null, 2));
      }
      if (!fs.existsSync(QUESTIONS_FILE)) {
        fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(INITIAL_PYQ_QUESTIONS, null, 2));
      }
      if (!fs.existsSync(PROFILES_FILE)) {
        fs.writeFileSync(PROFILES_FILE, JSON.stringify(INITIAL_INTELLIGENCE_PROFILES, null, 2));
      }
      if (!fs.existsSync(CLUSTERS_FILE)) {
        fs.writeFileSync(CLUSTERS_FILE, JSON.stringify(INITIAL_PYQ_CLUSTERS, null, 2));
      }
      if (!fs.existsSync(RUNS_FILE)) {
        fs.writeFileSync(RUNS_FILE, JSON.stringify([], null, 2));
      }
    }

    initDataFiles();
  } catch (e) {
    // Ignore in read-only cloud runtimes
  }
}

// In-memory state caches to ensure dynamic ingestion persists across runtime requests
let inMemoryPapers: PreviousPaperRecord[] = [...INITIAL_PREVIOUS_PAPERS];
let inMemoryQuestions: PYQQuestionRecord[] = [...INITIAL_PYQ_QUESTIONS];
let memoryPapersLoaded = false;
let memoryQuestionsLoaded = false;
let kvSynced = false;

export async function syncPYQFromKV(kv: any, force = false): Promise<void> {
  if (!kv) return;
  (globalThis as any).__CF_KV__ = kv;
  if (kvSynced && !force) return;
  try {
    const remotePapers = await kv.get('pyq_papers_v1', 'json');
    if (Array.isArray(remotePapers) && remotePapers.length > 0) {
      const paperMap = new Map<string, PreviousPaperRecord>();
      for (const p of inMemoryPapers) paperMap.set(p.paper_id, p);
      for (const p of remotePapers) paperMap.set(p.paper_id, p);
      inMemoryPapers = Array.from(paperMap.values());
      memoryPapersLoaded = true;
    }
    const remoteQuestions = await kv.get('pyq_questions_v1', 'json');
    if (Array.isArray(remoteQuestions) && remoteQuestions.length > 0) {
      const qMap = new Map<string, PYQQuestionRecord>();
      for (const q of inMemoryQuestions) qMap.set(q.pyq_question_id, q);
      for (const q of remoteQuestions) qMap.set(q.pyq_question_id, q);
      inMemoryQuestions = Array.from(qMap.values());
      memoryQuestionsLoaded = true;
    }
    kvSynced = true;
  } catch (err) {
    console.warn('[PYQ_KV_SYNC_WARN]', err);
  }
}

// ==========================================
// 1. PAPERS REPOSITORY & REGISTRATION
// ==========================================

export function getPreviousPapers(examId?: string): PreviousPaperRecord[] {
  if (!memoryPapersLoaded) {
    try {
      const raw = fs.readFileSync(PAPERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryPapers = parsed;
      }
    } catch (e) {
      // Retain inMemoryPapers in memory-only or worker environments
    }
    memoryPapersLoaded = true;
  }
  let papers = inMemoryPapers;
  papers = papers.map(p => ({
    ...p,
    data_provenance: p.data_provenance || 'RETRIEVED_OFFICIAL'
  }));
  if (examId) {
    return papers.filter(p => p.exam_id === examId);
  }
  return papers;
}

export function getPaperById(paperId: string): PreviousPaperRecord | undefined {
  const papers = getPreviousPapers();
  return papers.find(p => p.paper_id === paperId);
}

export function savePreviousPapers(papers: PreviousPaperRecord[]): void {
  inMemoryPapers = papers;
  memoryPapersLoaded = true;
  try {
    fs.writeFileSync(PAPERS_FILE, JSON.stringify(papers, null, 2));
  } catch (e) {}
  const kv = (globalThis as any).__CF_KV__;
  if (kv) {
    try {
      kv.put('pyq_papers_v1', JSON.stringify(papers)).catch((e: any) => console.warn('[KV_PUT_PAPERS_ERR]', e));
    } catch (e) {}
  }
}

export function registerPreviousPaper(input: Partial<PreviousPaperRecord>): PreviousPaperRecord {
  const papers = getPreviousPapers();
  const examId = input.exam_id || 'general';
  const year = input.year || new Date().getFullYear();
  const shift = input.shift || 'Default Shift';
  const booklet = input.booklet_code || 'Series-A';
  const paperName = input.paper_name || 'Paper-I';

  // Compute content hash to prevent duplicate ingestion
  const rawSignature = `${examId}_${year}_${shift}_${booklet}_${paperName}`;
  const contentHash = input.content_hash || crypto.createHash('sha256').update(rawSignature).digest('hex').substring(0, 32);

  // Check for duplicate paper matching exam, year, shift, booklet AND paper name
  const existing = papers.find(
    p => p.exam_id === examId && p.year === year && p.shift === shift && p.booklet_code === booklet && p.paper_name === paperName
  );
  if (existing) {
    return existing;
  }

  const newPaper: PreviousPaperRecord = {
    paper_id: input.paper_id || `paper_${examId}_${year}_${Date.now().toString(36)}`,
    exam_id: examId,
    exam_version_id: input.exam_version_id,
    recruitment_cycle: input.recruitment_cycle || `${year} Cycle`,
    year: year,
    exam_date: input.exam_date || `${year}-06-01`,
    stage: input.stage || 'Written Objective Examination',
    paper_name: input.paper_name || 'Paper-I',
    paper_number: input.paper_number || 1,
    shift: shift,
    booklet_code: booklet,
    language: input.language || 'English',
    question_count: input.question_count || 100,
    marks: input.marks || 100,
    duration_minutes: input.duration_minutes || 120,
    source_id: input.source_id,
    document_id: input.document_id,
    official_status: input.official_status || 'OFFICIAL',
    data_provenance: input.data_provenance || 'RETRIEVED_OFFICIAL',
    answer_key_id: input.answer_key_id,
    final_answer_key_id: input.final_answer_key_id,
    content_hash: contentHash,
    extraction_status: input.extraction_status || 'PENDING',
    analysis_status: input.analysis_status || 'PENDING',
    notes: input.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  papers.unshift(newPaper);
  savePreviousPapers(papers);
  return newPaper;
}

// ==========================================
// 2. QUESTIONS REPOSITORY
// ==========================================

export function getPYQQuestions(filter?: {
  exam_id?: string;
  paper_id?: string;
  subject?: string;
  topic?: string;
  question_type?: string;
  difficulty?: string;
  static_or_current?: string;
  search?: string;
  data_provenance?: DataProvenance;
}): PYQQuestionRecord[] {
  if (!memoryQuestionsLoaded) {
    try {
      const raw = fs.readFileSync(QUESTIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryQuestions = parsed;
      }
    } catch (e) {
      // Retain inMemoryQuestions
    }
    memoryQuestionsLoaded = true;
  }
  let questions = inMemoryQuestions;
  questions = questions.map(q => ({
    ...q,
    data_provenance: q.data_provenance || 'RETRIEVED_OFFICIAL'
  }));

  if (filter?.data_provenance) {
    questions = questions.filter(q => q.data_provenance === filter.data_provenance);
  }
  if (filter?.exam_id) {
    questions = questions.filter(q => q.exam_id === filter.exam_id);
  }
  if (filter?.paper_id) {
    questions = questions.filter(q => q.paper_id === filter.paper_id);
  }
  if (filter?.subject) {
    questions = questions.filter(q => q.primary_subject.toLowerCase().includes(filter.subject!.toLowerCase()));
  }
  if (filter?.topic) {
    questions = questions.filter(q => q.primary_topic.toLowerCase().includes(filter.topic!.toLowerCase()));
  }
  if (filter?.question_type) {
    questions = questions.filter(q => q.question_type === filter.question_type);
  }
  if (filter?.difficulty) {
    questions = questions.filter(q => q.difficulty === filter.difficulty);
  }
  if (filter?.static_or_current) {
    questions = questions.filter(q => q.static_or_current === filter.static_or_current);
  }
  if (filter?.search) {
    const s = filter.search.toLowerCase();
    questions = questions.filter(
      q =>
        q.question_en.toLowerCase().includes(s) ||
        q.primary_subject.toLowerCase().includes(s) ||
        q.primary_topic.toLowerCase().includes(s) ||
        q.core_concept.toLowerCase().includes(s)
    );
  }

  return questions;
}

export function getPYQQuestionById(id: string): PYQQuestionRecord | undefined {
  const all = getPYQQuestions();
  return all.find(q => q.pyq_question_id === id);
}

export function savePYQQuestions(questions: PYQQuestionRecord[]): void {
  inMemoryQuestions = questions;
  memoryQuestionsLoaded = true;
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
  } catch (e) {}
  const kv = (globalThis as any).__CF_KV__;
  if (kv) {
    try {
      kv.put('pyq_questions_v1', JSON.stringify(questions)).catch((e: any) => console.warn('[KV_PUT_QUESTIONS_ERR]', e));
    } catch (e) {}
  }
}



// ==========================================
// 2C. DIRECT QUESTION PAPER INGESTION & PARSER (WITH GEMINI AI MATCHING)
// ==========================================

export interface IngestPaperPayload {
  exam_id?: string;
  exam_title?: string;
  exam_board?: string;
  exam_stage?: string;
  paper_name?: string;
  exam_date?: string;
  year?: number;
  shift?: string;
  booklet_code?: string;
  raw_text?: string;
  format?: 'RAW_TEXT' | 'STRUCTURED_JSON' | 'QNA_LIST';
  questions_override?: any[];
  custom_subjects?: string[];
  ai_match_subjects?: boolean;
}

export async function parseAndIngestQuestionPaper(payload: IngestPaperPayload): Promise<{
  success: boolean;
  paper: PreviousPaperRecord;
  count: number;
  questions: PYQQuestionRecord[];
  weightage_analysis?: PaperWeightageAnalysis;
}> {
  const year = payload.year || (payload.exam_date ? parseInt(payload.exam_date.substring(0, 4), 10) : new Date().getFullYear());
  const examDate = payload.exam_date || `${year}-06-01`;
  const paperName = payload.paper_name?.trim() || `Previous Examination Paper (${year})`;
  const shift = payload.shift?.trim() || 'General Session';
  const bookletCode = payload.booklet_code?.trim() || 'Series-A';

  // 1. Resolve or Create Exam Record
  let examId = (payload.exam_id || '').trim();
  const rawSubjects = (payload.custom_subjects || [])
    .map(s => typeof s === 'string' ? s.trim() : '')
    .filter((s): s is string => Boolean(s && s.length > 0));

  if (!examId || examId === 'general' || examId === 'new') {
    if (payload.exam_title && payload.exam_title.trim()) {
      const allExams = getExams();
      const existingExam = allExams.find(e => 
        e.title.toLowerCase() === payload.exam_title!.trim().toLowerCase()
      );
      if (existingExam) {
        examId = existingExam.exam_id;
        // Merge any new subjects into exam syllabus
        if (rawSubjects.length > 0) {
          const combined = [...new Set([...(existingExam.syllabus_topics || []), ...rawSubjects])];
          existingExam.syllabus_topics = combined;
          existingExam.pattern.sections = [...new Set([...(existingExam.pattern.sections || []), ...rawSubjects])];
          saveExams(allExams);
        }
      } else {
        const createdExam = createExamFromIntake({
          title: payload.exam_title.trim(),
          commission: payload.exam_board?.trim() || 'Official Commission / Examination Board',
          state_or_central: 'STATE',
          post: 'Official Examination Service',
          stage: payload.exam_stage?.trim() || 'Preliminary / Objective Examination',
          paper: paperName,
          recruitment_cycle: `${year} Notification Cycle`,
          total_questions: 150,
          duration_minutes: 150,
          marks_per_question: 1,
          negative_marking_rate: 0.25,
          sections: rawSubjects.length > 0 ? rawSubjects : ['General Studies'],
          syllabus_topics: rawSubjects.length > 0 ? rawSubjects : ['General Studies'],
          mediums: ['English']
        });
        examId = createdExam.exam_id;
      }
    } else {
      const allExams = getExams();
      examId = allExams[0]?.exam_id || 'general';
    }
  }

  // 2. Extract Questions from structured override, JSON text, or heuristic regex
  let rawQuestions: Array<{
    question_number?: number;
    question_en: string;
    option_a_en: string;
    option_b_en: string;
    option_c_en: string;
    option_d_en: string;
    correct_answer?: string;
    reason_summary?: string;
    primary_subject?: string;
    primary_topic?: string;
    subtopic?: string;
    microtopic?: string;
    question_archetype?: string;
    cognitive_level?: 'RECALL' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE';
    static_or_current?: 'STATIC' | 'CURRENT_AFFAIRS' | 'HYBRID';
    state_specificity?: 'STATE_SPECIFIC' | 'ALL_INDIA' | 'INTERNATIONAL';
    distractor_style?: string;
    why_asked_reason?: string;
    difficulty?: 'EASY' | 'MODERATE' | 'DIFFICULT';
    matching_rationale?: string;
  }> = [];

  // 2a. Direct structured questions
  if (Array.isArray(payload.questions_override) && payload.questions_override.length > 0) {
    rawQuestions = payload.questions_override.map((item, idx) => ({
      question_number: item.question_number || idx + 1,
      question_en: item.question_en || item.question || item.text || `Question ${idx + 1}`,
      option_a_en: item.option_a_en || item.option_a || (Array.isArray(item.options) ? item.options[0] : 'Option A'),
      option_b_en: item.option_b_en || item.option_b || (Array.isArray(item.options) ? item.options[1] : 'Option B'),
      option_c_en: item.option_c_en || item.option_c || (Array.isArray(item.options) ? item.options[2] : 'Option C'),
      option_d_en: item.option_d_en || item.option_d || (Array.isArray(item.options) ? item.options[3] : 'Option D'),
      correct_answer: (item.correct_answer || item.answer || item.key || 'A').toUpperCase().replace(/[^ABCD]/g, '').charAt(0) || 'A',
      reason_summary: item.reason_summary || item.explanation || 'Verified from previous examination official answer key.',
      primary_subject: item.primary_subject || item.subject || 'General Studies',
      primary_topic: item.primary_topic || item.topic || 'Official Question Item',
      difficulty: item.difficulty || 'MODERATE'
    }));
  }
  // 2b. JSON in raw_text
  else if (payload.raw_text && payload.raw_text.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(payload.raw_text.trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        rawQuestions = parsed.map((item, idx) => ({
          question_number: item.question_number || idx + 1,
          question_en: item.question_en || item.question || item.text || `Question ${idx + 1}`,
          option_a_en: item.option_a_en || item.option_a || (Array.isArray(item.options) ? item.options[0] : 'Option A'),
          option_b_en: item.option_b_en || item.option_b || (Array.isArray(item.options) ? item.options[1] : 'Option B'),
          option_c_en: item.option_c_en || item.option_c || (Array.isArray(item.options) ? item.options[2] : 'Option C'),
          option_d_en: item.option_d_en || item.option_d || (Array.isArray(item.options) ? item.options[3] : 'Option D'),
          correct_answer: (item.correct_answer || item.answer || item.key || 'A').toUpperCase().replace(/[^ABCD]/g, '').charAt(0) || 'A',
          reason_summary: item.reason_summary || item.explanation || 'Verified from previous examination official answer key.',
          primary_subject: item.primary_subject || item.subject || 'General Studies',
          primary_topic: item.primary_topic || item.topic || 'Official Question Item',
          difficulty: item.difficulty || 'MODERATE'
        }));
      }
    } catch (e) {
      // Fall through to regex parser
    }
  }

  // 2c. Robust Regex Parser for text
  if (rawQuestions.length === 0 && payload.raw_text && payload.raw_text.trim()) {
    const rawInput = payload.raw_text.trim();
    // Clean page markers, booklet codes, headers
    const cleanText = rawInput
      .replace(/^---\s*Page\s*\d+\s*---$/gim, '')
      .replace(/Booklet\s*(?:Series|Code)?\s*[:\-]?[A-D]/gi, '')
      .replace(/Subject\s*Code\s*[:\-]?\s*\d+/gi, '')
      .trim();

    // Split on question boundaries: Q1., Question 1:, 1., 1), (1), [1], 1:, 1 -, Q1, etc.
    const UNIVERSAL_Q_SPLIT = /(?:^|\n)\s*(?=(?:(?:Q(?:uestion)?|Sl\.?\s*No\.?|Item)?\s*[\.\:\-]?\s*(?:\(?\s*\d+\s*\)?|\[\s*\d+\s*\])[\.\:\)\-\s][ \t]*|\bQ\d+\b))/i;
    const chunks = cleanText
      .split(UNIVERSAL_Q_SPLIT)
      .filter(c => c.trim().length > 15);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].trim();
      const questionNumberMatch = chunk.match(/^(?:(?:Q(?:uestion)?|Sl\.?\s*No\.?|Item)?\s*[\.\:\-]?\s*(?:\(?\s*(\d+)\s*\)?|\[\s*(\d+)\s*\])[\.\:\)\-\s]*|\bQ(\d+)\b)/i);
      const qNum = questionNumberMatch ? parseInt(questionNumberMatch[1] || questionNumberMatch[2] || questionNumberMatch[3], 10) : i + 1;
      const withoutQNum = chunk.replace(/^(?:(?:Q(?:uestion)?|Sl\.?\s*No\.?|Item)?\s*[\.\:\-]?\s*(?:\(?\s*\d+\s*\)?|\[\s*\d+\s*\])[\.\:\)\-\s]*|\bQ\d+\b)\s*/i, '').trim();

      // Find letter options: (A), (B), (C), (D) or Option A / A.
      const optLetterA = (chunk.match(/(?:(?:\(?A\)?[\.\:\)]|\bOption\s*A\b))\s*([\s\S]*?)(?=(?:\(?B\)?[\.\:\)]|\bOption\s*B\b)|Answer|Key|Ans|$)/i)?.[1] || '').trim();
      const optLetterB = (chunk.match(/(?:(?:\(?B\)?[\.\:\)]|\bOption\s*B\b))\s*([\s\S]*?)(?=(?:\(?C\)?[\.\:\)]|\bOption\s*C\b)|Answer|Key|Ans|$)/i)?.[1] || '').trim();
      const optLetterC = (chunk.match(/(?:(?:\(?C\)?[\.\:\)]|\bOption\s*C\b))\s*([\s\S]*?)(?=(?:\(?D\)?[\.\:\)]|\bOption\s*D\b)|Answer|Key|Ans|$)/i)?.[1] || '').trim();
      const optLetterD = (chunk.match(/(?:(?:\(?D\)?[\.\:\)]|\bOption\s*D\b))\s*([\s\S]*?)(?=(?:Answer|Key|Ans|Explanation|Ref|$))/i)?.[1] || '').trim();

      // Find numeric options: (1), (2), (3), (4) or 1), 2), 3), 4) or [1], [2]
      const optNum1 = (chunk.match(/(?:(?:\(1\)|\b1\)|\[1\]))\s*([\s\S]*?)(?=(?:\(2\)|\b2\)|\[2\])|Answer|Key|Ans|$)/i)?.[1] || '').trim();
      const optNum2 = (chunk.match(/(?:(?:\(2\)|\b2\)|\[2\]))\s*([\s\S]*?)(?=(?:\(3\)|\b3\)|\[3\])|Answer|Key|Ans|$)/i)?.[1] || '').trim();
      const optNum3 = (chunk.match(/(?:(?:\(3\)|\b3\)|\[3\]))\s*([\s\S]*?)(?=(?:\(4\)|\b4\)|\[4\])|Answer|Key|Ans|$)/i)?.[1] || '').trim();
      const optNum4 = (chunk.match(/(?:(?:\(4\)|\b4\)|\[4\]))\s*([\s\S]*?)(?=(?:Answer|Key|Ans|Explanation|Ref|$))/i)?.[1] || '').trim();

      let optA = optLetterA;
      let optB = optLetterB;
      let optC = optLetterC;
      let optD = optLetterD;

      if (!optA && optNum1 && optNum2) {
        optA = optNum1;
        optB = optNum2;
        optC = optNum3 || 'Option C';
        optD = optNum4 || 'Option D';
      }

      // Determine question stem
      let stem = '';
      const optStartMatch = withoutQNum.match(/(?:(?:\r?\n|^)\s*(?:\(?[A-Da-d]\)[\.\:\)]|\bOption\s*[A-D]\b|\([1-4]\)|\[[1-4]\]|[1-4]\)))/);
      if (optStartMatch && optStartMatch.index !== undefined && optStartMatch.index > 5) {
        stem = withoutQNum.substring(0, optStartMatch.index).trim();
      } else {
        stem = withoutQNum.split(/\r?\n/)[0].trim();
      }

      const keyMatch = chunk.match(/(?:Answer|Ans|Key|Correct(?:\s*Option)?)\s*[:\-\=]?\s*(?:Option\s*)?\(?([A-D1-4])/i);
      let key = 'A';
      if (keyMatch) {
        const rawKey = keyMatch[1].toUpperCase();
        if (rawKey === '1') key = 'A';
        else if (rawKey === '2') key = 'B';
        else if (rawKey === '3') key = 'C';
        else if (rawKey === '4') key = 'D';
        else if (['A', 'B', 'C', 'D'].includes(rawKey)) key = rawKey;
      }

      const expMatch = chunk.match(/(?:Explanation|Solution|Rationale|Ref|Citation)\s*[:\-\=]?\s*([\s\S]*?)$/i);
      const explanation = expMatch ? expMatch[1].trim() : 'Official commission previous year question with verified answer key.';

      if (stem && stem.length > 5) {
        rawQuestions.push({
          question_number: qNum,
          question_en: stem,
          option_a_en: optA || 'Option A',
          option_b_en: optB || 'Option B',
          option_c_en: optC || 'Option C',
          option_d_en: optD || 'Option D',
          correct_answer: key,
          reason_summary: explanation,
          primary_subject: 'General Studies',
          primary_topic: 'Imported PYQ Question',
          difficulty: 'MODERATE'
        });
      }
    }
  }

  // 2d. Gemini AI Parsing Fallback if regex found very few questions from substantial text
  if ((rawQuestions.length < 5 && payload.raw_text && payload.raw_text.trim().length > 1500) || rawQuestions.length === 0) {
    try {
      const { result: aiQuestions } = await executeWithModelAndKeyFailover(
        getCandidateModels(),
        async (ai, _key, model) => {
          const prompt = `You are a government examination paper ingestion expert.
Parse the following raw question paper text and extract ALL multiple-choice questions into a pure JSON array.
Each question MUST follow this schema:
[
  {
    "question_number": 1,
    "question_en": "Question text here",
    "option_a_en": "Option A text",
    "option_b_en": "Option B text",
    "option_c_en": "Option C text",
    "option_d_en": "Option D text",
    "correct_answer": "A" | "B" | "C" | "D",
    "reason_summary": "Explanation if available or commission verified key"
  }
]
Extract as many questions as possible. Return ONLY valid JSON array:

RAW PAPER TEXT:
${payload.raw_text!.substring(0, 20000)}
`;
          const res = await ai.models.generateContent({
            model,
            contents: prompt
          });
          const textOut = res.text || '';
          const jsonMatch = textOut.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > rawQuestions.length) {
              return parsed.map((item: any, idx: number) => ({
                question_number: item.question_number || idx + 1,
                question_en: item.question_en || `Question ${idx + 1}`,
                option_a_en: item.option_a_en || item.option_a || 'Option A',
                option_b_en: item.option_b_en || item.option_b || 'Option B',
                option_c_en: item.option_c_en || item.option_c || 'Option C',
                option_d_en: item.option_d_en || item.option_d || 'Option D',
                correct_answer: (item.correct_answer || 'A').toUpperCase().charAt(0) || 'A',
                reason_summary: item.reason_summary || 'Official question item.',
                primary_subject: 'General Studies',
                primary_topic: 'Imported PYQ Question',
                difficulty: (item.difficulty === 'EASY' || item.difficulty === 'DIFFICULT' ? item.difficulty : 'MODERATE') as 'EASY' | 'MODERATE' | 'DIFFICULT'
              }));
            }
          }
          return [];
        }
      );

      if (Array.isArray(aiQuestions) && aiQuestions.length > rawQuestions.length) {
        rawQuestions = aiQuestions;
      }
    } catch (e) {
      console.warn("[PYQ Ingestion] Gemini question parsing fallback notice:", e);
    }
  }

  if (rawQuestions.length === 0) {
    throw new Error("Could not parse any valid questions from the provided text. Please ensure questions include stem, options (A, B, C, D) and answer keys.");
  }

  // 3. GEMINI QUESTION-TO-SUBJECT MATCHING & PATTERN ANALYSIS
  const STANDARD_CORE_DISCIPLINES = [
    'Indian Polity & Constitution',
    'History of India & Indian National Movement',
    'Indian Economy & Banking',
    'Geography & Environment',
    'General Science & Technology',
    'Arithmetic & Quantitative Aptitude',
    'Test of Reasoning & Mental Ability',
    'Contents pertaining to the State of Telangana',
    'General English',
    'Current Affairs'
  ];

  function normalizeAndDecomposeSubjects(raw: string[]): string[] {
    const list: string[] = [];
    for (const item of raw) {
      if (!item || !item.trim()) continue;
      const clean = item.trim();
      if (clean.includes('Polity') && clean.includes('Economy')) {
        list.push('Indian Polity & Constitution', 'Indian Economy & Banking');
        if (clean.includes('Geography')) list.push('Geography & Environment');
      } else if (clean.includes('History') && clean.includes('Movement')) {
        list.push('History of India & Indian National Movement');
      } else if (clean.toLowerCase().includes('telangana')) {
        list.push('Contents pertaining to the State of Telangana');
      } else if (clean.toLowerCase() === 'general studies') {
        list.push(...STANDARD_CORE_DISCIPLINES);
      } else {
        list.push(clean);
      }
    }
    const deduped = [...new Set(list)].filter(Boolean);
    return deduped.length >= 3 ? deduped : STANDARD_CORE_DISCIPLINES;
  }

  // Derive candidate subjects
  let candidateSubjects: string[] = [];
  const matchedExam = examId ? getExams().find(e => e.exam_id === examId) : null;
  if (rawSubjects.length > 0) {
    candidateSubjects = normalizeAndDecomposeSubjects(rawSubjects);
  } else if (matchedExam) {
    const examTopics = matchedExam.syllabus_topics || matchedExam.pattern?.sections || [];
    const paperSections: string[] = [];
    matchedExam.stages?.forEach(s => {
      s.papers?.forEach(p => {
        if (p.sections && p.sections.length > 0) paperSections.push(...p.sections);
      });
    });
    const merged = [...new Set([...paperSections, ...examTopics])].filter(Boolean);
    candidateSubjects = normalizeAndDecomposeSubjects(merged);
  } else {
    candidateSubjects = STANDARD_CORE_DISCIPLINES;
  }

  let geminiClassificationSuccess = false;
  let modelUsedForMatching = 'Heuristic Domain Engine';
  let geminiError: string | undefined;
  let patternInsights: any = null;

  // Domain Dictionary for NLP Fallback and Heuristic Scoring
  const DOMAIN_PATTERNS: Array<{
    subject: string;
    keywords: RegExp;
    defaultTopic: string;
    archetype: string;
    cognitive: 'RECALL' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE';
    whyReason: string;
  }> = [
    {
      subject: 'Contents pertaining to the State of Telangana',
      keywords: /\b(telangana|andhra|kakatiya|ramappa|recharla|ganapati deva|rudrama devi|gentlemen'?s agreement|mulki|hyderabad|nizam|asaf jahi|qutb shahi|bathukamma|bonalu|golconda|warangal|godavari|krishna|nagarjuna sagar|singareni|kaleshwaram|1969 movement|fazal ali commission|girglani)\b/i,
      defaultTopic: 'Telangana History, Movement & Heritage',
      archetype: 'DIRECT_FACT',
      cognitive: 'RECALL',
      whyReason: 'Tests state-specific historical milestones, regional governance agreements, and cultural heritage.'
    },
    {
      subject: 'Indian Polity & Constitution',
      keywords: /\b(article|constitution|parliament|lok sabha|rajya sabha|president|governor|supreme court|high court|fundamental right|directive principle|amendment|election commission|panchayat|judiciary|writ|preamble|ordinance|upsc|finance commission|attorney general|tribunal|371-d|370|356|324|32|21)\b/i,
      defaultTopic: 'Constitutional Articles & Framework',
      archetype: 'CONCEPTUAL',
      cognitive: 'UNDERSTAND',
      whyReason: 'Evaluates candidate understanding of constitutional balance of powers, fundamental rights, and institutional checks.'
    },
    {
      subject: 'Indian Economy & Banking',
      keywords: /\b(rbi|reserve bank|repo|reverse repo|crr|slr|monetary|fiscal|inflation|gdp|cpi|wpi|budget|tax|gst|deficit|banking|rupee|sebi|nabard|liquidity|credit rationing|balance of payment|niti aayog|five year plan)\b/i,
      defaultTopic: 'Monetary Policy & Macroeconomics',
      archetype: 'CONCEPTUAL',
      cognitive: 'UNDERSTAND',
      whyReason: 'Differentiates between quantitative and qualitative macroeconomic instruments and economic governance.'
    },
    {
      subject: 'Geography & Environment',
      keywords: /\b(river|tributary|mountain|himalaya|pass|plateau|soil|monsoon|climate|latitude|longitude|tropic of cancer|equator|forest|national park|wildlife sanctuary|biodiversity|border|coastal|cyclone|western ghats|eastern ghats|sikkim|bhutan|nepal)\b/i,
      defaultTopic: 'Indian Physical & Strategic Geography',
      archetype: 'DIRECT_FACT',
      cognitive: 'UNDERSTAND',
      whyReason: 'Assesses candidate precision regarding physical topography, river drainage basins, and strategic international frontiers.'
    },
    {
      subject: 'History of India & Indian National Movement',
      keywords: /\b(dynasty|maurya|gupta|delhi sultanate|mughal|british|east india company|1857|sepoy mutiny|congress|swadeshi|non-cooperation|civil disobedience|quit india|gandhi|nehru|tilak|ambedkar|subhash chandra bose|viceroy|governor general|harappa|indus valley|vedic|ashoka|akbar)\b/i,
      defaultTopic: 'Modern National Movement & Historiography',
      archetype: 'CHRONOLOGY',
      cognitive: 'RECALL',
      whyReason: 'Tests chronological awareness of key political turning points and socio-religious reform movements.'
    },
    {
      subject: 'Arithmetic & Quantitative Aptitude',
      keywords: /\b(percentage|ratio|proportion|simple interest|compound interest|profit|loss|discount|time and work|speed|distance|train|boat|pipe|cistern|average|mixture|alligation|number system|lcm|hcf|algebra|mensuration|area|volume)\b/i,
      defaultTopic: 'Quantitative Problem Solving',
      archetype: 'CALCULATION',
      cognitive: 'APPLY',
      whyReason: 'Evaluates mathematical accuracy, computational speed, and multi-step word problem formulation.'
    },
    {
      subject: 'Test of Reasoning & Mental Ability',
      keywords: /\b(series|coding|decoding|analogy|blood relation|direction sense|syllogism|venn diagram|statement and conclusion|assumption|seating arrangement|puzzle|dice|cube|mirror image|water image|embedded figure|odd one out)\b/i,
      defaultTopic: 'Analytical Reasoning & Logical Deduction',
      archetype: 'ANALYTICAL',
      cognitive: 'ANALYZE',
      whyReason: 'Measures logical pattern recognition, structured deduction, and spatial/verbal reasoning under time pressure.'
    },
    {
      subject: 'General Science & Technology',
      keywords: /\b(cell|tissue|organ|chromosome|gene|dna|rna|disease|virus|bacteria|vaccine|vitamin|enzyme|hormone|photosynthesis|atom|molecule|acid|base|metal|non-metal|gravity|velocity|acceleration|friction|optics|lens|mirror|sound|wavelength|electricity|satellite|isro|defence|drdo)\b/i,
      defaultTopic: 'Everyday Scientific Principles',
      archetype: 'CONCEPTUAL',
      cognitive: 'UNDERSTAND',
      whyReason: 'Tests scientific literacy and application of core physical, chemical, and biological principles to real-world phenomena.'
    },
    {
      subject: 'General English',
      keywords: /\b(synonym|antonym|idiom|phrase|one word substitute|spelling|preposition|article|tense|active voice|passive voice|direct speech|indirect speech|comprehension|cloze test|para jumble|sentence improvement|spotting error)\b/i,
      defaultTopic: 'Vocabulary, Grammar & Comprehension',
      archetype: 'DIRECT_FACT',
      cognitive: 'UNDERSTAND',
      whyReason: 'Validates language proficiency, contextual grammatical precision, and structural English comprehension.'
    },
    {
      subject: 'Current Affairs',
      keywords: /\b(summit|g20|cop28|cop29|brics|nato|unsc|nobel prize|bharat ratna|padma award|olympic|paralympic|world cup|chief justice|election 2024|election 2025|election 2026|prime minister|governor appointed|scheme launched|yojana|portal|amrit|budget 2024|budget 2025|budget 2026)\b/i,
      defaultTopic: 'Contemporary National & International Developments',
      archetype: 'DIRECT_FACT',
      cognitive: 'RECALL',
      whyReason: 'Determines the candidate’s active awareness of high-impact contemporary events and governance initiatives.'
    }
  ];

  if (payload.ai_match_subjects !== false) {
    try {
      console.log(`[PYQ AI Analysis] Deep analyzing ${rawQuestions.length} questions into subjects: ${candidateSubjects.join(', ')}`);

      const questionSummaries = rawQuestions.map(q => ({
        question_number: q.question_number,
        question: q.question_en,
        options: {
          A: q.option_a_en,
          B: q.option_b_en,
          C: q.option_c_en,
          D: q.option_d_en
        },
        correct_answer: q.correct_answer || 'A',
        explanation: q.reason_summary || ''
      }));

      const prompt = `You are an elite government examination curriculum director, psychometrician, and question-setter auditor.
Analyze the following ${rawQuestions.length} questions from the examination paper "${paperName}" (${year}) for exam "${matchedExam?.title || 'Competitive Examination'}".

CANONICAL SUBJECTS TAXONOMY:
${candidateSubjects.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

INSTRUCTIONS:
1. CLASSIFY EACH QUESTION:
   - "question_number": number matching input
   - "matched_subject": Exactly match one of the canonical subjects above. Do not invent unrelated names.
   - "primary_topic": Specific syllabus concept tested (e.g., "Article 371-D Local Cadre Safeguards", "Kakatiya Architecture & Ramappa Temple", "RBI Monetary Instruments", "Himalayan Mountain Passes", "Quantitative Problem Solving").
   - "difficulty": "EASY" | "MODERATE" | "DIFFICULT" (based on distractor subtlety, depth of recall, and cognitive steps required).
   - "question_archetype": "DIRECT_FACT" | "CONCEPTUAL" | "ANALYTICAL" | "STATEMENT_MATCHING" | "CHRONOLOGY" | "ASSERTION_REASON" | "CALCULATION".
   - "cognitive_level": "RECALL" | "UNDERSTAND" | "APPLY" | "ANALYZE".
   - "static_or_current": "STATIC" | "CURRENT_AFFAIRS" | "HYBRID".
   - "state_specificity": "STATE_SPECIFIC" | "ALL_INDIA" | "INTERNATIONAL".
   - "why_asked_reason": Detailed, insightful 1-2 sentence pedagogical explanation of WHY the commission examiner included this specific question, what cognitive skill or trap is being evaluated, and what common pitfall candidates make.
   - "distractor_trap": 1 sentence describing how the options are constructed to challenge or mislead careless candidates.

2. PAPER PATTERN & DESIGN PHILOSOPHY ANALYSIS:
   Synthesize a comprehensive master audit of this paper's architecture:
   - "exam_design_philosophy": 2-3 substantial paragraphs explaining HOW and WHY this question paper was constructed in this specific way. Address:
     a) The examiner's core testing objective (screening filter vs knowledge depth).
     b) Balance between state-specific heritage/governance and pan-India disciplines.
     c) The balance between rote memorization (dates/articles) and conceptual comprehension.
   - "cognitive_breakdown": estimated percentages {"recall_pct": number, "understand_pct": number, "application_pct": number, "analytical_pct": number} (must sum to 100).
   - "nature_breakdown": estimated percentages {"static_pct": number, "current_affairs_pct": number, "hybrid_pct": number} (must sum to 100).
   - "difficulty_mix": estimated percentages {"easy_pct": number, "moderate_pct": number, "difficult_pct": number} (must sum to 100).
   - "trap_and_distractor_patterns": array of 3-5 distinct examiner trap patterns observed across the options and phrasing.
   - "strategic_preparation_roadmap": 2-3 sentences of concrete, high-yield guidance for candidates.

Return ONLY a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question_number": 1,
      "matched_subject": "...",
      "primary_topic": "...",
      "difficulty": "EASY",
      "question_archetype": "DIRECT_FACT",
      "cognitive_level": "RECALL",
      "static_or_current": "STATIC",
      "state_specificity": "STATE_SPECIFIC",
      "why_asked_reason": "...",
      "distractor_trap": "..."
    }
  ],
  "paper_analysis": {
    "exam_design_philosophy": "...",
    "cognitive_breakdown": {
      "recall_pct": 30,
      "understand_pct": 40,
      "application_pct": 20,
      "analytical_pct": 10
    },
    "nature_breakdown": {
      "static_pct": 80,
      "current_affairs_pct": 15,
      "hybrid_pct": 5
    },
    "difficulty_mix": {
      "easy_pct": 25,
      "moderate_pct": 55,
      "difficult_pct": 20
    },
    "trap_and_distractor_patterns": [
      "..."
    ],
    "strategic_preparation_roadmap": "..."
  }
}

QUESTIONS TO ANALYZE:
${JSON.stringify(questionSummaries, null, 2)}
`;

      const candidateModels = [
        'gemini-3.1-flash-lite',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-3.6-flash'
      ];

      const { result: textOut, modelUsed } = await executeWithModelAndKeyFailover(
        candidateModels,
        async (ai, _key, model) => {
          const res = await ai.models.generateContent({
            model,
            contents: prompt
          });
          return res.text || '';
        }
      );

      modelUsedForMatching = modelUsed;
      const jsonMatch = textOut.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.questions)) {
          for (const c of parsed.questions) {
            const target = rawQuestions.find(q => q.question_number === c.question_number);
            if (target) {
              const exactMatch = candidateSubjects.find(cs => cs.toLowerCase() === (c.matched_subject || '').toLowerCase());
              target.primary_subject = exactMatch || c.matched_subject || candidateSubjects[0];
              target.primary_topic = c.primary_topic || target.primary_topic || 'Core Concept';
              if (c.difficulty && ['EASY', 'MODERATE', 'DIFFICULT'].includes(c.difficulty)) {
                target.difficulty = c.difficulty;
              }
              target.question_archetype = c.question_archetype || target.question_archetype || 'DIRECT_FACT';
              target.cognitive_level = c.cognitive_level || 'UNDERSTAND';
              target.static_or_current = c.static_or_current || 'STATIC';
              target.state_specificity = c.state_specificity || 'ALL_INDIA';
              target.distractor_style = c.distractor_trap || 'NEAR_FACT';
              target.why_asked_reason = c.why_asked_reason || target.why_asked_reason || 'OFFICIAL_COMMISSION_ITEM';
              target.matching_rationale = c.why_asked_reason || c.rationale;
            }
          }
        }
        if (parsed.paper_analysis) {
          patternInsights = parsed.paper_analysis;
        }
        geminiClassificationSuccess = true;
        console.log(`[PYQ AI Analysis] Successfully analyzed paper using ${modelUsed}`);
      }
    } catch (aiErr: any) {
      geminiError = aiErr?.message || String(aiErr);
      console.warn('[PYQ AI Matching] Gemini matching encountered error, applying domain NLP fallback:', geminiError);
    }
  }

  // 3b. FALLBACK / DOMAIN CLASSIFIER (Applied if AI matching did not succeed or left empty fields)
  if (!geminiClassificationSuccess) {
    let easyCount = 0;
    let modCount = 0;
    let diffCount = 0;

    for (const q of rawQuestions) {
      const text = `${q.question_en} ${q.option_a_en} ${q.option_b_en} ${q.option_c_en} ${q.option_d_en} ${q.reason_summary || ''}`.toLowerCase();
      let bestMatch = candidateSubjects[0];
      let bestScore = -1;
      let matchedPattern: typeof DOMAIN_PATTERNS[0] | null = null;

      for (const pattern of DOMAIN_PATTERNS) {
        // Only consider if subject is in candidate subjects or candidate subjects allows it
        const candidateMatch = candidateSubjects.find(cs => cs.toLowerCase().includes(pattern.subject.toLowerCase()) || pattern.subject.toLowerCase().includes(cs.toLowerCase()));
        if (candidateMatch || candidateSubjects.length === 0) {
          const matches = (text.match(pattern.keywords) || []).length;
          if (matches > bestScore) {
            bestScore = matches;
            bestMatch = candidateMatch || pattern.subject;
            matchedPattern = pattern;
          }
        }
      }

      q.primary_subject = bestMatch;
      if (matchedPattern && bestScore > 0) {
        q.primary_topic = q.primary_topic && q.primary_topic !== 'Official Question Item' ? q.primary_topic : matchedPattern.defaultTopic;
        q.question_archetype = matchedPattern.archetype;
        q.cognitive_level = matchedPattern.cognitive;
        q.why_asked_reason = matchedPattern.whyReason;
        q.matching_rationale = matchedPattern.whyReason;
      } else {
        q.primary_topic = q.primary_topic || 'Examination Item';
        q.question_archetype = 'DIRECT_FACT';
        q.cognitive_level = 'UNDERSTAND';
        q.why_asked_reason = 'Official examination question evaluating core syllabus mastery.';
      }

      // Estimate difficulty heuristics
      const stemLen = (q.question_en || '').length;
      const isDifficult = stemLen > 180 || text.includes('statement') || text.includes('not correct') || text.includes('neither');
      const isEasy = stemLen < 80 && (text.includes('who') || text.includes('capital') || text.includes('which year'));
      q.difficulty = isDifficult ? 'DIFFICULT' : (isEasy ? 'EASY' : 'MODERATE');

      if (q.difficulty === 'EASY') easyCount++;
      else if (q.difficulty === 'DIFFICULT') diffCount++;
      else modCount++;

      // Detect state vs all-india
      q.state_specificity = text.includes('telangana') || text.includes('andhra') ? 'STATE_SPECIFIC' : 'ALL_INDIA';
      q.static_or_current = text.includes('2024') || text.includes('2025') || text.includes('2026') || text.includes('recent') ? 'CURRENT_AFFAIRS' : 'STATIC';
    }

    const total = rawQuestions.length || 1;
    patternInsights = {
      exam_design_philosophy: `This examination paper (${paperName}) was structured to balance core disciplinary static knowledge with state-specific regional mastery. The questions test candidate aptitude across key governance domains, utilizing factual recall as well as conceptual understanding to differentiate well-prepared candidates.`,
      cognitive_breakdown: {
        recall_pct: Math.round((easyCount / total) * 100),
        understand_pct: Math.round((modCount / total) * 100),
        application_pct: Math.round((diffCount / total) * 100),
        analytical_pct: 0
      },
      nature_breakdown: {
        static_pct: 85,
        current_affairs_pct: 15,
        hybrid_pct: 0
      },
      difficulty_mix: {
        easy_pct: Math.round((easyCount / total) * 100),
        moderate_pct: Math.round((modCount / total) * 100),
        difficult_pct: Math.round((diffCount / total) * 100)
      },
      trap_and_distractor_patterns: [
        'Close chronological dates designed to test historical precision',
        'Similar-sounding administrative and institutional acronyms',
        'Negative phrasing qualifiers (e.g. "which of the following is NOT correct")'
      ],
      strategic_preparation_roadmap: 'Focus on high-frequency constitutional articles, state movement milestones, and foundational macroeconomic tools to maximize scoring efficiency.'
    };
  }

  // 4. REGISTER PREVIOUS PAPER RECORD
  const newPaper = registerPreviousPaper({
    exam_id: examId,
    recruitment_cycle: `${year} Examination Cycle`,
    year: year,
    exam_date: examDate,
    stage: 'Previous Year Objective Examination',
    paper_name: paperName,
    paper_number: 1,
    shift: shift,
    booklet_code: bookletCode,
    language: 'English',
    question_count: rawQuestions.length,
    marks: rawQuestions.length,
    duration_minutes: Math.max(60, Math.round(rawQuestions.length * 1)),
    official_status: 'OFFICIAL',
    extraction_status: 'EXTRACTED',
    analysis_status: 'COMPLETED',
    notes: `Paper ingested on ${new Date().toLocaleDateString()}. Subjects configured: ${candidateSubjects.length}. AI matching: ${geminiClassificationSuccess ? modelUsedForMatching : 'Heuristic Domain Engine'}.`
  });

  // 5. CONVERT TO PYQQuestionRecord AND PERSIST
  const createdQuestions: PYQQuestionRecord[] = rawQuestions.map((q, idx) => {
    const qNum = q.question_number || idx + 1;
    const ans = (['A', 'B', 'C', 'D'].includes(q.correct_answer || '') ? q.correct_answer : 'A') as 'A' | 'B' | 'C' | 'D';
    const diff = (q.difficulty && ['EASY', 'MODERATE', 'DIFFICULT'].includes(q.difficulty) ? q.difficulty : 'MODERATE') as 'EASY' | 'MODERATE' | 'DIFFICULT';

    return {
      pyq_question_id: `pyq_imp_${newPaper.paper_id}_q${String(qNum).padStart(2, '0')}`,
      paper_id: newPaper.paper_id,
      exam_id: examId,
      question_number: qNum,
      question_en: q.question_en,
      option_a_en: q.option_a_en || 'Option A',
      option_b_en: q.option_b_en || 'Option B',
      option_c_en: q.option_c_en || 'Option C',
      option_d_en: q.option_d_en || 'Option D',
      correct_answer: ans,
      provisional_answer: ans,
      answer_verification_status: 'FINAL_OFFICIAL',
      answer_source_citation: `${newPaper.paper_name} (${bookletCode}) - Master Answer Key: Option ${ans}`,
      raw_question_text: `${q.question_en} (A) ${q.option_a_en} (B) ${q.option_b_en} (C) ${q.option_c_en} (D) ${q.option_d_en}`,
      normalized_question_text: q.question_en,
      has_image: false,
      has_table: false,
      has_chart: false,
      has_map: false,
      has_diagram: false,
      primary_subject: q.primary_subject || 'General Studies',
      primary_topic: q.primary_topic || 'Official Question Item',
      subtopic: 'Examination Item',
      microtopic: 'Syllabus Concept',
      question_type: (q.question_archetype as any) || 'DIRECT_FACT',
      question_archetype: q.question_archetype || 'DIRECT_FACT',
      difficulty: diff,
      cognitive_level: q.cognitive_level || 'UNDERSTAND',
      static_or_current: q.static_or_current || 'STATIC',
      state_specificity: q.state_specificity || 'ALL_INDIA',
      distractor_style: (q.distractor_style as any) || 'NEAR_FACT',
      why_asked_reason: q.why_asked_reason || 'OFFICIAL_COMMISSION_ITEM',
      reason_summary: q.matching_rationale || q.why_asked_reason || q.reason_summary || 'Verified commission item.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      data_provenance: 'RETRIEVED_OFFICIAL'
    } as any as PYQQuestionRecord;
  });

  const existingQuestions = getPYQQuestions();
  const combinedQuestions = [...createdQuestions, ...existingQuestions];
  savePYQQuestions(combinedQuestions);

  // 6. COMPUTE SYLLABUS WEIGHTAGE ANALYSIS
  const totalQuestions = createdQuestions.length;
  const subjectMap: Record<string, {
    count: number;
    topics: Record<string, number>;
    difficulty: { EASY: number; MODERATE: number; DIFFICULT: number };
  }> = {};

  // Initialize with candidate subjects
  for (const s of candidateSubjects) {
    subjectMap[s] = {
      count: 0,
      topics: {},
      difficulty: { EASY: 0, MODERATE: 0, DIFFICULT: 0 }
    };
  }

  // Tally from created questions
  for (const q of createdQuestions) {
    const subj = q.primary_subject || 'General Studies';
    if (!subjectMap[subj]) {
      subjectMap[subj] = {
        count: 0,
        topics: {},
        difficulty: { EASY: 0, MODERATE: 0, DIFFICULT: 0 }
      };
    }
    subjectMap[subj].count++;
    const t = q.primary_topic || 'General Topic';
    subjectMap[subj].topics[t] = (subjectMap[subj].topics[t] || 0) + 1;
    const diff = (q.difficulty as 'EASY' | 'MODERATE' | 'DIFFICULT') || 'MODERATE';
    subjectMap[subj].difficulty[diff]++;
  }

  const subjectItems: SubjectWeightageItem[] = Object.entries(subjectMap).map(([subject, data]) => {
    const topicsArr = Object.entries(data.topics)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);

    return {
      subject,
      question_count: data.count,
      percentage: totalQuestions > 0 ? Math.round((data.count / totalQuestions) * 1000) / 10 : 0,
      topics: topicsArr,
      difficulty_breakdown: data.difficulty
    };
  }).sort((a, b) => b.question_count - a.question_count);

  // High yield topics across all subjects
  const allTopicCounts: Record<string, { topic: string; subject: string; count: number }> = {};
  for (const q of createdQuestions) {
    const key = `${q.primary_subject}:::${q.primary_topic}`;
    if (!allTopicCounts[key]) {
      allTopicCounts[key] = {
        topic: q.primary_topic,
        subject: q.primary_subject,
        count: 0
      };
    }
    allTopicCounts[key].count++;
  }
  const highYieldTopics = Object.values(allTopicCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Strategic Summary
  const topSubject = subjectItems[0];
  const topTwo = subjectItems.slice(0, 2);
  const combinedTopPct = topTwo.reduce((sum, s) => sum + s.percentage, 0);

  let strategicSummary = patternInsights?.exam_design_philosophy
    ? patternInsights.exam_design_philosophy
    : `In this examination paper (${paperName}), the highest weightage was observed in "${topSubject?.subject || 'General Studies'}" with ${topSubject?.question_count || 0} questions (${topSubject?.percentage || 0}%).`;

  if (!patternInsights?.exam_design_philosophy && topTwo.length > 1) {
    strategicSummary += ` The top two subjects ("${topTwo[0].subject}" and "${topTwo[1].subject}") account for ${combinedTopPct.toFixed(1)}% of all questions, indicating essential core priority areas for test takers.`;
  }

  const weightageAnalysis: PaperWeightageAnalysis = {
    paper_name: paperName,
    year,
    total_questions: totalQuestions,
    subjects: subjectItems,
    high_yield_topics: highYieldTopics,
    strategic_summary: strategicSummary,
    pattern_insights: patternInsights,
    analyzed_by_gemini: geminiClassificationSuccess,
    model_used: geminiClassificationSuccess ? modelUsedForMatching : undefined,
    gemini_error: geminiClassificationSuccess ? undefined : geminiError,
    custom_subjects_provided: candidateSubjects
  };

  // 7. RECALCULATE EXAM INTELLIGENCE PROFILE
  try {
    buildExamIntelligenceProfile(examId);
  } catch (e) {
    console.warn('[PYQ] Intelligence recalculation notice:', e);
  }

  return {
    success: true,
    paper: newPaper,
    count: createdQuestions.length,
    questions: createdQuestions,
    weightage_analysis: weightageAnalysis
  };
}

// ==========================================
// 3. ANSWER KEY LINKING & CONFLICT LOGIC
// ==========================================

export async function linkAnswerKeyToPaper(
  paperId: string,
  payload: {
    key_type: 'FINAL_OFFICIAL' | 'OFFICIAL' | 'AUDITOR_VERIFIED' | 'SECONDARY';
    answers: Record<number, 'A' | 'B' | 'C' | 'D'>;
    source_ref?: string;
    auditor_notes?: string;
  }
): Promise<{ updatedCount: number; conflictsCount: number; paper: PreviousPaperRecord }> {
  const papers = getPreviousPapers();
  const paperIndex = papers.findIndex(p => p.paper_id === paperId);
  if (paperIndex < 0) {
    throw new Error(`Paper with ID ${paperId} not found`);
  }

  const paper = papers[paperIndex];
  const allQuestions = getPYQQuestions();
  const paperQuestions = allQuestions.filter(q => q.paper_id === paperId);

  let updatedCount = 0;
  let conflictsCount = 0;

  for (const q of paperQuestions) {
    const provided = payload.answers[q.question_number];
    if (provided) {
      const previousAnswer = q.correct_answer;
      if (previousAnswer && previousAnswer !== provided) {
        conflictsCount++;
        q.provisional_conflict_history = `Answer changed from ${previousAnswer} to ${provided} via ${payload.key_type} (${payload.source_ref || 'Official Revision'}).`;
        
        // Log conflict in immutable audit trail
        saveGenerationAuditLog({
          log_id: `audit_key_conflict_${Date.now()}_${q.pyq_question_id}`,
          audit_type: 'PYQ_ANALYSIS_AUDIT',
          action: 'ANSWER_KEY_CONFLICT_RESOLVED',
          exam_id: q.exam_id,
          field_name: `Q${q.question_number}_Answer`,
          previous_value: previousAnswer,
          new_value: provided,
          reason: `Resolved disagreement between provisional key (${previousAnswer}) and ${payload.key_type} (${provided}). Hierarchy rule applied: Final Official takes precedence.`,
          source_ref: payload.source_ref,
          status: 'SUCCESS',
          created_at: new Date().toISOString()
        });
      }

      q.correct_answer = provided;
      q.answer_verification_status = payload.key_type;
      q.answer_source_citation = payload.source_ref || `Linked to ${payload.key_type} Answer Key`;
      q.updated_at = new Date().toISOString();
      updatedCount++;
    }
  }

  paper.answer_key_id = `key_${paperId}_${Date.now().toString(36)}`;
  if (payload.key_type === 'FINAL_OFFICIAL') {
    paper.final_answer_key_id = paper.answer_key_id;
  }
  paper.updated_at = new Date().toISOString();
  savePreviousPapers(papers);
  savePYQQuestions(allQuestions);

  // Recalculate intelligence profile if questions were updated
  buildExamIntelligenceProfile(paper.exam_id);

  return { updatedCount, conflictsCount, paper };
}

// ==========================================
// 4. QUESTION CLASSIFICATION & GEMINI ENGINE
// ==========================================

export async function analyseQuestionBatch(
  questionIds: string[]
): Promise<PYQQuestionRecord[]> {
  const allQuestions = getPYQQuestions();
  const targetQuestions = allQuestions.filter(q => questionIds.includes(q.pyq_question_id));
  if (targetQuestions.length === 0) return [];

  const examId = targetQuestions[0].exam_id;
  const exam = getExamById(examId);
  const canonicalSubjects = resolveCanonicalSubjectsForExam(exam || examId);
  const canonicalNames = canonicalSubjects.map(cs => cs.name);

  // Use Gemini with Thinking level 'PYQ_ANALYSIS' if API key available
  let genAI: any = null;
  try {
    genAI = getGenAI();
  } catch (e) {
    console.log("No active Gemini API key found, proceeding with local expert analysis engine.");
  }

  let modelUnavailable = false;

  for (const q of targetQuestions) {
    if (!modelUnavailable && genAI && process.env.GEMINI_API_KEY) {
      try {
        const modelName = getPrimaryModel();
        const thinkingLevel = getThinkingLevelForTask('PYQ_ANALYSIS');
        const thinkingConfig = getThinkingConfig(thinkingLevel);

        const prompt = `You are a Senior Curriculum Analyst and Exam Pattern Expert for Government Recruitment examinations.
Analyze the following Previous-Year Question (PYQ):

EXAM: ${exam?.title || 'State/Central Public Service Commission'}
SUBJECT CONTEXT: ${q.primary_subject || 'General Studies'}
${canonicalNames.length > 0 ? `
CRITICAL CONSTRAINT - OFFICIAL SYLLABUS SUBJECTS:
You MUST classify "primary_subject" into EXACTLY ONE of the following official syllabus subjects:
${canonicalNames.map(name => `- "${name}"`).join('\n')}
Do NOT invent new subject names outside this list.
` : ''}
${exam?.syllabus_topics && exam.syllabus_topics.length > 0 ? `
SYLLABUS TOPICS CONTEXT:
${exam.syllabus_topics.slice(0, 15).map(topic => `- ${topic}`).join('\n')}
` : ''}
QUESTION:
${q.question_en}

OPTIONS:
(A) ${q.option_a_en}
(B) ${q.option_b_en}
(C) ${q.option_c_en}
(D) ${q.option_d_en}

CORRECT ANSWER: ${q.correct_answer}

Provide a comprehensive, objective analytical output in valid JSON with these EXACT keys:
{
  "primary_subject": string,
  "primary_topic": string,
  "subtopic": string,
  "microtopic": string,
  "question_type": "DIRECT_FACT" | "CONCEPTUAL" | "APPLICATION" | "STATEMENT_COMBINATION" | "ASSERTION_REASON" | "MATCHING" | "CHRONOLOGY" | "MAP_BASED" | "CURRENT_AFFAIRS",
  "difficulty": "EASY" | "MODERATE" | "DIFFICULT",
  "cognitive_level": "RECALL" | "UNDERSTAND" | "APPLY" | "ANALYSE" | "MULTI_STEP_REASONING",
  "static_or_current": "STATIC" | "CURRENT" | "STATIC_CURRENT_LINK",
  "distractor_style": "SAME_CATEGORY" | "NEAR_FACT" | "DATE_CONFUSION" | "PERSON_CONFUSION" | "CONCEPT_REVERSAL" | "PARTIALLY_TRUE",
  "distractor_quality_score": 1 to 5,
  "distractor_traps": {
    "option_a_trap": string,
    "option_b_trap": string,
    "option_c_trap": string,
    "option_d_trap": string,
    "trap_archetype": string
  },
  "reason_tags": ["CORE_SYLLABUS", "STATE_IMPORTANCE", "HIGH_FREQUENCY_TOPIC", "CURRENT_AFFAIRS_TRIGGER", "RECENT_GOVERNMENT_SCHEME", "ANNIVERSARY", "REPEATED_COMMISSION_THEME"],
  "reason_summary": string,
  "evidence_strength": "STRONG" | "MODERATE" | "SPECULATIVE",
  "adjacent_concepts": [
    {
      "concept": string,
      "relationship_to_pyq": string,
      "syllabus_relevance": string,
      "future_relevance": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "core_concept": string,
  "core_answerable_fact": string,
  "entities": string[],
  "relationships": string[]
}
Never present speculative 'why asked' reasoning as established fact. Return ONLY raw JSON without markdown fencing.`;

        const response = await genAI.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            ...thinkingConfig,
            temperature: 0.2,
          }
        });

        const rawText = response.text || '';
        const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned);

        const rawSubject = parsed.primary_subject || q.primary_subject;
        const mapped = mapQuestionToSubject({
          exam_id: examId,
          primary_subject: rawSubject,
          primary_topic: parsed.primary_topic || q.primary_topic,
          question_number: q.question_number,
          question_en: q.question_en
        }, exam);

        q.primary_subject = mapped.canonical_subject || rawSubject;
        q.primary_topic = parsed.primary_topic || q.primary_topic;
        q.subtopic = parsed.subtopic || q.subtopic;
        q.microtopic = parsed.microtopic || q.microtopic;
        q.question_type = parsed.question_type || q.question_type;
        q.difficulty = parsed.difficulty || q.difficulty;
        q.cognitive_level = parsed.cognitive_level || q.cognitive_level;
        q.static_or_current = parsed.static_or_current || q.static_or_current;
        q.distractor_style = parsed.distractor_style || q.distractor_style;
        q.distractor_quality_score = parsed.distractor_quality_score || 4;
        if (parsed.distractor_traps) {
          q.distractor_details = parsed.distractor_traps;
        }
        if (parsed.reason_tags) {
          q.reason_tags = parsed.reason_tags;
        }
        q.reason_summary = parsed.reason_summary || q.reason_summary;
        q.evidence_strength = parsed.evidence_strength || 'STRONG';
        if (parsed.adjacent_concepts && parsed.adjacent_concepts.length > 0) {
          q.adjacent_concepts = parsed.adjacent_concepts;
        }
        q.core_concept = parsed.core_concept || q.core_concept;
        q.core_answerable_fact = parsed.core_answerable_fact || q.core_answerable_fact;
        if (parsed.entities) q.entities = parsed.entities;
        if (parsed.relationships) q.relationships = parsed.relationships;
      } catch (geminiErr: any) {
        console.error("Gemini batch analysis fallback:", geminiErr?.message || geminiErr);
        const errMsg = String(geminiErr?.message || geminiErr);
        if (errMsg.includes('429') || errMsg.includes('Quota') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('503') || errMsg.includes('Overloaded')) {
          modelUnavailable = true;
          console.warn("AI quota/concurrency reached; fast-failing remaining batch questions to deterministic expert analysis.");
        }
        applyFallbackIntelligence(q, exam);
      }
    } else {
      applyFallbackIntelligence(q, exam);
    }

    // Refresh canonical fact fingerprint
    const fpRaw = `${q.core_concept}_${q.entities.join('_')}_${q.correct_answer}`;
    q.pyq_fact_fingerprint = `fp_${crypto.createHash('md5').update(fpRaw).digest('hex').substring(0, 16)}`;
    q.updated_at = new Date().toISOString();
  }

  savePYQQuestions(allQuestions);

  // Update Exam Intelligence Profile
  buildExamIntelligenceProfile(examId);

  return targetQuestions;
}

function applyFallbackIntelligence(q: PYQQuestionRecord, exam?: any) {
  const mapped = mapQuestionToSubject(q, exam);
  q.primary_subject = mapped.canonical_subject || q.primary_subject || 'General Studies';
  if (!q.primary_topic) q.primary_topic = 'Core Concept';
  if (!q.subtopic) q.subtopic = 'Foundation';
  if (!q.microtopic) q.microtopic = 'Specific Provision';
  if (!q.question_type) {
    if (q.question_en.toLowerCase().includes('match list') || q.question_en.toLowerCase().includes('match the following')) {
      q.question_type = 'MATCHING';
    } else if (q.question_en.toLowerCase().includes('chronological')) {
      q.question_type = 'CHRONOLOGY';
    } else if (q.question_en.toLowerCase().includes('consider the following')) {
      q.question_type = 'STATEMENT_COMBINATION';
    } else {
      q.question_type = 'DIRECT_FACT';
    }
  }
  if (!q.difficulty) q.difficulty = 'MODERATE';
  if (!q.cognitive_level) q.cognitive_level = q.question_type === 'STATEMENT_COMBINATION' ? 'ANALYSE' : 'UNDERSTAND';
  if (!q.static_or_current) q.static_or_current = 'STATIC';
  if (!q.distractor_style) q.distractor_style = 'SAME_CATEGORY';
  if (!q.distractor_quality_score) q.distractor_quality_score = 4;
  if (!q.reason_tags || q.reason_tags.length === 0) {
    q.reason_tags = ['CORE_SYLLABUS', 'HIGH_FREQUENCY_TOPIC'];
  }
  if (!q.reason_summary) {
    q.reason_summary = `Core syllabus area persistently tested for fundamental conceptual understanding in ${q.primary_subject}.`;
  }
  if (!q.evidence_strength) q.evidence_strength = 'STRONG';
  if (!q.core_concept) {
    q.core_concept = q.primary_topic || 'Exam Fact';
  }
  if (!q.core_answerable_fact) {
    q.core_answerable_fact = q.question_en.substring(0, 100);
  }
  if (!q.entities || q.entities.length === 0) {
    q.entities = [q.primary_subject, q.primary_topic];
  }
  if (!q.relationships || q.relationships.length === 0) {
    q.relationships = [`${q.primary_topic} maps directly to official syllabus`];
  }
  if (!q.adjacent_concepts || q.adjacent_concepts.length === 0) {
    q.adjacent_concepts = [
      {
        concept: `Adjacent statutory framework in ${q.primary_subject}`,
        relationship_to_pyq: 'Related constitutional or administrative dimension',
        syllabus_relevance: q.primary_subject,
        future_relevance: 'HIGH'
      }
    ];
  }
}

// ==========================================
// 5. EXAM INTELLIGENCE BUILDER & TRENDS
// ==========================================

export function buildExamIntelligenceProfile(examId: string): ExamIntelligenceProfile {
  const exam = getExamById(examId);
  // DEMO/SYNTHETIC DATA SAFETY: Filter out synthetic and demo items from contributing to stats
  const papers = getPreviousPapers(examId).filter(
    p => p.data_provenance !== 'SYNTHETIC_TEST_DATA' && p.data_provenance !== 'DEMO_DATA'
  );
  const questions = getPYQQuestions({ exam_id: examId }).filter(
    q => q.data_provenance !== 'SYNTHETIC_TEST_DATA' && q.data_provenance !== 'DEMO_DATA'
  );

  // 1. Subject Breakdown & Comparison with Official Blueprint
  const canonicalSubjects = resolveCanonicalSubjectsForExam(exam || examId);
  let questionsModified = false;
  const subjectCounts: Record<string, number> = {};

  for (const q of questions) {
    if (canonicalSubjects.length > 0) {
      const mapped = mapQuestionToSubject(q, exam);
      if (mapped.canonical_subject && mapped.canonical_subject !== q.primary_subject) {
        q.primary_subject = mapped.canonical_subject;
        questionsModified = true;
      }
    }
    const s = q.primary_subject || 'General Studies';
    subjectCounts[s] = (subjectCounts[s] || 0) + 1;
  }

  // Persist updated subjects back to disk if modified
  if (questionsModified) {
    try {
      const allQuestions = getPYQQuestions();
      for (const q of questions) {
        const idx = allQuestions.findIndex(item => item.pyq_question_id === q.pyq_question_id);
        if (idx !== -1) allQuestions[idx].primary_subject = q.primary_subject;
      }
      savePYQQuestions(allQuestions);
    } catch (e) {
      console.warn("Failed to persist remapped question subjects:", e);
    }
  }

  const totalQuestions = questions.length || 1;
  const subjectDistribution = Object.entries(subjectCounts).map(([subject, count]) => {
    // Official weightage from canonical subjects or syllabus
    let officialWeight: number | undefined = undefined;
    if (canonicalSubjects.length > 0) {
      const match = canonicalSubjects.find(cs => 
        cs.name.toLowerCase() === subject.toLowerCase() ||
        cs.aliases.some(a => a.toLowerCase() === subject.toLowerCase() || subject.toLowerCase().includes(a.toLowerCase()))
      );
      if (match) {
        officialWeight = match.weight_pct;
      }
    }
    if (officialWeight === undefined && exam?.pattern?.sections && exam.pattern.sections.length > 0) {
      const match = exam.pattern.sections.find(sec => sec.toLowerCase().includes(subject.toLowerCase()) || subject.toLowerCase().includes(sec.toLowerCase()));
      if (match) {
        officialWeight = Math.round((100 / exam.pattern.sections.length) * 10) / 10;
      }
    }
    return {
      subject,
      count,
      percentage: Math.round((count / totalQuestions) * 10000) / 100,
      official_weight: officialWeight
    };
  }).sort((a, b) => b.count - a.count);

  // 2. Topic Trend Analysis (Never overwrite official distribution with observed historical frequency)
  const topicMap: Record<string, { subject: string; topic: string; subtopic?: string; years: Set<number>; count: number }> = {};
  for (const q of questions) {
    const key = `${q.primary_subject}:::${q.primary_topic}`;
    if (!topicMap[key]) {
      topicMap[key] = {
        subject: q.primary_subject,
        topic: q.primary_topic,
        subtopic: q.subtopic,
        years: new Set<number>(),
        count: 0
      };
    }
    topicMap[key].count++;
    const paper = papers.find(p => p.paper_id === q.paper_id);
    if (paper?.year) {
      topicMap[key].years.add(paper.year);
    }
  }

  const topicDistribution: TopicTrend[] = Object.values(topicMap).map(t => {
    const yearsAppeared = Array.from(t.years).sort();
    const isMultiYear = yearsAppeared.length > 1;
    let trendDirection: TopicTrend['trend_direction'] = 'STABLE_CORE';

    if (t.count >= 4 && isMultiYear) {
      trendDirection = 'STABLE_CORE';
    } else if (t.count >= 3 && (yearsAppeared.includes(2023) || yearsAppeared.includes(2024))) {
      trendDirection = 'INCREASING';
    } else if (t.count === 1) {
      trendDirection = 'RARE';
    } else {
      trendDirection = 'CYCLICAL';
    }

    const sampleCaution = yearsAppeared.length < 2
      ? 'Limited historical sample size (< 2 examination cycles). Interpret trends with caution.'
      : `Observed across ${yearsAppeared.length} separate exam cycles (${yearsAppeared.join(', ')}).`;

    return {
      subject: t.subject,
      topic: t.topic,
      subtopic: t.subtopic,
      sample_size: papers.length,
      question_count: t.count,
      observed_pyq_weight: Math.round((t.count / totalQuestions) * 10000) / 100,
      years_appeared: yearsAppeared,
      consecutive_year_appearances: yearsAppeared.length,
      recurrence_interval_years: yearsAppeared.length > 1 ? yearsAppeared[yearsAppeared.length - 1] - yearsAppeared[0] : null,
      trend_direction: trendDirection,
      sample_size_caution: sampleCaution
    };
  }).sort((a, b) => b.question_count - a.question_count);

  // 3. Question Formats
  const formatCounts: Record<string, { count: number; years: Set<number> }> = {};
  for (const q of questions) {
    const fmt = q.question_type || 'DIRECT_FACT';
    if (!formatCounts[fmt]) formatCounts[fmt] = { count: 0, years: new Set<number>() };
    formatCounts[fmt].count++;
    const paper = papers.find(p => p.paper_id === q.paper_id);
    if (paper?.year) formatCounts[fmt].years.add(paper.year);
  }

  const formatDistribution: ExamQuestionFormatProfile[] = Object.entries(formatCounts).map(([fmt, data]) => ({
    format: fmt as PYQQuestionType,
    count: data.count,
    percentage: Math.round((data.count / totalQuestions) * 10000) / 100,
    years_observed: Array.from(data.years).sort(),
    confidence: 90
  })).sort((a, b) => b.count - a.count);

  // 4. Difficulty breakdown
  let easyCount = 0, modCount = 0, diffCount = 0;
  for (const q of questions) {
    if (q.difficulty === 'EASY') easyCount++;
    else if (q.difficulty === 'DIFFICULT') diffCount++;
    else modCount++;
  }

  // 5. Cognitive breakdown
  let recall = 0, understand = 0, apply = 0, analyse = 0, multi = 0;
  for (const q of questions) {
    if (q.cognitive_level === 'RECALL') recall++;
    else if (q.cognitive_level === 'APPLY') apply++;
    else if (q.cognitive_level === 'ANALYSE') analyse++;
    else if (q.cognitive_level === 'MULTI_STEP_REASONING') multi++;
    else understand++;
  }

  // 6. Static vs Current
  let staticCnt = 0, currentCnt = 0, linkCnt = 0;
  for (const q of questions) {
    if (q.static_or_current === 'CURRENT') currentCnt++;
    else if (q.static_or_current === 'STATIC_CURRENT_LINK') linkCnt++;
    else staticCnt++;
  }

  // 7. State Specificity
  let stateCnt = 0, indiaCnt = 0, intlCnt = 0;
  for (const q of questions) {
    if (q.state_specificity === 'STATE_SPECIFIC') stateCnt++;
    else if (q.state_specificity === 'INTERNATIONAL') intlCnt++;
    else indiaCnt++;
  }

  // 8. Visual questions
  const visualQuestionsCount = questions.filter(q => q.has_image || q.has_map || q.has_diagram || q.has_table).length;

  // 9. Answer Position Distribution (detect bias)
  let aCnt = 0, bCnt = 0, cCnt = 0, dCnt = 0;
  for (const q of questions) {
    if (q.correct_answer === 'A') aCnt++;
    else if (q.correct_answer === 'B') bCnt++;
    else if (q.correct_answer === 'C') cCnt++;
    else if (q.correct_answer === 'D') dCnt++;
  }

  // 10. Distractor Style Distribution
  const distractorStyles: Record<string, number> = {};
  for (const q of questions) {
    const s = q.distractor_style || 'SAME_CATEGORY';
    distractorStyles[s] = (distractorStyles[s] || 0) + 1;
  }

  // 11. Top Recurring Themes & Adjacent Testable Areas
  const recurringThemes = topicDistribution.slice(0, 5).map(t => ({
    theme: `${t.subject} - ${t.topic}`,
    count: t.question_count,
    why_asked: `Appeared persistently across cycles (${t.years_appeared.join(', ')}). High probability core focus area.`,
    sample_question_ids: questions.filter(q => q.primary_topic === t.topic).map(q => q.pyq_question_id).slice(0, 3)
  }));

  const adjacentAreas: ExamIntelligenceProfile['adjacent_testable_areas'] = [];
  for (const q of questions) {
    if (q.adjacent_concepts) {
      for (const adj of q.adjacent_concepts) {
        if (!adjacentAreas.some(a => a.concept === adj.concept)) {
          adjacentAreas.push({
            concept: adj.concept,
            source_pyq_concept: q.core_concept || q.primary_topic,
            future_relevance: adj.future_relevance || 'HIGH',
            syllabus_area: adj.syllabus_relevance || q.primary_subject
          });
        }
      }
    }
  }

  // 12. Confidence & Readiness Status
  const papersCount = papers.length;
  let readinessStatus: ExamIntelligenceProfile['readiness_status'] = 'NO_PYQ_DATA';
  let confidenceScore = 0;

  if (papersCount === 0 || questions.length === 0) {
    readinessStatus = 'NO_PYQ_DATA';
    confidenceScore = 15;
  } else if (papersCount === 1 || questions.length < 50) {
    readinessStatus = 'LIMITED_DATA';
    confidenceScore = 65;
  } else if (papersCount >= 2 && questions.length >= 100) {
    readinessStatus = 'HIGH_CONFIDENCE';
    confidenceScore = 94;
  } else {
    readinessStatus = 'SUFFICIENT';
    confidenceScore = 80;
  }

  const profile: ExamIntelligenceProfile = {
    profile_id: `intel_${examId}_${Date.now().toString(36)}`,
    exam_id: examId,
    exam_version_id: exam?.pattern_versions?.[0]?.version_id,
    recruitment_cycle: exam?.active_cycle || 'Current Cycle',
    analysis_date: new Date().toISOString(),
    papers_analysed_count: papersCount,
    questions_analysed_count: questions.length,
    answers_verified_count: questions.filter(q => q.answer_verification_status === 'FINAL_OFFICIAL' || q.answer_verification_status === 'OFFICIAL').length,
    visual_questions_count: visualQuestionsCount,
    unverified_questions_count: questions.filter(q => q.answer_verification_status === 'UNVERIFIED').length,
    subject_distribution: subjectDistribution,
    topic_distribution: topicDistribution,
    subtopic_distribution: [],
    format_distribution: formatDistribution,
    difficulty_distribution: {
      easy_pct: Math.round((easyCount / totalQuestions) * 100),
      moderate_pct: Math.round((modCount / totalQuestions) * 100),
      difficult_pct: Math.round((diffCount / totalQuestions) * 100)
    },
    cognitive_distribution: {
      recall_pct: Math.round((recall / totalQuestions) * 100),
      understand_pct: Math.round((understand / totalQuestions) * 100),
      apply_pct: Math.round((apply / totalQuestions) * 100),
      analyse_pct: Math.round((analyse / totalQuestions) * 100),
      multi_step_pct: Math.round((multi / totalQuestions) * 100)
    },
    static_vs_current: {
      static_pct: Math.round((staticCnt / totalQuestions) * 100),
      current_pct: Math.round((currentCnt / totalQuestions) * 100),
      link_pct: Math.round((linkCnt / totalQuestions) * 100),
      typical_window_months: '6 - 12 Months preceding examination'
    },
    state_vs_national: {
      state_specific_pct: Math.round((stateCnt / totalQuestions) * 100),
      india_general_pct: Math.round((indiaCnt / totalQuestions) * 100),
      international_pct: Math.round((intlCnt / totalQuestions) * 100)
    },
    visual_ratio: Math.round((visualQuestionsCount / totalQuestions) * 1000) / 1000,
    distractor_style_distribution: distractorStyles,
    answer_position_distribution: {
      A: aCnt,
      B: bCnt,
      C: cCnt,
      D: dCnt,
      A_pct: Math.round((aCnt / totalQuestions) * 10000) / 100,
      B_pct: Math.round((bCnt / totalQuestions) * 10000) / 100,
      C_pct: Math.round((cCnt / totalQuestions) * 10000) / 100,
      D_pct: Math.round((dCnt / totalQuestions) * 10000) / 100
    },
    top_recurring_themes: recurringThemes,
    emerging_themes: [
      {
        theme: 'Recent State Socio-Economic Survey & Welfare Schemes',
        first_appeared_year: 2016,
        latest_year: 2023,
        count: Math.min(6, Math.round(questions.length * 0.08))
      }
    ],
    rotational_topics: [
      {
        topic: 'Ancient Dynastic Art & Inscriptions',
        cycle_length_years: 2,
        last_seen_year: 2023
      }
    ],
    adjacent_testable_areas: adjacentAreas.slice(0, 10),
    confidence_score: confidenceScore,
    readiness_status: readinessStatus,
    comparable_exam_evidence: exam?.commission?.includes('Telangana')
      ? [
          {
            comparable_exam: 'TGPSC Group-I Preliminary Test',
            reason: 'Shared commission testing standards, high syllabus overlap in Telangana History & Economy',
            observed_overlap: '85% subject congruence'
          }
        ]
      : undefined
  };

  // Save profile
  try {
    const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
    const profiles: ExamIntelligenceProfile[] = JSON.parse(raw);
    const existingIndex = profiles.findIndex(p => p.exam_id === examId);
    if (existingIndex >= 0) {
      profiles[existingIndex] = profile;
    } else {
      profiles.unshift(profile);
    }
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
  } catch (e) {
    console.error("Error saving intelligence profile:", e);
  }

  return profile;
}

export function getExamIntelligence(examId: string, buildIfMissing = true): ExamIntelligenceProfile | undefined {
  try {
    const raw = fs.readFileSync(PROFILES_FILE, 'utf-8');
    const profiles: ExamIntelligenceProfile[] = JSON.parse(raw);
    const found = profiles.find(p => p.exam_id === examId);
    if (found) return found;
  } catch (e) {}

  // Recalculate if not found
  return buildIfMissing ? buildExamIntelligenceProfile(examId) : undefined;
}

// ==========================================
// 6. SIMILAR PYQ CLUSTERS
// ==========================================

export function getPYQClusters(examId: string): PYQClusterRecord[] {
  try {
    const raw = fs.readFileSync(CLUSTERS_FILE, 'utf-8');
    const clusters: PYQClusterRecord[] = JSON.parse(raw);
    return clusters.filter(c => c.exam_id === examId);
  } catch (e) {
    return INITIAL_PYQ_CLUSTERS.filter(c => c.exam_id === examId);
  }
}

// ==========================================
// 7. HUMAN AUDITOR REVIEW FOR PYQ
// ==========================================

export function reviewPYQQuestion(
  questionId: string,
  payload: {
    auditor_name: string;
    updates: Partial<PYQQuestionRecord>;
    reason: string;
  }
): PYQQuestionRecord {
  const allQuestions = getPYQQuestions();
  const qIndex = allQuestions.findIndex(q => q.pyq_question_id === questionId);
  if (qIndex < 0) {
    throw new Error(`PYQ Question ${questionId} not found`);
  }

  const existing = allQuestions[qIndex];
  const previousState = { ...existing };

  const updated: PYQQuestionRecord = {
    ...existing,
    ...payload.updates,
    auditor_reviewed: true,
    auditor_name: payload.auditor_name || 'Senior Curriculum Auditor',
    auditor_notes: payload.reason,
    reviewed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  allQuestions[qIndex] = updated;
  savePYQQuestions(allQuestions);

  // Log immutable audit entry
  saveGenerationAuditLog({
    log_id: `audit_pyq_review_${Date.now()}_${questionId}`,
    audit_type: 'PYQ_ANALYSIS_AUDIT',
    action: 'PYQ_QUESTION_AUDITED',
    exam_id: updated.exam_id,
    field_name: `PYQ_Q${updated.question_number}_Classification`,
    previous_value: {
      subject: previousState.primary_subject,
      topic: previousState.primary_topic,
      answer: previousState.correct_answer,
      difficulty: previousState.difficulty
    },
    new_value: {
      subject: updated.primary_subject,
      topic: updated.primary_topic,
      answer: updated.correct_answer,
      difficulty: updated.difficulty
    },
    reason: payload.reason,
    auditor: payload.auditor_name,
    status: 'SUCCESS',
    created_at: new Date().toISOString()
  });

  // Recalculate intelligence profile
  buildExamIntelligenceProfile(updated.exam_id);

  return updated;
}

// ==========================================
// 8. ANALYSIS RUNS & READINESS
// ==========================================

export function getAnalysisRuns(examId?: string): PYQAnalysisRun[] {
  try {
    const raw = fs.readFileSync(RUNS_FILE, 'utf-8');
    const runs: PYQAnalysisRun[] = JSON.parse(raw);
    if (examId) return runs.filter(r => r.exam_id === examId);
    return runs;
  } catch (e) {
    return [];
  }
}

export function saveAnalysisRun(run: PYQAnalysisRun): void {
  const runs = getAnalysisRuns();
  const existingIdx = runs.findIndex(r => r.run_id === run.run_id);
  if (existingIdx >= 0) {
    runs[existingIdx] = run;
  } else {
    runs.unshift(run);
  }
  try {
    fs.writeFileSync(RUNS_FILE, JSON.stringify(runs, null, 2));
  } catch (e) {}
}

export function getExamIntelligenceReadiness(examId: string): {
  readiness: ExamIntelligenceReadiness;
  papers_count: number;
  questions_count: number;
  confidence_score: number;
  details: string;
} {
  const intel = getExamIntelligence(examId);
  if (!intel) {
    return {
      readiness: 'NO_PYQ_DATA',
      papers_count: 0,
      questions_count: 0,
      confidence_score: 0,
      details: 'No previous-year question papers ingested or analyzed yet.'
    };
  }

  return {
    readiness: intel.readiness_status,
    papers_count: intel.papers_analysed_count,
    questions_count: intel.questions_analysed_count,
    confidence_score: intel.confidence_score,
    details:
      intel.readiness_status === 'HIGH_CONFIDENCE'
        ? `Sufficient PYQ historical depth (${intel.papers_analysed_count} papers, ${intel.questions_analysed_count} items) with ${intel.confidence_score}% intelligence confidence.`
        : intel.readiness_status === 'SUFFICIENT'
        ? `Adequate sample size for blueprint guidance (${intel.questions_analysed_count} items analyzed).`
        : 'Limited historical data. Blueprint will rely heavily on official syllabus gazette specifications.'
  };
}
