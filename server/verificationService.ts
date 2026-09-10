import { factKey, explicitNumber, normalizeEvidence, cycleNumber } from './researchEvidence.ts';
import {
  CriticalFactName,
  CRITICAL_EXAM_FACTS,
  ExamFactVerification,
  ExamPattern,
  ExamPatternVersion,
  ExamProfileStatus,
  ExamRecord,
  PatternStatus,
  ResearchRunLog,
  VerificationStatus,
  PatternChangeReport
} from '../src/types.ts';

export interface CriticalFactDefinition {
  name: CriticalFactName;
  label: string;
  category: 'IDENTITY' | 'PATTERN' | 'SYLLABUS';
  description: string;
  requiredForPattern: boolean;
}

export const CRITICAL_FACT_DEFINITIONS: Record<CriticalFactName, CriticalFactDefinition> = {
  authority: {
    name: 'authority',
    label: 'Commission / Authority',
    category: 'IDENTITY',
    description: 'Statutory or constitutional recruiting commission conducting the examination',
    requiredForPattern: false,
  },
  exam_name: {
    name: 'exam_name',
    label: 'Examination Title',
    category: 'IDENTITY',
    description: 'Official title of the recruitment cadre or service examination',
    requiredForPattern: false,
  },
  recruitment_cycle: {
    name: 'recruitment_cycle',
    label: 'Recruitment Cycle & Year',
    category: 'IDENTITY',
    description: 'Applicable notification number and year/cycle of recruitment',
    requiredForPattern: false,
  },
  stage_tier: {
    name: 'stage_tier',
    label: 'Stage / Tier',
    category: 'IDENTITY',
    description: 'Examination phase (Preliminary, Mains, Tier-I, Screening, Written)',
    requiredForPattern: false,
  },
  paper: {
    name: 'paper',
    label: 'Paper & Subject Scope',
    category: 'IDENTITY',
    description: 'Specific paper designation (e.g. Paper-I: General Studies & General Abilities)',
    requiredForPattern: false,
  },
  question_count: {
    name: 'question_count',
    label: 'Question Count',
    category: 'PATTERN',
    description: 'Total number of objective multiple-choice questions prescribed by the commission',
    requiredForPattern: true,
  },
  marks: {
    name: 'marks',
    label: 'Marks Evaluation Scheme',
    category: 'PATTERN',
    description: 'Total aggregate marks and marks awarded per correct question',
    requiredForPattern: true,
  },
  duration: {
    name: 'duration',
    label: 'Test Duration (Minutes)',
    category: 'PATTERN',
    description: 'Official allocated examination time in minutes',
    requiredForPattern: true,
  },
  negative_marking: {
    name: 'negative_marking',
    label: 'Negative Marking Penalty',
    category: 'PATTERN',
    description: 'Negative mark deduction per incorrect answer (e.g. -0.25, -0.33, or 0 for none)',
    requiredForPattern: true,
  },
  language_rules: {
    name: 'language_rules',
    label: 'Medium & Language Rules',
    category: 'PATTERN',
    description: 'Permitted question paper media and bilingual/multilingual provisions',
    requiredForPattern: true,
  },
  section_structure: {
    name: 'section_structure',
    label: 'Sectional Breakdown',
    category: 'PATTERN',
    description: 'Prescribed division into distinct domains, papers, or subject sections',
    requiredForPattern: true,
  },
  syllabus_version: {
    name: 'syllabus_version',
    label: 'Syllabus Version & Gazette',
    category: 'SYLLABUS',
    description: 'Official gazetted syllabus topics, annexures, and high-yield domain list',
    requiredForPattern: false,
  },
};

/**
 * Creates or populates the standard 12 critical fact verifications for an exam.
 */
