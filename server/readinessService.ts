import {
  CriticalFactName,
  CRITICAL_EXAM_FACTS,
  FactCheckItem,
  MockReadinessCheckResult,
  PreparationMode,
  PreparationBasis,
  PreparationBasisStatus,
  FutureNotificationAvailability,
  PatternChangeRisk,
  ExamRecord,
  ExamPatternVersion
} from '../src/types.ts';
import { getExamById, getSources, savePreparationBasis } from './dbService.ts';
import {
  CRITICAL_FACT_DEFINITIONS,
  calculateExamProfileStatus,
  createDefaultFactVerifications,
  ensureExamPatternVersions
} from './verificationService.ts';
import { getExamIntelligence } from './pyqService.ts';
import { validatePersistenceConfiguration } from './persistence/repository.ts';

/**
 * Evaluates whether a verified historical preparation basis exists for early preparation
 * when a future recruitment notification has not yet been released.
 *
 * Guiding Principle:
 * "Zero Unsupported Exam Facts — when a new recruitment notification has not yet been released,
 * preparation mocks may use the latest verified historical syllabus, examination scheme, PYQs
 * and authoritative sources."
 *
 * Never invent future vacancies, notification numbers, exam dates, or scoring rules.
 */
export function evaluatePreparationBasis(
  examId: string,
  requestedMode?: PreparationMode
): {
  basis: PreparationBasis;
  readiness: MockReadinessCheckResult;
} {
  const exam = getExamById(examId);

  const emptyFactChecks: Record<CriticalFactName, FactCheckItem> = CRITICAL_EXAM_FACTS.reduce(
    (acc, fn) => {
      acc[fn] = {
        fact_name: fn,
        fact_label: CRITICAL_FACT_DEFINITIONS[fn].label,
        verified: false,
        status: 'UNVERIFIED',
        has_evidence: false,
        value: '',
        evidence_text: '',
      };
      return acc;
    },
    {} as Record<CriticalFactName, FactCheckItem>
  );

  if (!exam) {
    const emptyBasis: PreparationBasis = {
      preparation_basis_id: `pb_${examId}_unknown_${Date.now().toString(36)}`,
      exam_id: examId,
      preparation_mode: requestedMode || 'PRE_NOTIFICATION_PREPARATION',
      historical_exam_version: 'UNKNOWN',
      recruitment_cycle: 'Unknown',
      notification: 'None',
      syllabus_version: 'None',
      pattern_version: 'None',
      pyq_intelligence_version: 'NO_PYQ_DATA',
      last_verified_date: new Date().toISOString(),
      future_notification_availability: 'UNKNOWN',
      pattern_change_risk: 'HIGH',
      confidence: 0,
      source_references: [],
      status: 'INSUFFICIENT_BASIS',
      risk_reasons: ['Exam record does not exist in registry.'],
      basis_summary: 'No examination record found.',
    };

    const emptyReadiness: MockReadinessCheckResult = {
      can_generate: false,
      status: 'NOT_READY',
      exam_id: examId,
      exam_title: 'Unknown Exam',
      applicable_cycle: 'Unknown',
      checks: {
        exam_identity_verified: false,
        exam_pattern_verified: false,
        syllabus_available: false,
        test_mode_selected: false,
        language_selected: false,
        question_count_resolved: false,
        marks_pattern_resolved: false,
        duration_resolved: false,
        negative_marking_resolved: false,
        source_confidence_sufficient: false,
        all_critical_facts_verified: false,
        no_critical_conflicts: false,
      },
      fact_checks: emptyFactChecks,
      source_confidence_score: 0,
      missing_requirements: ['Exam record does not exist in registry'],
      redirect_action: 'INTAKE_UPDATE',
      reason: 'Examination record not found.',
      preparation_mode: emptyBasis.preparation_mode,
      preparation_basis: emptyBasis,
    };

    return { basis: emptyBasis, readiness: emptyReadiness };
  }

  // 1. Determine Effective Preparation Mode
  let mode: PreparationMode = requestedMode || exam.preparation_mode || 'PRE_NOTIFICATION_PREPARATION';

  // If no explicit mode requested, infer intelligently:
  if (!requestedMode && !exam.preparation_mode) {
    const activeCycleStr = (exam.active_cycle || exam.recruitment_cycle || '').toLowerCase();
    const isFutureYear = activeCycleStr.includes('2025') || activeCycleStr.includes('2026') || activeCycleStr.includes('upcoming') || activeCycleStr.includes('pre-notification');
    const hasActiveVerifiedNotification =
      exam.fact_verifications?.recruitment_cycle?.verification_status === 'VERIFIED_OFFICIAL' &&
      !isFutureYear;

    mode = hasActiveVerifiedNotification ? 'ACTIVE_NOTIFICATION' : 'PRE_NOTIFICATION_PREPARATION';
  }

  // 2. Identify Pattern Versions & Historical Basis Candidate
  const versions = ensureExamPatternVersions(exam);
  let basisVersion: ExamPatternVersion | undefined = versions.find(v => v.is_active);

  // If active version has unverified facts, check if an earlier historical version has complete verification
  if (!basisVersion || basisVersion.pattern.total_questions === 0) {
    basisVersion = versions.find(v => v.pattern.total_questions > 0) || versions[0];
  }

  const activeCycle = exam.active_cycle || exam.recruitment_cycle || 'Current Cycle';
  const verifications = exam.fact_verifications || basisVersion?.fact_verifications || createDefaultFactVerifications(
    exam,
    basisVersion?.recruitment_cycle || activeCycle,
    exam.pattern_status === 'VERIFIED' && exam.exam_profile_status === 'VERIFIED'
  );

  // Evaluate individual critical facts
  const missing: string[] = [];
  const factChecks: Record<CriticalFactName, FactCheckItem> = {} as any;

  for (const key of Object.keys(CRITICAL_FACT_DEFINITIONS) as CriticalFactName[]) {
    const fact = verifications[key];
    // A cache label or a title is not evidence lineage. Readiness requires a
    // direct, retrievable official/government source for every critical fact.
    const hasDirectSource = /^https:\/\//i.test(fact?.source_url || '');
    const isVerified = fact
      ? (fact.verification_status === 'VERIFIED_OFFICIAL' || fact.verification_status === 'VERIFIED_MULTIPLE_SOURCES') &&
        Boolean(fact.evidence_text && fact.evidence_text.trim().length > 0) && hasDirectSource
      : false;

    factChecks[key] = {
      fact_name: key,
      fact_label: CRITICAL_FACT_DEFINITIONS[key].label,
      verified: isVerified,
      status: fact?.verification_status || 'UNVERIFIED',
      has_evidence: Boolean(fact?.evidence_text && fact.evidence_text.trim().length > 0) && hasDirectSource,
      value: fact?.fact_value ?? '',
      evidence_text: fact?.evidence_text ?? '',
      source_ref: fact?.source_url || fact?.source_title,
    };
  }

  // Identity checks
  const authorityVerified = factChecks.authority.verified;
  const examNameVerified = factChecks.exam_name.verified;
  const stageTierVerified = factChecks.stage_tier.verified;
  const paperVerified = factChecks.paper.verified;
  const cycleVerified = factChecks.recruitment_cycle.verified;

  // In PRE_NOTIFICATION_PREPARATION, exam identity is established by Authority + Exam Name + Stage + Paper,
  // grounded on the verified historical basis rather than requiring a future notification number.
  const identityVerified = mode === 'PRE_NOTIFICATION_PREPARATION' || mode === 'HISTORICAL_PRACTICE'
    ? (authorityVerified && examNameVerified && stageTierVerified && paperVerified)
    : (authorityVerified && examNameVerified && stageTierVerified && paperVerified && cycleVerified);

  if (!identityVerified) {
    const missingIdentity: string[] = [];
    if (!authorityVerified) missingIdentity.push('Commission/Authority');
    if (!examNameVerified) missingIdentity.push('Exam Name');
    if (!stageTierVerified) missingIdentity.push('Stage/Tier');
    if (!paperVerified) missingIdentity.push('Paper & Scope');
    if (mode === 'ACTIVE_NOTIFICATION' && !cycleVerified) missingIdentity.push('Active Recruitment Notification');
    missing.push(`Exam identity incomplete or unverified: ${missingIdentity.join(', ')}`);
  }

  // Pattern checks
  const questionCountResolved = factChecks.question_count.verified && Number(exam.pattern?.total_questions) > 0;
  if (!questionCountResolved) missing.push('Question count unverified (requires verified official scheme evidence)');

  const marksPatternResolved = factChecks.marks.verified && Number(exam.pattern?.marks_per_question) > 0;
  if (!marksPatternResolved) missing.push('Evaluation marks scheme unverified');

  const durationResolved = factChecks.duration.verified && Number(exam.pattern?.duration_minutes) > 0;
  if (!durationResolved) missing.push('Examination duration unverified');

  const negativeMarkingResolved = factChecks.negative_marking.verified;
  if (!negativeMarkingResolved) missing.push('Negative marking rate unverified (requires official gazette confirmation or signed off as 0/NONE)');

  const languageSelected = factChecks.language_rules.verified && Boolean(exam.pattern?.mediums && exam.pattern.mediums.length > 0);
  if (!languageSelected) missing.push('Authorized test language/medium unverified');

  const sectionStructureResolved = factChecks.section_structure.verified;
  if (!sectionStructureResolved) missing.push('Sectional structure and domain distribution unverified');

  const syllabusAvailable = factChecks.syllabus_version.verified && Boolean(exam.syllabus_topics && exam.syllabus_topics.length > 0);
  if (!syllabusAvailable) missing.push('Syllabus breakdown unverified or missing core topics');

  // Conflict checks
  const hasConflicts = Object.values(factChecks).some(fc => fc.status === 'CONFLICT');
  if (hasConflicts) {
    const conflictNames = Object.values(factChecks).filter(fc => fc.status === 'CONFLICT').map(fc => fc.fact_label);
    missing.push(`Unresolved source conflicts detected: ${conflictNames.join(', ')}`);
  }

  const patternVerified =
    questionCountResolved &&
    marksPatternResolved &&
    durationResolved &&
    negativeMarkingResolved &&
    languageSelected &&
    sectionStructureResolved;

  // 3. Assess Future Notification Availability & Pattern Change Risk
  const activeCycleLower = activeCycle.toLowerCase();
  const futureNotificationAvailability: FutureNotificationAvailability =
    mode === 'ACTIVE_NOTIFICATION' && cycleVerified
      ? 'ACTIVE'
      : activeCycleLower.includes('2025') || activeCycleLower.includes('2026') || activeCycleLower.includes('upcoming')
      ? 'NOT_YET_RELEASED'
      : 'NOT_YET_RELEASED';

  // Pattern change risk heuristics:
  // - If exam scheme has been stable across multiple versions (e.g. 150 Qs, standard negative marks) -> LOW
  // - If version is > 3 years old or single historical version -> MEDIUM
  // - If unresolved conflicts or major syllabus shifts in recent years -> HIGH
  const riskReasons: string[] = [];
  let patternChangeRisk: PatternChangeRisk = 'LOW';

  if (versions.length > 1) {
    const firstVer = versions[0];
    const secondVer = versions[1];
    if (firstVer.pattern.negative_marking_rate !== secondVer.pattern.negative_marking_rate ||
        firstVer.pattern.total_questions !== secondVer.pattern.total_questions) {
      patternChangeRisk = 'MEDIUM';
      riskReasons.push(`Historical pattern revision observed between ${secondVer.recruitment_cycle} and ${firstVer.recruitment_cycle}.`);
    }
  }

  let effectiveDateYear: number | null = null;
  if (basisVersion?.effective_date) {
    const parsed = parseInt(basisVersion.effective_date.split('-')[0], 10);
    if (!isNaN(parsed)) effectiveDateYear = parsed;
  }

  if (effectiveDateYear === null) {
    patternChangeRisk = 'UNKNOWN';
    riskReasons.push('Historical baseline has unrecorded effective dates; pattern stability across cycles is unestablished.');
  } else {
    const currentYear = new Date().getFullYear();
    if (currentYear - effectiveDateYear > 5) {
      patternChangeRisk = 'MEDIUM';
      riskReasons.push(`Latest verified scheme is from ${effectiveDateYear} (> 5 years old). Commission may issue revised ad-hoc rules in future notification.`);
    }
  }

  if (!patternVerified || !syllabusAvailable) {
    patternChangeRisk = 'UNKNOWN';
    riskReasons.push('Pattern stability is unknown until the historical scheme and syllabus are verified.');
  }
  if (hasConflicts) {
    patternChangeRisk = 'HIGH';
    riskReasons.push('Conflicting authority/gazette claims require auditor review.');
  }

  if (riskReasons.length === 0) {
    riskReasons.push('Examination scheme and gazetted syllabus have demonstrated high historical stability.');
  }

  // 4. Source & PYQ Intelligence References
  const sources = getSources(exam.exam_id);
  const sourceRefs = sources
    .filter(s => s.source_level === 'LEVEL_5_OFFICIAL' || s.source_level === 'LEVEL_4_GOVERNMENT')
    .map(s => s.title || s.url)
    .slice(0, 4);



  const pyqIntel = getExamIntelligence(exam.exam_id, false);
  const pyqIntelVersion = pyqIntel?.readiness_status || 'NO_PYQ_DATA';

  // 5. Determine PreparationBasis Status
  let basisStatus: PreparationBasisStatus;
  if (!cycleVerified) missing.push('The historical notification cycle needs official evidence.');
  const allHistoricalFactsVerified =
    cycleVerified && identityVerified &&
    patternVerified &&
    syllabusAvailable &&
    !hasConflicts;

  if (mode === 'ACTIVE_NOTIFICATION') {
    if (allHistoricalFactsVerified && cycleVerified) {
      basisStatus = 'CURRENT_NOTIFICATION_VERIFIED';
    } else if (identityVerified && (patternVerified || syllabusAvailable)) {
      basisStatus = 'HISTORICAL_BASIS_PARTIAL';
    } else {
      basisStatus = 'INSUFFICIENT_BASIS';
    }
  } else {
    // PRE_NOTIFICATION_PREPARATION or HISTORICAL_PRACTICE
    if (allHistoricalFactsVerified) {
      basisStatus = 'HISTORICAL_BASIS_VERIFIED';
    } else if (identityVerified || questionCountResolved || syllabusAvailable) {
      basisStatus = 'HISTORICAL_BASIS_PARTIAL';
    } else {
      basisStatus = 'INSUFFICIENT_BASIS';
    }
  }

  const basisRecruitmentCycle = basisVersion?.recruitment_cycle || exam.recruitment_cycle;
  const basisNotification = basisVersion?.notification_number || 'Unknown notification';
  const syllabusVersionStr = `${basisVersion?.syllabus_topics.length || exam.syllabus_topics.length} verified topics (${basisVersion?.recruitment_cycle || activeCycle})`;
  const patternVersionStr = `${exam.pattern.total_questions} Qs / ${exam.pattern.duration_minutes}m / -${exam.pattern.negative_marking_rate} marks (Version ${basisVersion?.version_id || 'v1'})`;

  const basisSummary = basisStatus === 'HISTORICAL_BASIS_VERIFIED'
    ? `Grounded on verified historical syllabus and examination scheme from ${basisRecruitmentCycle}. Zero unsupported future facts.`
    : basisStatus === 'CURRENT_NOTIFICATION_VERIFIED'
    ? `Fully verified against active official notification ${basisNotification}.`
    : `Historical preparation basis is incomplete (${missing.length} item(s) unverified).`;

  const confidenceScore = exam.source_confidence_score ?? (basisStatus === 'HISTORICAL_BASIS_VERIFIED' ? 95 : 50);

  const basisVersionTag = (basisVersion?.version_id || 'v1').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const basis_id = `pb_${exam.exam_id}_${mode.toLowerCase()}_${basisVersionTag}`;

  const basis: PreparationBasis = {
    preparation_basis_id: basis_id,
    exam_id: exam.exam_id,
    preparation_mode: mode,
    historical_exam_version: basisVersion?.version_id || `${exam.exam_id}_historical`,
    recruitment_cycle: basisRecruitmentCycle,
    notification: basisNotification,
    syllabus_version: syllabusVersionStr,
    pattern_version: patternVersionStr,
    pyq_intelligence_version: pyqIntelVersion,
    last_verified_date: exam.pattern_verified_at || exam.updated_at || new Date().toISOString(),
    future_notification_availability: futureNotificationAvailability,
    pattern_change_risk: patternChangeRisk,
    confidence: confidenceScore,
    source_references: sourceRefs,
    status: basisStatus,
    risk_reasons: riskReasons,
    basis_summary: basisSummary,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Persist the preparation basis record
  try {
    savePreparationBasis(basis);
  } catch (e) {
    console.error('Failed to persist preparation basis:', e);
  }

  // 6. Evaluate Overall Readiness for Mock Generation
  const sourceConfidenceSufficient = confidenceScore >= 80;
  if (!sourceConfidenceSufficient && basisStatus === 'HISTORICAL_BASIS_VERIFIED') {
    // If all facts are verified with official evidence, confidence is sufficient
  }

  let canGenerate = false;
  if (mode === 'PRE_NOTIFICATION_PREPARATION' || mode === 'HISTORICAL_PRACTICE') {
    canGenerate = basisStatus === 'HISTORICAL_BASIS_VERIFIED';
  } else if (mode === 'ACTIVE_NOTIFICATION') {
    canGenerate = basisStatus === 'CURRENT_NOTIFICATION_VERIFIED';
  } else {
    // CUSTOM_PRACTICE
    canGenerate = basisStatus === 'HISTORICAL_BASIS_VERIFIED' || basisStatus === 'CURRENT_NOTIFICATION_VERIFIED';
  }

  const statusStr: 'READY' | 'NOT_READY' = canGenerate ? 'READY' : 'NOT_READY';

  const reason = canGenerate
    ? mode === 'PRE_NOTIFICATION_PREPARATION'
      ? `Zero Unsupported Exam Facts — when a new recruitment notification has not yet been released, preparation mocks may use the latest verified historical syllabus, examination scheme, PYQs and authoritative sources. Historical preparation basis verified from ${basis.recruitment_cycle}.`
      : `Examination profile "${exam.title}" (${activeCycle}) is officially verified against current notification. Ready for official mock generation.`
    : `NOT_READY for Mock Generation: ${missing.length} requirement(s) unfulfilled. ${missing.slice(0, 3).join('; ')}`;

  const persistenceValidation = validatePersistenceConfiguration();
  if (persistenceValidation.status === 'PRODUCTION_PERSISTENCE_INVALID') {
    canGenerate = false;
    missing.push(`PRODUCTION_PERSISTENCE_INVALID: ${persistenceValidation.message}`);
  }

  const readiness: MockReadinessCheckResult = {
    can_generate: canGenerate && persistenceValidation.isValid,
    status: (canGenerate && persistenceValidation.isValid) ? 'READY' : 'NOT_READY',
    exam_id: exam.exam_id,
    exam_title: exam.title,
    applicable_cycle: activeCycle,
    checks: {
      exam_identity_verified: identityVerified,
      exam_pattern_verified: patternVerified,
      syllabus_available: syllabusAvailable,
      test_mode_selected: Boolean(exam.stage),
      language_selected: languageSelected,
      question_count_resolved: questionCountResolved,
      marks_pattern_resolved: marksPatternResolved,
      duration_resolved: durationResolved,
      negative_marking_resolved: negativeMarkingResolved,
      source_confidence_sufficient: sourceConfidenceSufficient || canGenerate,
      all_critical_facts_verified: allHistoricalFactsVerified,
      no_critical_conflicts: !hasConflicts,
    },
    fact_checks: factChecks,
    source_confidence_score: confidenceScore,
    missing_requirements: missing,
    redirect_action: canGenerate
      ? null
      : hasConflicts
      ? 'AUDITOR_REVIEW'
      : !patternVerified
      ? 'RESEARCH_REQUIRED'
      : 'INTAKE_UPDATE',
    reason: persistenceValidation.status === 'PRODUCTION_PERSISTENCE_INVALID'
      ? `BLOCKED: ${persistenceValidation.message}`
      : reason,
    preparation_mode: mode,
    preparation_basis: basis,
    persistence_validation: persistenceValidation,
  };

  return { basis, readiness };
}

/**
 * Evaluates whether an examination profile is ready for mock test generation.
 * Supports PRE_NOTIFICATION_PREPARATION, ACTIVE_NOTIFICATION, HISTORICAL_PRACTICE, and CUSTOM_PRACTICE.
 *
 * CRITICAL ARCHITECTURAL RULE:
 * The absence of a FUTURE recruitment notification must NOT prevent candidates/admins from preparing mock tests.
 * In PRE_NOTIFICATION_PREPARATION mode, mocks are permitted if a verified historical preparation basis exists.
 */
export function canGenerateMock(examId: string, requestedMode?: PreparationMode): MockReadinessCheckResult {
  const result = evaluatePreparationBasis(examId, requestedMode);
  return result.readiness;
}
