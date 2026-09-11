/**
 * Subject Auto-Mapper Engine
 * 
 * Maps raw extracted `primary_subject` values from ingested questions
 * to the exam's canonical syllabus subjects using multi-strategy matching:
 *   1. Exact match against canonical subject name
 *   2. Alias match (case-insensitive) 
 *   3. Keyword/fuzzy Jaccard similarity
 *   4. Question number range heuristic (for composite papers)
 *   5. Syllabus topic keyword matching
 */

import { getExamById } from './dbService.ts';
import { getPYQQuestions, savePYQQuestions } from './pyqService.ts';
import { CanonicalSubjectInfo } from '../src/types.ts';

// ---------- Types ----------

export type CanonicalSubject = CanonicalSubjectInfo;

interface MapResult {
  matched: boolean;
  canonical_subject: string;
  match_strategy: 'EXACT' | 'ALIAS' | 'FUZZY' | 'QUESTION_RANGE' | 'SYLLABUS_TOPIC' | 'FALLBACK';
  confidence: number;
}

// ---------- Universal Canonical Subjects Directory ----------
// Fallback definitions for any exam ID encountered in the candidate directory or tests
export const DEFAULT_CANONICAL_SUBJECTS_BY_EXAM_ID: Record<string, CanonicalSubject[]> = {
  appsc_endowment_officer_screening_paper_1: [
    {
      name: 'Part-A: General Studies & Mental Ability',
      marks: 50,
      questions: 50,
      weight_pct: 33.33,
      question_range: [1, 50],
      aliases: ['General Studies', 'GS & MA', 'GA&MA', 'General Studies and Mental Ability', 'General Studies & Mental Ability', 'Part-A', 'Part-A: General Studies & Mental Ability']
    },
    {
      name: 'Part-B: Hindu Philosophy & Temple System',
      marks: 100,
      questions: 100,
      weight_pct: 66.67,
      question_range: [51, 150],
      aliases: ['Hindu Philosophy', 'HP & TS', 'Hindu Philosophy and Temple System', 'Hindu Philosophy & Temple System', 'Temple System', 'Part-B', 'Part-B: Hindu Philosophy & Temple System']
    }
  ],
  appsc_endowment_officer_mains_paper_1: [
    {
      name: 'General Studies & Mental Ability',
      marks: 150,
      questions: 150,
      weight_pct: 100,
      aliases: ['General Studies', 'GS & MA', 'GA&MA', 'General Studies and Mental Ability', 'General Studies & Mental Ability', 'Paper-I']
    }
  ],
  appsc_endowment_officer_mains_paper_2: [
    {
      name: 'Hindu Philosophy & Temple System',
      marks: 150,
      questions: 150,
      weight_pct: 100,
      aliases: ['Hindu Philosophy', 'HP & TS', 'Hindu Philosophy and Temple System', 'Temple System', 'Paper-II', 'Hindu Philosophy & Temple System']
    }
  ],
  appsc_group_2_screening: [
    { name: 'Indian History', marks: 30, questions: 30, weight_pct: 20, question_range: [1, 30], aliases: ['History', 'Ancient History', 'Medieval History', 'Modern History', 'Indian History (Ancient, Medieval, Modern)'] },
    { name: 'Geography', marks: 30, questions: 30, weight_pct: 20, question_range: [31, 60], aliases: ['General Geography', 'Physical Geography', 'AP Geography', 'Indian Geography', 'Geography (General, Physical, India, AP)'] },
    { name: 'Indian Society', marks: 30, questions: 30, weight_pct: 20, question_range: [61, 90], aliases: ['Society', 'Social Issues', 'Welfare Mechanisms', 'Indian Society (Structure, Social Issues, Welfare)'] },
    { name: 'Current Affairs', marks: 30, questions: 30, weight_pct: 20, question_range: [91, 120], aliases: ['Current Events', 'Science & Technology Current Affairs', 'Sports', 'Current Affairs (Major Events, Science, Sports)'] },
    { name: 'Mental Ability', marks: 30, questions: 30, weight_pct: 20, question_range: [121, 150], aliases: ['Reasoning', 'Logical Reasoning', 'Data Interpretation', 'Mental Ability (Logical, Data Interpretation)'] }
  ],
  tgpsc_group_2_paper_1: [
    {
      name: 'General Studies & General Abilities',
      marks: 150,
      questions: 150,
      weight_pct: 100,
      aliases: ['General Studies', 'GS', 'General Abilities', 'Paper-I', 'General Studies & General Abilities']
    }
  ],
  tgpsc_aee_civil_paper_1: [
    {
      name: 'General Studies & General Abilities',
      marks: 150,
      questions: 150,
      weight_pct: 100,
      aliases: ['General Studies', 'GS', 'Paper-I', 'General Studies & General Abilities', 'General Abilities']
    }
  ],
  tslprb_police_constable_pwt: [
    { name: 'Arithmetic & Reasoning', marks: 50, questions: 50, weight_pct: 25, question_range: [1, 50], aliases: ['Arithmetic', 'Test of Reasoning / Mental Ability', 'Mental Ability', 'Maths', 'Quantitative Aptitude', 'Arithmetic & Reasoning'] },
    { name: 'General Science', marks: 30, questions: 30, weight_pct: 15, question_range: [51, 80], aliases: ['Science', 'General Science', 'Physics', 'Chemistry', 'Biology'] },
    { name: 'History of India & National Movement', marks: 40, questions: 40, weight_pct: 20, question_range: [81, 120], aliases: ['History', 'Indian History', 'History of India, Indian culture, Indian National Movement', 'Indian Culture'] },
    { name: 'Geography, Polity & Economy', marks: 30, questions: 30, weight_pct: 15, question_range: [121, 150], aliases: ['Geography', 'Polity', 'Economy', 'Indian Geography, Polity and Economy'] },
    { name: 'Telangana & Current Affairs', marks: 50, questions: 50, weight_pct: 25, question_range: [151, 200], aliases: ['Current Affairs', 'Current events of national and international importance', 'Contents pertaining to the State of Telangana', 'Telangana State', 'English'] }
  ],
  exam_telangana_police_constable_sct_p_mtv5bnpq: [
    { name: 'Arithmetic & Reasoning', marks: 50, questions: 50, weight_pct: 25, question_range: [1, 50], aliases: ['Arithmetic', 'Test of Reasoning / Mental Ability', 'Mental Ability', 'Maths', 'Quantitative Aptitude', 'Arithmetic & Reasoning'] },
    { name: 'General Science', marks: 30, questions: 30, weight_pct: 15, question_range: [51, 80], aliases: ['Science', 'General Science', 'Physics', 'Chemistry', 'Biology'] },
    { name: 'History of India & National Movement', marks: 40, questions: 40, weight_pct: 20, question_range: [81, 120], aliases: ['History', 'Indian History', 'History of India, Indian culture, Indian National Movement', 'Indian Culture'] },
    { name: 'Geography, Polity & Economy', marks: 30, questions: 30, weight_pct: 15, question_range: [121, 150], aliases: ['Geography', 'Polity', 'Economy', 'Indian Geography, Polity and Economy'] },
    { name: 'Telangana & Current Affairs', marks: 50, questions: 50, weight_pct: 25, question_range: [151, 200], aliases: ['Current Affairs', 'Current events of national and international importance', 'Contents pertaining to the State of Telangana', 'Telangana State', 'English'] }
  ],
  ssc_cgl_tier_1: [
    { name: 'General Intelligence and Reasoning', marks: 50, questions: 25, weight_pct: 25, question_range: [1, 25], aliases: ['Reasoning', 'General Intelligence', 'Logical Reasoning', 'General Intelligence and Reasoning'] },
    { name: 'General Awareness', marks: 50, questions: 25, weight_pct: 25, question_range: [26, 50], aliases: ['General Knowledge', 'GK', 'GA', 'Static GK', 'Current Affairs', 'General Awareness'] },
    { name: 'Quantitative Aptitude', marks: 50, questions: 25, weight_pct: 25, question_range: [51, 75], aliases: ['Maths', 'Mathematics', 'Quant', 'QA', 'Quantitative Aptitude'] },
    { name: 'English Comprehension', marks: 50, questions: 25, weight_pct: 25, question_range: [76, 100], aliases: ['English', 'English Language', 'Verbal Ability', 'English Comprehension'] }
  ],
  upsc_civil_services: [
    { name: 'Indian Polity & Governance', marks: 16, questions: 16, weight_pct: 16, aliases: ['Polity', 'Indian Polity', 'Governance', 'Constitution', 'Indian Polity & Governance'] },
    { name: 'Indian History & Culture', marks: 16, questions: 16, weight_pct: 16, aliases: ['History', 'Indian History', 'Art & Culture', 'Modern History', 'Ancient History', 'Indian History & Culture'] },
    { name: 'Geography', marks: 14, questions: 14, weight_pct: 14, aliases: ['Physical Geography', 'Indian Geography', 'World Geography', 'Geography'] },
    { name: 'Economic & Social Development', marks: 18, questions: 18, weight_pct: 18, aliases: ['Economy', 'Economics', 'Indian Economy', 'Social Development', 'Economic & Social Development'] },
    { name: 'Environment & Ecology', marks: 12, questions: 12, weight_pct: 12, aliases: ['Environment', 'Ecology', 'Biodiversity', 'Climate Change', 'Environment & Ecology'] },
    { name: 'General Science & Technology', marks: 12, questions: 12, weight_pct: 12, aliases: ['Science', 'Science & Tech', 'Technology', 'General Science', 'General Science & Technology'] },
    { name: 'Current Affairs', marks: 12, questions: 12, weight_pct: 12, aliases: ['Current Events', 'Current Affairs', 'Recent Events'] }
  ],
  upsc_cse_prelims: [
    { name: 'Indian Polity & Governance', marks: 16, questions: 16, weight_pct: 16, aliases: ['Polity', 'Indian Polity', 'Governance', 'Constitution', 'Indian Polity & Governance'] },
    { name: 'Indian History & Culture', marks: 16, questions: 16, weight_pct: 16, aliases: ['History', 'Indian History', 'Art & Culture', 'Modern History', 'Ancient History', 'Indian History & Culture'] },
    { name: 'Geography', marks: 14, questions: 14, weight_pct: 14, aliases: ['Physical Geography', 'Indian Geography', 'World Geography', 'Geography'] },
    { name: 'Economic & Social Development', marks: 18, questions: 18, weight_pct: 18, aliases: ['Economy', 'Economics', 'Indian Economy', 'Social Development', 'Economic & Social Development'] },
    { name: 'Environment & Ecology', marks: 12, questions: 12, weight_pct: 12, aliases: ['Environment', 'Ecology', 'Biodiversity', 'Climate Change', 'Environment & Ecology'] },
    { name: 'General Science & Technology', marks: 12, questions: 12, weight_pct: 12, aliases: ['Science', 'Science & Tech', 'Technology', 'General Science', 'General Science & Technology'] },
    { name: 'Current Affairs', marks: 12, questions: 12, weight_pct: 12, aliases: ['Current Events', 'Current Affairs', 'Recent Events'] }
  ],
  rrb_ntpc: [
    { name: 'General Awareness', marks: 40, questions: 40, weight_pct: 33.33, aliases: ['General Knowledge', 'GK', 'GA', 'Static GK', 'Current Affairs', 'General Awareness'] },
    { name: 'Mathematics', marks: 30, questions: 30, weight_pct: 25, aliases: ['Maths', 'Quantitative Aptitude', 'Arithmetic', 'Mathematics'] },
    { name: 'General Intelligence & Reasoning', marks: 30, questions: 30, weight_pct: 25, aliases: ['Reasoning', 'Logical Reasoning', 'General Intelligence', 'General Intelligence & Reasoning'] },
    { name: 'General Science', marks: 20, questions: 20, weight_pct: 16.67, aliases: ['Science', 'Physics', 'Chemistry', 'Biology', 'General Science'] }
  ],
  rrb_railways: [
    { name: 'General Awareness', marks: 40, questions: 40, weight_pct: 33.33, aliases: ['General Knowledge', 'GK', 'GA', 'Static GK', 'Current Affairs', 'General Awareness'] },
    { name: 'Mathematics', marks: 30, questions: 30, weight_pct: 25, aliases: ['Maths', 'Quantitative Aptitude', 'Arithmetic', 'Mathematics'] },
    { name: 'General Intelligence & Reasoning', marks: 30, questions: 30, weight_pct: 25, aliases: ['Reasoning', 'Logical Reasoning', 'General Intelligence', 'General Intelligence & Reasoning'] },
    { name: 'General Science', marks: 20, questions: 20, weight_pct: 16.67, aliases: ['Science', 'Physics', 'Chemistry', 'Biology', 'General Science'] }
  ],
  ibps_po: [
    { name: 'English Language', marks: 30, questions: 30, weight_pct: 30, aliases: ['English', 'Verbal Ability', 'English Comprehension', 'English Language'] },
    { name: 'Quantitative Aptitude', marks: 35, questions: 35, weight_pct: 35, aliases: ['Maths', 'Mathematics', 'Quant', 'QA', 'Quantitative Aptitude'] },
    { name: 'Reasoning Ability', marks: 35, questions: 35, weight_pct: 35, aliases: ['Reasoning', 'Logical Reasoning', 'General Intelligence', 'Reasoning Ability'] }
  ],
  state_tet_dsc: [
    { name: 'Child Development & Pedagogy', marks: 30, questions: 30, weight_pct: 20, aliases: ['CDP', 'Child Development', 'Pedagogy', 'Child Psychology', 'Child Development & Pedagogy'] },
    { name: 'Language I (Telugu/Urdu)', marks: 30, questions: 30, weight_pct: 20, aliases: ['Language I', 'Telugu', 'Urdu', 'Mother Tongue', 'Language I (Telugu/Urdu)'] },
    { name: 'Language II (English)', marks: 30, questions: 30, weight_pct: 20, aliases: ['Language II', 'English', 'English Language', 'Language II (English)'] },
    { name: 'Mathematics', marks: 30, questions: 30, weight_pct: 20, aliases: ['Maths', 'Mathematics', 'Quantitative Aptitude'] },
    { name: 'Environmental Studies', marks: 30, questions: 30, weight_pct: 20, aliases: ['EVS', 'Environment', 'Environmental Science', 'Environmental Studies'] }
  ]
};