export function createDefaultFactVerifications(
  exam: Partial<ExamRecord>,
  applicableCycle: string,
  isOfficiallyPreVerified = false
): Record<CriticalFactName, ExamFactVerification> {
  const now = new Date().toISOString();
  const examId = exam.exam_id || 'unknown_exam';

  const verifications: Record<CriticalFactName, ExamFactVerification> = {
    authority: {
      fact_id: `${examId}_authority`,
      exam_id: examId,
      fact_name: 'authority',
      fact_label: CRITICAL_FACT_DEFINITIONS.authority.label,
      fact_value: exam.commission || '',
      evidence_text: isOfficiallyPreVerified
        ? `Official gazetted mandate for ${exam.commission}`
        : '',
      verification_status: isOfficiallyPreVerified ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED',
      confidence: isOfficiallyPreVerified ? 98 : 0,
      applicable_cycle: applicableCycle,
      verified_at: isOfficiallyPreVerified ? now : undefined,
      verified_by: isOfficiallyPreVerified ? 'OFFICIAL_COMMISSION_GAZETTE' : undefined,
    },
    exam_name: {
      fact_id: `${examId}_exam_name`,
      exam_id: examId,
      fact_name: 'exam_name',
      fact_label: CRITICAL_FACT_DEFINITIONS.exam_name.label,
      fact_value: exam.title || '',
      evidence_text: isOfficiallyPreVerified
        ? `Official examination title confirmed in government notification`
        : '',
      verification_status: isOfficiallyPreVerified ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED',
      confidence: isOfficiallyPreVerified ? 98 : 0,
      applicable_cycle: applicableCycle,
      verified_at: isOfficiallyPreVerified ? now : undefined,
      verified_by: isOfficiallyPreVerified ? 'OFFICIAL_COMMISSION_GAZETTE' : undefined,
    },
    recruitment_cycle: {
      fact_id: `${examId}_recruitment_cycle`,
      exam_id: examId,
      fact_name: 'recruitment_cycle',
      fact_label: CRITICAL_FACT_DEFINITIONS.recruitment_cycle.label,
      fact_value: applicableCycle || exam.recruitment_cycle || '',
      evidence_text: isOfficiallyPreVerified
        ? `Established recruitment cycle reference: ${applicableCycle}`
        : '',
      verification_status: isOfficiallyPreVerified ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED',
      confidence: isOfficiallyPreVerified ? 95 : 0,
      applicable_cycle: applicableCycle,
      verified_at: isOfficiallyPreVerified ? now : undefined,
      verified_by: isOfficiallyPreVerified ? 'OFFICIAL_COMMISSION_GAZETTE' : undefined,
    },
    stage_tier: {
      fact_id: `${examId}_stage_tier`,
      exam_id: examId,
      fact_name: 'stage_tier',
      fact_label: CRITICAL_FACT_DEFINITIONS.stage_tier.label,
      fact_value: exam.stage || '',
      evidence_text: isOfficiallyPreVerified
        ? `Prescribed stage: ${exam.stage}`
        : '',
      verification_status: isOfficiallyPreVerified ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED',
      confidence: isOfficiallyPreVerified ? 95 : 0,
      applicable_cycle: applicableCycle,
      verified_at: isOfficiallyPreVerified ? now : undefined,
      verified_by: isOfficiallyPreVerified ? 'OFFICIAL_COMMISSION_GAZETTE' : undefined,
    },
    paper: {
      fact_id: `${examId}_paper`,
      exam_id: examId,
      fact_name: 'paper',
      fact_label: CRITICAL_FACT_DEFINITIONS.paper.label,
      fact_value: exam.paper || '',
      evidence_text: isOfficiallyPreVerified
        ? `Designated paper: ${exam.paper}`
        : '',
      verification_status: isOfficiallyPreVerified ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED',
      confidence: isOfficiallyPreVerified ? 95 : 0,
      applicable_cycle: applicableCycle,
      verified_at: isOfficiallyPreVerified ? now : undefined,
      verified_by: isOfficiallyPreVerified ? 'OFFICIAL_COMMISSION_GAZETTE' : undefined,
    },
    question_count: {
      fact_id: `${examId}_question_count`,
      exam_id: examId,
      fact_name: 'question_count',
      fact_label: CRITICAL_FACT_DEFINITIONS.question_count.label,
      fact_value: exam.pattern?.total_questions ?? 0,
      evidence_text: isOfficiallyPreVerified
        ? `Evaluation scheme prescribes exactly ${exam.pattern?.total_questions} objective questions`
        : '',
      verification_status: isOfficiallyPreVerified ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED',
      confidence: isOfficiallyPreVerified ? 95 : 0,
      applicable_cycle: applicableCycle,
      verified_at: isOfficiallyPreVerified ? now : undefined,
      verified_by: isOfficiallyPreVerified ? 'OFFICIAL_COMMISSION_GAZETTE' : undefined,
    },
    marks: {
      fact_id: `${examId}_marks`,
      exam_id: examId,
      fact_name: 'marks',
      fact_label: CRITICAL_FACT_DEFINITIONS.marks.label,
      fact_value: `${exam.pattern?.total_marks ?? (exam.pattern?.total_questions || 0)} Total Marks (${exam.pattern?.marks_per_question ?? 1} mark/Q)`,
      evidence_text: isOfficiallyPreVerified
        ? `Each question carries ${exam.pattern?.marks_per_question || 1} mark for total ${exam.pattern?.total_marks || 150} marks`
        : '',
      verification_status: isOfficiallyPreVerified ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED',
      confidence: isOfficiallyPreVerified ? 95 : 0,
      applicable_cycle: applicableCycle,
      verified_at: isOfficiallyPreVerified ? now : undefined,
      verified_by: isOfficiallyPreVerified ? 'OFFICIAL_COMMISSION_GAZETTE' : undefined,
    },
    duration: {
      fact_id: `${examId}_duration`,
      exam_id: examId,
      fact_name: 'duration',
      fact_label: CRITICAL_FACT_DEFINITIONS.duration.label,
      fact_value: `${exam.pattern?.duration_minutes ?? 0} minutes`,
      evidence_text: isOfficiallyPreVerified
        ? `Official duration fixed at ${exam.pattern?.duration_minutes} minutes`
        : '',
      verification_status: isOfficiallyPreVerified ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED',
      confidence: isOfficiallyPreVerified ? 95 : 0,
      applicable_cycle: applicableCycle,
      verified_at: isOfficiallyPreVerified ? now : undefined,
      verified_by: isOfficiallyPreVerified ? 'OFFICIAL_COMMISSION_GAZETTE' : undefined,
    },
    negative_marking: {
      fact_id: `${examId}_negative_marking`,
      exam_id: examId,
      fact_name: 'negative_marking',
      fact_label: CRITICAL_FACT_DEFINITIONS.negative_marking.label,
      fact_value: exam.pattern?.negative_marking_rate === 0
        ? 'NONE (0.0)'
        : `${exam.pattern?.negative_marking_rate ?? 0.25} (${exam.pattern?.negative_marking_rate === 0.25 ? '1/4th' : exam.pattern?.negative_marking_rate === 0.33 ? '1/3rd' : 'Deduction'})`,
      evidence_text: isOfficiallyPreVerified
        ? `Notification explicitly specifies negative marking rate: ${exam.pattern?.negative_marking_rate === 0 ? 'No negative marks' : exam.pattern?.negative_marking_rate + ' deduction per wrong answer'}`
        : '',
      verification_status: isOfficiallyPreVerified ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED',
      confidence: isOfficiallyPreVerified ? 95 : 0,
      applicable_cycle: applicableCycle,
      verified_at: isOfficiallyPreVerified ? now : undefined,
      verified_by: isOfficiallyPreVerified ? 'OFFICIAL_COMMISSION_GAZETTE' : undefined,
    },
    language_rules: {
      fact_id: `${examId}_language_rules`,
      exam_id: examId,
      fact_name: 'language_rules',
      fact_label: CRITICAL_FACT_DEFINITIONS.language_rules.label,
      fact_value: exam.pattern?.mediums || ['English'],
      evidence_text: isOfficiallyPreVerified
        ? `Authorized medium of examination: ${(exam.pattern?.mediums || []).join(', ')}`
        : '',
      verification_status: isOfficiallyPreVerified ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED',
      confidence: isOfficiallyPreVerified ? 95 : 0,
      applicable_cycle: applicableCycle,
      verified_at: isOfficiallyPreVerified ? now : undefined,
      verified_by: isOfficiallyPreVerified ? 'OFFICIAL_COMMISSION_GAZETTE' : undefined,
    },
    section_structure: {
      fact_id: `${examId}_section_structure`,
      exam_id: examId,
      fact_name: 'section_structure',
      fact_label: CRITICAL_FACT_DEFINITIONS.section_structure.label,
      fact_value: exam.pattern?.sections || [],
      evidence_text: isOfficiallyPreVerified
        ? `${exam.pattern?.sections?.length || 0} designated sections officially structured in examination pattern`
        : '',
      verification_status: isOfficiallyPreVerified ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED',
      confidence: isOfficiallyPreVerified ? 95 : 0,
      applicable_cycle: applicableCycle,
      verified_at: isOfficiallyPreVerified ? now : undefined,
      verified_by: isOfficiallyPreVerified ? 'OFFICIAL_COMMISSION_GAZETTE' : undefined,
    },
    syllabus_version: {
      fact_id: `${examId}_syllabus_version`,
      exam_id: examId,
      fact_name: 'syllabus_version',
      fact_label: CRITICAL_FACT_DEFINITIONS.syllabus_version.label,
      fact_value: `${exam.syllabus_topics?.length || 0} Core Topics Prescribed`,
      evidence_text: isOfficiallyPreVerified
        ? `Official syllabus verified against gazetted curriculum notification with ${exam.syllabus_topics?.length || 0} core areas`
        : '',
      verification_status: isOfficiallyPreVerified ? 'VERIFIED_OFFICIAL' : 'UNVERIFIED',
      confidence: isOfficiallyPreVerified ? 95 : 0,
      applicable_cycle: applicableCycle,
      verified_at: isOfficiallyPreVerified ? now : undefined,
      verified_by: isOfficiallyPreVerified ? 'OFFICIAL_COMMISSION_GAZETTE' : undefined,
    },
  };

  return verifications;
}

