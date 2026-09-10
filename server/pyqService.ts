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
  DataProvenance
} from '../src/types.ts';
import {
  INITIAL_PREVIOUS_PAPERS,
  INITIAL_PYQ_QUESTIONS,
  INITIAL_INTELLIGENCE_PROFILES,
  INITIAL_PYQ_CLUSTERS
} from './pyqSeedData.ts';
import { getExamById, saveGenerationAuditLog } from './dbService.ts';
import { getGenAI, getPrimaryModel, getThinkingConfig, getThinkingLevelForTask } from './geminiConfig.ts';

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

// ==========================================
// 1. PAPERS REPOSITORY & REGISTRATION
// ==========================================

export function getPreviousPapers(examId?: string): PreviousPaperRecord[] {
  try {
    const raw = fs.readFileSync(PAPERS_FILE, 'utf-8');
    let papers: PreviousPaperRecord[] = JSON.parse(raw);
    papers = papers.map(p => ({
      ...p,
      data_provenance: p.data_provenance || 'RETRIEVED_OFFICIAL'
    }));
    if (examId) {
      return papers.filter(p => p.exam_id === examId);
    }
    return papers;
  } catch (e) {
    return INITIAL_PREVIOUS_PAPERS.map(p => ({
      ...p,
      data_provenance: p.data_provenance || 'RETRIEVED_OFFICIAL'
    }));
  }
}

export function getPaperById(paperId: string): PreviousPaperRecord | undefined {
  const papers = getPreviousPapers();
  return papers.find(p => p.paper_id === paperId);
}

export function savePreviousPapers(papers: PreviousPaperRecord[]): void {
  try {
    fs.writeFileSync(PAPERS_FILE, JSON.stringify(papers, null, 2));
  } catch (e) {}
}

export function registerPreviousPaper(input: Partial<PreviousPaperRecord>): PreviousPaperRecord {
  const papers = getPreviousPapers();
  const examId = input.exam_id || 'general';
  const year = input.year || new Date().getFullYear();
  const shift = input.shift || 'Default Shift';
  const booklet = input.booklet_code || 'Series-A';

  // Compute content hash to prevent duplicate ingestion
  const rawSignature = `${examId}_${year}_${shift}_${booklet}_${input.paper_name || ''}`;
  const contentHash = input.content_hash || crypto.createHash('sha256').update(rawSignature).digest('hex').substring(0, 32);

  // Check for duplicate paper
  const existing = papers.find(
    p => p.exam_id === examId && p.year === year && p.shift === shift && p.booklet_code === booklet
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
  try {
    const raw = fs.readFileSync(QUESTIONS_FILE, 'utf-8');
    let questions: PYQQuestionRecord[] = JSON.parse(raw);
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
  } catch (e) {
    return INITIAL_PYQ_QUESTIONS.map(q => ({
      ...q,
      data_provenance: q.data_provenance || 'RETRIEVED_OFFICIAL'
    }));
  }
}

export function getPYQQuestionById(id: string): PYQQuestionRecord | undefined {
  const all = getPYQQuestions();
  return all.find(q => q.pyq_question_id === id);
}

export function savePYQQuestions(questions: PYQQuestionRecord[]): void {
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2));
  } catch (e) {}
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

        q.primary_subject = parsed.primary_subject || q.primary_subject;
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
        applyFallbackIntelligence(q);
      }
    } else {
      applyFallbackIntelligence(q);
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

function applyFallbackIntelligence(q: PYQQuestionRecord) {
  if (!q.primary_subject) q.primary_subject = 'General Studies';
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
  const subjectCounts: Record<string, number> = {};
  for (const q of questions) {
    const s = q.primary_subject || 'General Studies';
    subjectCounts[s] = (subjectCounts[s] || 0) + 1;
  }

  const totalQuestions = questions.length || 1;
  const subjectDistribution = Object.entries(subjectCounts).map(([subject, count]) => {
    // Official weightage from syllabus if defined
    let officialWeight: number | undefined = undefined;
    if (exam?.pattern?.sections && exam.pattern.sections.length > 0) {
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