// ---------- Tokenization & Similarity ----------

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  );
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was',
  'has', 'its', 'all', 'can', 'into', 'not', 'but', 'also', 'any'
]);

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

// ---------- Core Mapper ----------

/**
 * Resolves the canonical subjects list for an exam by exam record or examId
 */
export function resolveCanonicalSubjectsForExam(
  examOrId?: { exam_id?: string; pattern?: { canonical_subjects?: CanonicalSubject[] } } | string
): CanonicalSubject[] {
  if (!examOrId) return [];
  if (typeof examOrId === 'string') {
    const exam = getExamById(examOrId);
    if (exam?.pattern?.canonical_subjects && exam.pattern.canonical_subjects.length > 0) {
      return exam.pattern.canonical_subjects;
    }
    return DEFAULT_CANONICAL_SUBJECTS_BY_EXAM_ID[examOrId] || [];
  }

  if (examOrId.pattern?.canonical_subjects && examOrId.pattern.canonical_subjects.length > 0) {
    return examOrId.pattern.canonical_subjects;
  }

  const examId = examOrId.exam_id;
  if (examId && DEFAULT_CANONICAL_SUBJECTS_BY_EXAM_ID[examId]) {
    return DEFAULT_CANONICAL_SUBJECTS_BY_EXAM_ID[examId];
  }

  return [];
}