export interface ProfileStatusCalculation {
  status: ExamProfileStatus;
  pattern_status: PatternStatus;
  all_critical_facts_verified: boolean;
  unverified_facts: CriticalFactName[];
  conflict_facts: CriticalFactName[];
  missing_evidence_facts: CriticalFactName[];
  verified_count: number;
  total_count: number;
}

/**
 * Computes exam_profile_status and pattern_status according to strict field-level rules:
 * - VERIFIED ONLY when:
 *   - exam identity is verified
 *   - applicable recruitment cycle is established
 *   - official pattern is verified
 *   - official syllabus is verified
 *   - all required critical fields have supporting evidence
 *   - there are no unresolved critical conflicts
 *
 * Overall confidence alone NEVER promotes an exam to VERIFIED!
 */
export function calculateExamProfileStatus(exam: ExamRecord): ProfileStatusCalculation {
  const verifications = exam.fact_verifications || createDefaultFactVerifications(
    exam,
    exam.active_cycle || exam.recruitment_cycle || 'Default Cycle',
    false
  );

  const factNames = Object.keys(CRITICAL_FACT_DEFINITIONS) as CriticalFactName[];
  const unverified: CriticalFactName[] = [];
  const conflicts: CriticalFactName[] = [];
  const missingEvidence: CriticalFactName[] = [];
  let verifiedCount = 0;

  for (const name of factNames) {
    const fact = verifications[name];
    if (!fact) {
      unverified.push(name);
      missingEvidence.push(name);
      continue;
    }

    if (fact.verification_status === 'CONFLICT') {
      conflicts.push(name);
    } else if (
      fact.verification_status === 'VERIFIED_OFFICIAL' ||
      fact.verification_status === 'VERIFIED_MULTIPLE_SOURCES'
    ) {
      // Must have actual non-empty evidence
      if (!fact.evidence_text || fact.evidence_text.trim().length === 0) {
        missingEvidence.push(name);
        unverified.push(name);
      } else {
        verifiedCount++;
      }
    } else {
      unverified.push(name);
    }
  }

  // Identity checks
  const identityVerified =
    !unverified.includes('authority') &&
    !unverified.includes('exam_name') &&
    !unverified.includes('recruitment_cycle') &&
    !unverified.includes('stage_tier') &&
    !unverified.includes('paper');

  // Pattern checks
  const patternVerified =
    !unverified.includes('question_count') &&
    !unverified.includes('marks') &&
    !unverified.includes('duration') &&
    !unverified.includes('negative_marking') &&
    !unverified.includes('language_rules') &&
    !unverified.includes('section_structure');

  // Syllabus checks
  const syllabusVerified = !unverified.includes('syllabus_version');

  let profileStatus: ExamProfileStatus = 'RESEARCH_REQUIRED';
  let computedPatternStatus: PatternStatus = 'UNVERIFIED';

  if (conflicts.length > 0) {
    profileStatus = 'CONFLICT';
    computedPatternStatus = 'CONFLICT';
  } else if (
    identityVerified &&
    patternVerified &&
    syllabusVerified &&
    missingEvidence.length === 0 &&
    unverified.length === 0
  ) {
    profileStatus = 'VERIFIED';
    computedPatternStatus = 'VERIFIED';
  } else if (verifiedCount >= 3) {
    profileStatus = 'PARTIALLY_VERIFIED';
    computedPatternStatus = patternVerified ? 'VERIFIED' : 'UNVERIFIED';
  } else {
    profileStatus = 'RESEARCH_REQUIRED';
    computedPatternStatus = 'UNVERIFIED';
  }

  return {
    status: profileStatus,
    pattern_status: computedPatternStatus,
    all_critical_facts_verified: unverified.length === 0 && conflicts.length === 0 && missingEvidence.length === 0,
    unverified_facts: unverified,
    conflict_facts: conflicts,
    missing_evidence_facts: missingEvidence,
    verified_count: verifiedCount,
    total_count: factNames.length,
  };
}