/**
 * Maps a single question's raw `primary_subject` to the best matching
 * canonical subject for the given exam.
 */
export function mapQuestionToSubject(
  question: { exam_id?: string; primary_subject?: string; primary_topic?: string; question_number?: number; question_en?: string },
  exam?: { exam_id?: string; pattern?: { canonical_subjects?: CanonicalSubject[] }; syllabus_topics?: string[] }
): MapResult {
  const canonicalSubjects = (exam?.pattern?.canonical_subjects && exam.pattern.canonical_subjects.length > 0)
    ? exam.pattern.canonical_subjects
    : resolveCanonicalSubjectsForExam(exam || question.exam_id);

  if (!canonicalSubjects || canonicalSubjects.length === 0) {
    return {
      matched: false,
      canonical_subject: question.primary_subject || 'General Studies',
      match_strategy: 'FALLBACK',
      confidence: 0
    };
  }

  const rawSubject = (question.primary_subject || '').trim();
  const rawTopic = (question.primary_topic || '').trim();
  const questionText = (question.question_en || '').trim();

  // Strategy 1: Exact match against canonical subject name
  if (rawSubject) {
    const exact = canonicalSubjects.find(cs => cs.name.toLowerCase() === rawSubject.toLowerCase());
    if (exact) {
      return { matched: true, canonical_subject: exact.name, match_strategy: 'EXACT', confidence: 1.0 };
    }
  }

  // Strategy 2: Alias match (case-insensitive substring or match)
  if (rawSubject) {
    const lower = rawSubject.toLowerCase();
    for (const cs of canonicalSubjects) {
      if (cs.name.toLowerCase() === lower) {
        return { matched: true, canonical_subject: cs.name, match_strategy: 'ALIAS', confidence: 0.95 };
      }
      for (const alias of cs.aliases) {
        const aLower = alias.toLowerCase();
        if (aLower === lower || lower.includes(aLower) || aLower.includes(lower)) {
          return { matched: true, canonical_subject: cs.name, match_strategy: 'ALIAS', confidence: 0.9 };
        }
      }
    }
  }

  // Strategy 3: Question number range heuristic (critical for composite papers like APPSC EO Screening)
  const qNum = Number(question.question_number);
  if (qNum > 0) {
    for (const cs of canonicalSubjects) {
      if (cs.question_range && qNum >= cs.question_range[0] && qNum <= cs.question_range[1]) {
        return { matched: true, canonical_subject: cs.name, match_strategy: 'QUESTION_RANGE', confidence: 0.85 };
      }
    }
  }

  // Strategy 4: Fuzzy/Jaccard keyword matching on subject + topic
  if (rawSubject || rawTopic) {
    const queryTokens = tokenize(`${rawSubject} ${rawTopic}`);
    let bestScore = 0;
    let bestSubject: CanonicalSubject | null = null;

    for (const cs of canonicalSubjects) {
      const candidateTokens = tokenize(`${cs.name} ${cs.aliases.join(' ')}`);
      const score = jaccardSimilarity(queryTokens, candidateTokens);
      if (score > bestScore) {
        bestScore = score;
        bestSubject = cs;
      }
    }

    if (bestSubject && bestScore >= 0.20) {
      return { matched: true, canonical_subject: bestSubject.name, match_strategy: 'FUZZY', confidence: Math.min(bestScore * 1.5, 0.85) };
    }
  }

  // Strategy 5: Syllabus topic keyword matching against question text
  if (questionText && exam?.syllabus_topics) {
    const textTokens = tokenize(questionText);
    let bestScore = 0;
    let bestSubject: CanonicalSubject | null = null;

    for (const topic of exam.syllabus_topics) {
      const topicTokens = tokenize(topic);
      const score = jaccardSimilarity(textTokens, topicTokens);
      if (score > bestScore) {
        bestScore = score;
        for (const cs of canonicalSubjects) {
          if (topic.toLowerCase().includes(cs.name.split(':')[0].toLowerCase().trim()) ||
              cs.aliases.some(a => topic.toLowerCase().includes(a.toLowerCase()))) {
            bestSubject = cs;
            break;
          }
        }
      }
    }

    if (bestSubject && bestScore >= 0.12) {
      return { matched: true, canonical_subject: bestSubject.name, match_strategy: 'SYLLABUS_TOPIC', confidence: Math.min(bestScore * 2, 0.75) };
    }
  }

  // Fallback: assign to the largest subject (most questions expected)
  const largest = [...canonicalSubjects].sort((a, b) => b.questions - a.questions)[0];
  return { matched: false, canonical_subject: largest?.name || rawSubject || 'General Studies', match_strategy: 'FALLBACK', confidence: 0.2 };
}