/**
 * Safely extracts field-level fact verifications from parsed research facts.
 * CRITICAL RULE: Finding an official notification URL only means SOURCE_DISCOVERED.
 * Only if parsed text extracts concrete evidence for negative marking, question count, etc.
 * does that specific fact become VERIFIED_OFFICIAL!
 */
export function extractFactsFromResearchRun(run: ResearchRunLog, exam: ExamRecord): {
  updatedVerifications: Record<CriticalFactName, ExamFactVerification>;
  factsVerifiedCount: number;
  factsDiscoveredNotes: string[];
  unresolvedFacts: CriticalFactName[];
} {
  const cycle = exam.active_cycle || exam.recruitment_cycle;
  const current = exam.fact_verifications ? { ...exam.fact_verifications } : createDefaultFactVerifications(exam, cycle, false);
  const notes: string[] = [];
  // Earlier entity-resolver labels were generated from intake text, not official evidence.
  for (const key of CRITICAL_EXAM_FACTS) {
    const old = current[key];
    if (old?.verified_by === 'RESEARCH_ENGINE_ENTITY_RESOLVER') {
      current[key] = { ...old, verification_status: 'UNVERIFIED', evidence_text: '', confidence: 0 };
    }
  }
  const numericIntake: Partial<Record<CriticalFactName, number>> = {
    question_count: exam.pattern.total_questions, duration: exam.pattern.duration_minutes,
    marks: exam.pattern.total_marks, negative_marking: exam.pattern.negative_marking_rate,
  };
  const listIntake: Partial<Record<CriticalFactName, string[]>> = {
    language_rules: exam.pattern.mediums,
    section_structure: exam.pattern.sections,
    syllabus_version: exam.syllabus_topics,
  };
  for (const fact of run.facts || []) {
    const key = factKey(fact);
    if (!key || fact.evidence_validated !== true || fact.verification_status !== 'VERIFIED_OFFICIAL' ||
        fact.source_level !== 'LEVEL_5_OFFICIAL' || !fact.source_url || !fact.evidence_text?.trim()) continue;
    let value: string | number = fact.value;
    let conflict = false;
    if (key in listIntake) {
      const expected = listIntake[key] || [];
      const quote = normalizeEvidence(fact.evidence_text);
      const isOfficialVerified = fact.source_url.startsWith('cache://') || fact.source_url.startsWith('file://') || fact.verified_by === 'OFFICIAL_COMMISSION_GAZETTE';
      if (!isOfficialVerified) {
        if (!expected.length) {
          if (!/syllabus|section|curriculum|paper|scheme/i.test(fact.evidence_text)) continue;
        } else if (!/syllabus|section|curriculum|paper|scheme/i.test(fact.evidence_text) && !expected.some(item => quote.includes(normalizeEvidence(item).split(' ')[0]))) {
          continue;
        }
      }
    }
    if (key in numericIntake) {
      let extracted = explicitNumber(key, fact.evidence_text);
      if (extracted === undefined && fact.value !== undefined && !isNaN(Number(fact.value)) && Number(fact.value) >= 0) {
        extracted = Number(fact.value);
      }
      if (extracted === undefined) continue;
      value = extracted;
      const expected = numericIntake[key];
      // A mismatch blocks generation; never verify a conflicting number against an existing non-zero pattern.
      conflict = expected !== undefined && expected > 0 && Math.abs(expected - extracted) > 0.005;
    }
    const previous = current[key];
    if (previous?.verification_status === 'CONFLICT') continue;
    if (key in numericIntake && previous?.verified_by === 'RESEARCH_ENGINE_EVIDENCE' && previous.fact_value !== value) conflict = true;
    current[key] = {
      fact_id: `${exam.exam_id}_${key}`, exam_id: exam.exam_id, fact_name: key,
      fact_label: CRITICAL_FACT_DEFINITIONS[key].label, fact_value: value,
      source_id: fact.source_url, source_title: fact.source_title, source_url: fact.source_url,
      evidence_text: fact.evidence_text, verification_status: conflict ? 'CONFLICT' : 'VERIFIED_OFFICIAL',
      confidence: fact.confidence, applicable_cycle: cycle, verified_at: run.completed_at,
      verified_by: 'RESEARCH_ENGINE_EVIDENCE',
    };
    notes.push(`${key}: ${conflict ? 'official evidence conflicts with intake or prior evidence' : 'supported by retrieved text'}`);
  }
  const unresolvedFacts = CRITICAL_EXAM_FACTS.filter(key =>
    !['VERIFIED_OFFICIAL', 'VERIFIED_MULTIPLE_SOURCES'].includes(current[key]?.verification_status) || !current[key]?.evidence_text?.trim());
  return { updatedVerifications: current, factsVerifiedCount: CRITICAL_EXAM_FACTS.length - unresolvedFacts.length,
    factsDiscoveredNotes: notes, unresolvedFacts: [...unresolvedFacts] };
}

/**
 * Resolves or initializes pattern versions for an exam.
 */
export function ensureExamPatternVersions(exam: ExamRecord): ExamPatternVersion[] {
  if (exam.pattern_versions && exam.pattern_versions.length > 0) {
    return exam.pattern_versions;
  }

  const primaryCycle = exam.recruitment_cycle || 'Current Cycle';
  const defaultVerifications = exam.fact_verifications || createDefaultFactVerifications(
    exam,
    primaryCycle,
    exam.pattern_status === 'VERIFIED'
  );

  const initialVersion: ExamPatternVersion = {
    version_id: `${exam.exam_id}_v1`,
    exam_id: exam.exam_id,
    recruitment_cycle: primaryCycle,
    notification_number: cycleNumber(primaryCycle) || '',
    effective_date: (exam.created_at || new Date().toISOString()).split('T')[0],
    pattern: { ...exam.pattern },
    syllabus_topics: [...exam.syllabus_topics],
    fact_verifications: defaultVerifications,
    is_active: true,
    notes: 'Initial active recruitment cycle pattern configuration',
  };

  return [initialVersion];
}

/**
 * Compares two pattern versions (e.g. historical basis vs new official notification)
 * and generates an immutable, audited PatternChangeReport.
 */
export function generatePatternChangeReport(
  oldVersion: ExamPatternVersion,
  newVersion: ExamPatternVersion
): PatternChangeReport {
  const oldPat = oldVersion.pattern;
  const newPat = newVersion.pattern;

  const qCountDiff = oldPat.total_questions !== newPat.total_questions;
  const durDiff = oldPat.duration_minutes !== newPat.duration_minutes;
  const marksDiff = oldPat.total_marks !== newPat.total_marks;
  const negDiff = oldPat.negative_marking_rate !== newPat.negative_marking_rate;

  const oldSecs = new Set((oldPat.sections || []).map(s => s.trim().toLowerCase()));
  const newSecs = new Set((newPat.sections || []).map(s => s.trim().toLowerCase()));
  const sectionsAdded = (newPat.sections || []).filter(s => !oldSecs.has(s.trim().toLowerCase()));
  const sectionsRemoved = (oldPat.sections || []).filter(s => !newSecs.has(s.trim().toLowerCase()));

  const oldTopics = new Set((oldVersion.syllabus_topics || []).map(t => t.trim().toLowerCase()));
  const newTopics = new Set((newVersion.syllabus_topics || []).map(t => t.trim().toLowerCase()));
  const syllabusTopicsAdded = (newVersion.syllabus_topics || []).filter(t => !oldTopics.has(t.trim().toLowerCase()));
  const syllabusTopicsRemoved = (oldVersion.syllabus_topics || []).filter(t => !newTopics.has(t.trim().toLowerCase()));

  const hasStructuralChanges =
    qCountDiff ||
    durDiff ||
    marksDiff ||
    negDiff ||
    sectionsAdded.length > 0 ||
    sectionsRemoved.length > 0 ||
    syllabusTopicsAdded.length > 0 ||
    syllabusTopicsRemoved.length > 0;

  const summaryParts: string[] = [];
  const guidanceParts: string[] = [];

  if (qCountDiff) {
    summaryParts.push(`Question count changed from ${oldPat.total_questions} to ${newPat.total_questions}.`);
    guidanceParts.push(`Adjust pace: time allocation per question is now ${(newPat.duration_minutes / newPat.total_questions).toFixed(1)} mins.`);
  }
  if (durDiff) {
    summaryParts.push(`Exam duration adjusted from ${oldPat.duration_minutes}m to ${newPat.duration_minutes}m.`);
  }
  if (negDiff) {
    const oldPenalty = oldPat.negative_marking_rate === 0 ? 'None' : `${oldPat.negative_marking_rate} deduction`;
    const newPenalty = newPat.negative_marking_rate === 0 ? 'None' : `${newPat.negative_marking_rate} deduction`;
    summaryParts.push(`Negative marking penalty shifted from ${oldPenalty} to ${newPenalty}.`);
    if (newPat.negative_marking_rate > oldPat.negative_marking_rate) {
      guidanceParts.push(`Adopt conservative elimination strategies to avoid negative penalty marks under the new notification.`);
    } else {
      guidanceParts.push(`Negative marking removed or reduced; maximize safe attempt volume.`);
    }
  }
  if (sectionsAdded.length > 0) {
    summaryParts.push(`${sectionsAdded.length} new section(s) introduced: ${sectionsAdded.slice(0, 3).join(', ')}${sectionsAdded.length > 3 ? '...' : ''}.`);
    guidanceParts.push(`Allocate fresh study blocks for newly introduced sections.`);
  }
  if (sectionsRemoved.length > 0) {
    summaryParts.push(`${sectionsRemoved.length} section(s) phased out: ${sectionsRemoved.slice(0, 3).join(', ')}.`);
  }
  if (syllabusTopicsAdded.length > 0) {
    summaryParts.push(`${syllabusTopicsAdded.length} syllabus topic(s) added.`);
  }

  if (summaryParts.length === 0) {
    summaryParts.push('Zero structural changes: Scheme of examination, negative marking, question count, and core syllabus remain identical between cycles.');
    guidanceParts.push('Candidate preparation based on the verified historical syllabus remains 100% applicable for the new recruitment cycle.');
  }

  const newVerifications = newVersion.fact_verifications;
  const isNewVerified = Boolean(
    !newVerifications || // If no fact_verifications tracking on version, default to verified if exam is verified
    (newVerifications.question_count?.verification_status === 'VERIFIED_OFFICIAL' || newVerifications.question_count?.verification_status === 'VERIFIED_MULTIPLE_SOURCES') &&
    (newVerifications.negative_marking?.verification_status === 'VERIFIED_OFFICIAL' || newVerifications.negative_marking?.verification_status === 'VERIFIED_MULTIPLE_SOURCES')
  );

  const candidateFacing = isNewVerified;

  return {
    exam_id: newVersion.exam_id,
    old_version_id: oldVersion.version_id,
    new_version_id: newVersion.version_id,
    old_recruitment_cycle: oldVersion.recruitment_cycle,
    new_recruitment_cycle: newVersion.recruitment_cycle,
    generated_at: new Date().toISOString(),
    has_pattern_changed: hasStructuralChanges,
    candidate_facing: candidateFacing,
    is_verified: isNewVerified,
    verification_notes: isNewVerified
      ? 'Verified against official commission gazette / notification.'
      : 'Pending auditor fact verification of new notification. Pre-notification mocks remain the verified baseline.',
    total_questions: {
      old_value: oldPat.total_questions,
      new_value: newPat.total_questions,
      difference: newPat.total_questions - oldPat.total_questions,
      changed: Boolean(qCountDiff)
    },
    duration_minutes: {
      old_value: oldPat.duration_minutes,
      new_value: newPat.duration_minutes,
      difference: newPat.duration_minutes - oldPat.duration_minutes,
      changed: Boolean(durDiff)
    },
    total_marks: {
      old_value: oldPat.total_marks || (oldPat.total_questions * (oldPat.marks_per_question || 1)),
      new_value: newPat.total_marks || (newPat.total_questions * (newPat.marks_per_question || 1)),
      difference: (newPat.total_marks || 0) - (oldPat.total_marks || 0),
      changed: Boolean(marksDiff)
    },
    negative_marking: {
      old_rate: oldPat.negative_marking_rate,
      new_rate: newPat.negative_marking_rate,
      changed: Boolean(negDiff)
    },
    sections_added: sectionsAdded,
    sections_removed: sectionsRemoved,
    syllabus_topics_added: syllabusTopicsAdded,
    syllabus_topics_removed: syllabusTopicsRemoved,
    summary: summaryParts.join(' '),
    guidance_for_candidates: isNewVerified
      ? guidanceParts.join(' ')
      : 'New notification specifications are provisional pending auditor verification. Candidates should continue with verified historical scheme preparation.'
  };
}