/**
 * Batch auto-maps all questions for an exam to their canonical subjects.
 * Returns { mapped, skipped, total, details } counts.
 */
export function autoMapAllQuestions(examId: string): { mapped: number; skipped: number; total: number; details: Record<string, number> } {
  const exam = getExamById(examId);
  const canonicalSubjects = resolveCanonicalSubjectsForExam(exam || examId);

  if (!canonicalSubjects || canonicalSubjects.length === 0) {
    return { mapped: 0, skipped: 0, total: 0, details: {} };
  }

  const allQuestions = getPYQQuestions();
  const examQuestions = allQuestions.filter(q => q.exam_id === examId);
  let mapped = 0;
  let skipped = 0;
  const strategyDetails: Record<string, number> = {};

  for (const q of examQuestions) {
    const result = mapQuestionToSubject(q, exam);
    if (result.canonical_subject && result.canonical_subject !== q.primary_subject) {
      q.primary_subject = result.canonical_subject;
      mapped++;
      strategyDetails[result.match_strategy] = (strategyDetails[result.match_strategy] || 0) + 1;
    } else if (result.matched) {
      strategyDetails[result.match_strategy] = (strategyDetails[result.match_strategy] || 0) + 1;
      skipped++;
    } else {
      skipped++;
    }
  }

  if (mapped > 0) {
    savePYQQuestions(allQuestions);
  }

  return { mapped, skipped, total: examQuestions.length, details: strategyDetails };
}

/**
 * Returns the list of canonical subject names for an exam, or an empty array
 * if the exam has no canonical_subjects defined.
 */
export function getCanonicalSubjectNames(examId: string): string[] {
  const list = resolveCanonicalSubjectsForExam(examId);
  return list.map(cs => cs.name);
}

/**
 * Returns the canonical subjects definition for an exam.
 */
export function getCanonicalSubjects(examId: string): CanonicalSubject[] {
  return resolveCanonicalSubjectsForExam(examId);
}
