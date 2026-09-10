import { registerExamRoutes } from './examRoutes.ts';
import express from "express";
import dotenv from "dotenv";

dotenv.config();

import {
  executeResearch,
  getRegistry,
  getRuns,
  identifyExamDetails,
  isQuotaExhaustedError,
  saveRegistry,
  saveRuns,
} from "./researchService.ts";
import {
  getExams,
  saveExams,
  getExamById,
  createExamFromIntake,
  getSources,
  saveSource,
  getMocks,
  getMockById,
  saveMockTest,
  finalizeMockTest,
  getGenerationAuditLogs,
  saveGenerationAuditLog,
  getAuditLogs,
  applyAuditorFactSignoff,
  switchExamRecruitmentCycle,
  getDuplicateLedger,
  checkQuestionDuplicate,
  computeCanonicalQuestionHash,
  getExamPatternChangeReport,
} from "./dbService.ts";
import { generateMockTestForExam } from "./mockService.ts";
import { canGenerateMock, evaluatePreparationBasis } from "./readinessService.ts";
import {
  getExamResearchStatus,
  identifyResearchGaps,
  getStoredExamIntelligence,
} from "./researchReadiness.ts";
import {
  OfficialSourceRegistryRecord,
  ResearchRequestPayload,
  ExamIntakeInput,
  AuditType,
  CriticalFactName,
  ExamPatternVersion,
  PreparationMode,
  PreparationBasis,
  PatternChangeReport,
} from "../src/types.ts";
import {
  calculateExamProfileStatus,
  CRITICAL_FACT_DEFINITIONS,
  generatePatternChangeReport,
} from "./verificationService.ts";
import {
  getPreviousPapers,
  getPaperById,
  registerPreviousPaper,
  linkAnswerKeyToPaper,
  analyseQuestionBatch,
  getPYQQuestions,
  getPYQQuestionById,
  reviewPYQQuestion,
  getExamIntelligence,
  buildExamIntelligenceProfile,
  getPYQClusters,
  getExamIntelligenceReadiness,
  getAnalysisRuns,
} from "./pyqService.ts";
import {
  getStoredBlueprints,
  getBlueprintById,
  createMockBlueprint,
  validateBlueprint,
  lockBlueprintRecord,
  recordAuditorBlueprintEdit,
  cloneAndSupersedeBlueprint,
  getStoredBlueprintAuditLogs,
  getNextMockNumber,
  getSeriesLedgerSummary,
  calculateCurrentAffairsWindow,
  saveBlueprintRecord,
} from "./blueprintService.ts";
import {
  validatePersistenceConfiguration,
  getExecutionEnvironment,
  getPersistenceBackend,
} from "./persistence/repository.ts";
import { getRepositoryRegistry } from "./persistence/index.ts";
import { checkProductionPersistence } from "./persistence/healthCheck.ts";
import { validateSupabaseConfiguration } from "./persistence/supabaseClient.ts";

export function createApp(): express.Application {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // Production startup persistence validation
  try {
    validateSupabaseConfiguration();
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
      console.error('[FATAL_CONFIG_ERROR]', err.message);
    } else {
      console.warn('[CONFIG_NOTICE]', err.message);
    }
  }

  const persistenceCheck = validatePersistenceConfiguration();
  if (!persistenceCheck.isValid) {
    console.error(`[PERSISTENCE_WARNING] ${persistenceCheck.message}`);
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      environment: getExecutionEnvironment().toLowerCase(),
      backend: getPersistenceBackend(),
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/persistence/health", async (req, res) => {
    try {
      const health = await checkProductionPersistence();
      res.status(health.healthy ? 200 : 503).json(health);
    } catch (err: any) {
      res.status(500).json({ healthy: false, error: err.message });
    }
  });

  // ==========================================
  // EXAMS & INTAKE WORKFLOW ENDPOINTS
  // ==========================================

  registerExamRoutes(app);

  app.get("/api/exams/:id/pattern-change-report", (req, res) => {
    try {
      const oldVersionId = req.query.old_version_id as string | undefined;
      const newVersionId = req.query.new_version_id as string | undefined;
      const report = getExamPatternChangeReport(req.params.id, oldVersionId, newVersionId);
      if (!report) {
        return res.status(404).json({ error: "No pattern changes detected between versions or exam not found" });
      }
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch pattern change report" });
    }
  });

  app.post("/api/exams/:id/verify-pattern", (req, res) => {
    try {
      const exam = getExamById(req.params.id);
      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }

      const {
        auditor_notes,
        reason,
        negative_marking_rate,
        total_questions,
        duration_minutes,
        total_marks,
        recruitment_cycle,
        source_ref,
        source_url,
        source_id,
        verified_by,
        auditor,
        field_updates,
      } = req.body;

      const auditorName = auditor || verified_by || "Curriculum Auditor";
      const justification = reason || auditor_notes || "Auditor verification of official notification pattern scheme";
      const sourceReference = source_ref || source_url || "Official Government Gazette & Notification";
      const targetCycle = recruitment_cycle || exam.active_cycle || exam.recruitment_cycle || "Current Notification";

      // Prepare field updates
      const updates: {
        fact_name: CriticalFactName;
        new_value: any;
        previous_value?: any;
        evidence_text: string;
      }[] = field_updates && Array.isArray(field_updates) && field_updates.length > 0
        ? field_updates
        : [];

      if (updates.length === 0) {
        // Build updates from single payload parameters
        if (typeof negative_marking_rate === 'number' || typeof negative_marking_rate === 'string') {
          updates.push({
            fact_name: 'negative_marking',
            new_value: Number(negative_marking_rate),
            previous_value: exam.pattern.negative_marking_rate,
            evidence_text: `Verified negative marking rate: ${negative_marking_rate}. Source: ${sourceReference}`,
          });
        }
        if (typeof total_questions === 'number') {
          updates.push({
            fact_name: 'question_count',
            new_value: total_questions,
            previous_value: exam.pattern.total_questions,
            evidence_text: `Verified total questions: ${total_questions}. Source: ${sourceReference}`,
          });
        }
        if (typeof duration_minutes === 'number') {
          updates.push({
            fact_name: 'duration',
            new_value: duration_minutes,
            previous_value: exam.pattern.duration_minutes,
            evidence_text: `Verified allocated duration: ${duration_minutes} minutes. Source: ${sourceReference}`,
          });
        }
        if (typeof total_marks === 'number') {
          updates.push({
            fact_name: 'marks',
            new_value: total_marks,
            previous_value: exam.pattern.total_marks,
            evidence_text: `Verified total marks: ${total_marks}. Source: ${sourceReference}`,
          });
        }
      }

      const result = applyAuditorFactSignoff({
        exam_id: exam.exam_id,
        recruitment_cycle: targetCycle,
        source_id,
        source_ref: sourceReference,
        auditor: auditorName,
        reason: justification,
        field_updates: updates,
      });

      res.json({
        success: true,
        exam: result.exam,
        auditLogs: result.auditLogs,
        message: `Auditor sign-off successfully recorded for ${targetCycle}`,
      });
    } catch (err: any) {
      console.error("Error verifying exam pattern:", err);
      res.status(500).json({ error: err.message || "Failed to verify exam pattern" });
    }
  });

  // Individual or Batch Fact Verification
  app.post("/api/exams/:id/verify-fact", (req, res) => {
    try {
      const exam = getExamById(req.params.id);
      if (!exam) return res.status(404).json({ error: "Exam not found" });

      const { fact_name, new_value, previous_value, evidence_text, source_ref, auditor, reason, recruitment_cycle } = req.body;
      if (!fact_name) {
        return res.status(400).json({ error: "fact_name is required" });
      }

      const result = applyAuditorFactSignoff({
        exam_id: exam.exam_id,
        recruitment_cycle: recruitment_cycle || exam.active_cycle || exam.recruitment_cycle,
        source_ref: source_ref || "Auditor Gazette Review",
        auditor: auditor || "Auditor Staff",
        reason: reason || `Manual verification of fact "${fact_name}"`,
        field_updates: [
          {
            fact_name: fact_name as CriticalFactName,
            new_value,
            previous_value,
            evidence_text: evidence_text || reason || "Confirmed against gazette notification",
          }
        ]
      });

      res.json({ success: true, exam: result.exam, auditLogs: result.auditLogs });
    } catch (err: any) {
      console.error("Error verifying individual fact:", err);
      res.status(500).json({ error: err.message || "Failed to verify fact" });
    }
  });

  // Recruitment Cycle Switching
  app.post("/api/exams/:id/switch-cycle", (req, res) => {
    try {
      const { target_cycle } = req.body;
      if (!target_cycle) {
        return res.status(400).json({ error: "target_cycle is required" });
      }
      const updatedExam = switchExamRecruitmentCycle(req.params.id, target_cycle);
      if (!updatedExam) {
        return res.status(404).json({ error: "Exam or recruitment cycle not found" });
      }

      // Log cycle switch in audit trail
      saveGenerationAuditLog({
        log_id: `audit_cycle_switch_${Date.now()}`,
        audit_type: 'PATTERN_VERIFICATION_AUDIT',
        action: 'RECRUITMENT_CYCLE_SWITCH',
        exam_id: updatedExam.exam_id,
        exam_title: updatedExam.title,
        recruitment_cycle: target_cycle,
        reason: `Switched active recruitment cycle to "${target_cycle}". Pattern and facts adjusted to match cycle version.`,
        status: 'SUCCESS',
        created_at: new Date().toISOString(),
      });

      res.json({ success: true, exam: updatedExam });
    } catch (err: any) {
      console.error("Error switching exam cycle:", err);
      res.status(500).json({ error: err.message || "Failed to switch cycle" });
    }
  });

  // Add a new Recruitment Cycle Pattern Version without overwriting existing ones
  app.post("/api/exams/:id/pattern-versions", (req, res) => {
    try {
      const exam = getExamById(req.params.id);
      if (!exam) return res.status(404).json({ error: "Exam not found" });

      const { recruitment_cycle, notification_number, effective_date, pattern, notes } = req.body;
      if (!recruitment_cycle) {
        return res.status(400).json({ error: "recruitment_cycle is required" });
      }

      const existingVersions = exam.pattern_versions || [];
      const oldActiveVersion = existingVersions.find(v => v.is_active);

      const newVersion: ExamPatternVersion = {
        version_id: `${exam.exam_id}_v${existingVersions.length + 1}`,
        exam_id: exam.exam_id,
        recruitment_cycle,
        notification_number: notification_number || 'Official Notification',
        effective_date: effective_date || new Date().toISOString().split('T')[0],
        pattern: pattern || { ...exam.pattern },
        syllabus_topics: [...exam.syllabus_topics],
        is_active: true,
        notes: notes || 'New cycle version added',
      };

      // Generate PatternChangeReport comparing old vs new cycle
      const patternChangeReport = oldActiveVersion ? generatePatternChangeReport(oldActiveVersion, newVersion) : null;

      existingVersions.forEach(v => { v.is_active = false; });
      existingVersions.push(newVersion);
      exam.pattern_versions = existingVersions;
      exam.active_cycle = recruitment_cycle;
      exam.recruitment_cycle = recruitment_cycle;
      exam.pattern = { ...newVersion.pattern };

      const calc = calculateExamProfileStatus(exam);
      exam.exam_profile_status = calc.status;
      exam.pattern_status = calc.pattern_status;

      const exams = getExams();
      const idx = exams.findIndex(e => e.exam_id === exam.exam_id);
      if (idx !== -1) {
        exams[idx] = exam;
        saveExams(exams);
      }

      saveGenerationAuditLog({
        log_id: `audit_add_version_${Date.now()}`,
        audit_type: 'PATTERN_VERIFICATION_AUDIT',
        action: 'PATTERN_VERSION_CREATED',
        exam_id: exam.exam_id,
        exam_title: exam.title,
        recruitment_cycle,
        reason: `Created separate pattern version for recruitment cycle ${recruitment_cycle} (Notification: ${notification_number || 'N/A'}). ${patternChangeReport?.summary || ''}`,
        status: 'SUCCESS',
        created_at: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        exam,
        version: newVersion,
        pattern_change_report: patternChangeReport
      });
    } catch (err: any) {
      console.error("Error creating pattern version:", err);
      res.status(500).json({ error: err.message || "Failed to create pattern version" });
    }
  });

  // Central System Audit Logs endpoint (supporting audit_type filtering)
  app.get("/api/audit-logs", (req, res) => {
    try {
      const examId = req.query.exam_id as string | undefined;
      const auditType = req.query.audit_type as AuditType | undefined;
      const logs = getAuditLogs({ exam_id: examId, audit_type: auditType });
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch system audit logs" });
    }
  });

  app.get("/api/exams/:id/audit-logs", (req, res) => {
    try {
      const logs = getAuditLogs({ exam_id: req.params.id });
      res.json({ total: logs.length, logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch exam audit logs" });
    }
  });

  // ==========================================
  // SOURCES DATABASE ENDPOINTS
  // ==========================================
  app.get("/api/sources", (req, res) => {
    try {
      const examId = req.query.exam_id as string | undefined;
      const sources = getSources(examId);
      res.json(sources);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch sources" });
    }
  });

  app.post("/api/sources", (req, res) => {
    try {
      const { title, url, domain, source_level, document_type, exam_id, summary } = req.body;
      if (!title || !url) {
        return res.status(400).json({ error: "Source title and URL are required" });
      }
      const newSource = saveSource({
        title,
        url,
        domain: domain || new URL(url).hostname,
        source_level: source_level || 'LEVEL_5_OFFICIAL',
        document_type: document_type || 'NOTIFICATION',
        verification_status: 'VERIFIED_OFFICIAL',
        is_current: true,
        exam_id,
        summary
      });
      res.status(201).json({ success: true, source: newSource });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to register source" });
    }
  });

  // ==========================================
  // MOCK TESTS ENDPOINTS
  // ==========================================
  app.get("/api/mocks", async (req, res) => {
    try {
      const examId = req.query.exam_id as string | undefined;
      const prepMode = req.query.preparation_mode as PreparationMode | undefined;
      let mocks: any[] = [];
      if (getPersistenceBackend() === 'DATABASE') {
        try {
          const dbMocks = await getRepositoryRegistry().mocks.getMocks(examId);
          if (dbMocks && dbMocks.length > 0) {
            mocks = prepMode ? dbMocks.filter((m: any) => m.preparation_mode === prepMode) : dbMocks;
          }
        } catch (dbErr) {
          console.warn("[DB_GET_MOCKS_WARN]", dbErr);
        }
      }
      if (!mocks || mocks.length === 0) {
        mocks = getMocks(examId, prepMode);
      }
      res.json(mocks);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch mocks" });
    }
  });

  app.get("/api/mocks/:id", async (req, res) => {
    try {
      let mock = getMockById(req.params.id);
      if (!mock && getPersistenceBackend() === 'DATABASE') {
        try {
          const dbMock = await getRepositoryRegistry().mocks.getMockById(req.params.id);
          if (dbMock) {
            mock = dbMock;
            saveMockTest(mock);
          }
        } catch (dbErr) {
          console.warn("[DB_GET_MOCK_BY_ID_WARN]", dbErr);
        }
      }
      if (!mock) return res.status(404).json({ error: "Mock test not found" });
      res.json(mock);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });



  app.post("/api/blueprints/:id/generate-mock", async (req, res) => {
    try {
      let blueprint = getBlueprintById(req.params.id);
      if (!blueprint && getPersistenceBackend() === 'DATABASE') {
        blueprint = (await getRepositoryRegistry().blueprints.getBlueprintById(req.params.id)) || undefined;
      }
      if (!blueprint) {
        return res.status(404).json({ error: "Blueprint not found" });
      }
      const mock = await generateMockTestForExam({
        exam_id: blueprint.exam_id,
        blueprint_id: blueprint.blueprint_id,
        desiredQuestionCount: blueprint.question_count,
        difficulty: 'Standard',
        preparation_mode: blueprint.preparation_mode
      });
      res.json({ success: true, mock });
    } catch (err: any) {
      console.error("Error generating mock from blueprint:", err);
      res.status(500).json({ error: err.message || "Blueprint mock generation failed" });
    }
  });

  app.post("/api/mocks/:id/finalize", async (req, res) => {
    try {
      const { auditor_notes } = req.body || {};
      let mock = getMockById(req.params.id);
      if (!mock && getPersistenceBackend() === 'DATABASE') {
        try {
          const dbMock = await getRepositoryRegistry().mocks.getMockById(req.params.id);
          if (dbMock) {
            saveMockTest(dbMock);
            mock = dbMock;
          }
        } catch (dbErr) {
          console.warn("[DB_FINALIZE_FETCH_WARN]", dbErr);
        }
      }
      const result = finalizeMockTest(req.params.id, auditor_notes);

      if (getPersistenceBackend() === 'DATABASE') {
        try {
          const registry = getRepositoryRegistry();
          await registry.mocks.saveMock(result.mock);
          const allQuestions = result.mock.sections.flatMap(s => s.questions);
          const commitRes = await registry.ledger.commitAcceptedQuestions(
            allQuestions,
            result.mock.exam_id,
            result.mock.mock_id,
            result.mock.series_id
          );
          await registry.auditLogs.appendAuditLog({
            log_id: `log_fin_${Date.now().toString(36)}`,
            audit_type: 'MOCK_FINALIZATION_AUDIT',
            action: 'MOCK_TEST_FINALIZATION',
            exam_id: result.mock.exam_id,
            mock_id: result.mock.mock_id,
            status: 'SUCCESS',
            reason: `Mock test ${result.mock.title} finalized and committed to ledger with ${commitRes.added} questions.`,
            created_at: new Date().toISOString(),
          });
        } catch (dbFinalizeErr: any) {
          console.error("[DATABASE_FINALIZE_WARNING]", dbFinalizeErr);
          throw new Error(`Failed to persist finalized mock to database: ${dbFinalizeErr?.message || dbFinalizeErr}`);
        }
      }

      res.json({
        success: true,
        message: "Mock test finalized. Questions committed to non-repeat ledger.",
        mock: result.mock,
        questions_added_to_ledger: result.addedToLedger,
        duplicates_prevented: result.duplicatesBlocked,
      });
    } catch (err: any) {
      console.error("Error finalizing mock test:", err);
      res.status(500).json({ error: err.message || "Failed to finalize mock test" });
    }
  });

  app.get("/api/mocks/audit-logs", (req, res) => {
    try {
      const examId = req.query.exam_id as string | undefined;
      const logs = getGenerationAuditLogs(examId);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch audit logs" });
    }
  });

  // ==========================================
  // DUPLICATE LEDGER ENDPOINTS
  // ==========================================
  app.get("/api/ledger", async (req, res) => {
    try {
      let ledger: any[] = [];
      if (getPersistenceBackend() === 'DATABASE') {
        try {
          const dbLedger = await getRepositoryRegistry().ledger.getLedgerEntries();
          if (dbLedger && dbLedger.length > 0) {
            ledger = dbLedger;
          }
        } catch (dbErr) {
          console.warn("[DB_GET_LEDGER_WARN]", dbErr);
        }
      }
      if (!ledger || ledger.length === 0) {
        ledger = getDuplicateLedger();
      }
      const totalBlocked = ledger.reduce((acc, curr) => acc + (curr.duplicate_attempts_blocked || 0), 0);
      res.json({
        total_unique_questions: ledger.length,
        total_duplicate_attempts_prevented: totalBlocked,
        entries: ledger
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch duplicate ledger" });
    }
  });

  app.post("/api/ledger/check", async (req, res) => {
    try {
      const { question_text, exam_id } = req.body;
      if (!question_text || typeof question_text !== 'string') {
        return res.status(400).json({ error: "question_text is required" });
      }
      const localResult = checkQuestionDuplicate(question_text, exam_id);
      if (localResult.is_duplicate) {
        return res.json(localResult);
      }

      if (getPersistenceBackend() === 'DATABASE') {
        try {
          const canonical_hash = computeCanonicalQuestionHash(question_text);
          const matches = await getRepositoryRegistry().ledger.findMatches({ canonical_hash });
          if (matches && matches.length > 0) {
            const match = matches[0];
            return res.json({
              is_duplicate: true,
              decision: 'DUPLICATE',
              question_hash: canonical_hash,
              canonical_hash,
              matching_ledger_entry: match,
              similarity_score: 1.0,
              layer_matched: 'LAYER_1_CANONICAL_HASH',
              reason: `Exact canonical question hash collision (${canonical_hash}) with question in database duplicate ledger (mock: ${match.mock_id})`
            });
          }
        } catch (dbMatchErr) {
          console.warn("[DB_LEDGER_MATCH_WARN]", dbMatchErr);
        }
      }

      res.json(localResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Duplicate check failed" });
    }
  });


  // 1. Identify Exam Structure
  app.post("/api/research/identify", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Missing query parameter" });
      }
      const identification = await identifyExamDetails(query);
      res.json(identification);
    } catch (err: any) {
      console.error("API Error in /api/research/identify:", err);
      res.status(500).json({ error: err.message || "Failed to identify examination" });
    }
  });

  // 2. Execute Research Run


  // Research Status, Gaps & Stored Intelligence
  app.get("/api/research/status/:examId", (req, res) => {
    try {
      const status = getExamResearchStatus(req.params.examId);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to retrieve exam research status" });
    }
  });

  app.get("/api/research/gaps/:examId", (req, res) => {
    try {
      const gaps = identifyResearchGaps(req.params.examId);
      res.json(gaps);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to identify research gaps" });
    }
  });

  app.get("/api/research/intelligence/:examId", (req, res) => {
    try {
      const intel = getStoredExamIntelligence(req.params.examId);
      if (!intel) return res.status(404).json({ error: "No intelligence stored for this exam" });
      res.json(intel);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to retrieve exam intelligence" });
    }
  });

  // 3. Official Source Registry endpoints
  app.get("/api/registry", (req, res) => {
    try {
      const registry = getRegistry();
      res.json(registry);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to retrieve registry" });
    }
  });

  app.post("/api/registry", (req, res) => {
    try {
      const newOrUpdated: OfficialSourceRegistryRecord = req.body;
      if (!newOrUpdated.authority_id || !newOrUpdated.official_domain) {
        return res.status(400).json({ error: "authority_id and official_domain are required" });
      }

      const current = getRegistry();
      const existingIndex = current.findIndex(r => r.authority_id === newOrUpdated.authority_id);
      
      if (existingIndex >= 0) {
        current[existingIndex] = {
          ...current[existingIndex],
          ...newOrUpdated,
          verified_at: new Date().toISOString(),
        };
      } else {
        current.push({
          ...newOrUpdated,
          verified_at: new Date().toISOString(),
          status: newOrUpdated.status || 'ACTIVE',
        });
      }

      saveRegistry(current);
      res.json({ success: true, registry: current });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update registry" });
    }
  });

  // 4. Research Runs History & Comparison
  app.get("/api/runs", (req, res) => {
    try {
      const runs = getRuns();
      res.json(runs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch runs" });
    }
  });

  app.delete("/api/runs", (req, res) => {
    try {
      saveRuns([]);
      res.json({ success: true, message: "History cleared" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================
  // 5. PREVIOUS-YEAR QUESTION (PYQ) ENGINE ENDPOINTS
  // ==========================================

  // Papers
  app.get("/api/pyq/papers", (req, res) => {
    try {
      const examId = req.query.examId as string | undefined;
      const papers = getPreviousPapers(examId);
      res.json(papers);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch previous papers" });
    }
  });

  app.get("/api/pyq/papers/:id", (req, res) => {
    try {
      const paper = getPaperById(req.params.id);
      if (!paper) return res.status(404).json({ error: "Paper not found" });
      res.json(paper);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch paper" });
    }
  });

  app.post("/api/pyq/papers", (req, res) => {
    try {
      const paper = registerPreviousPaper(req.body);
      res.json(paper);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to register paper" });
    }
  });

  app.post("/api/pyq/papers/:id/link-answers", async (req, res) => {
    try {
      const result = await linkAnswerKeyToPaper(req.params.id, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to link answer keys" });
    }
  });

  app.post("/api/pyq/papers/:id/analyse", async (req, res) => {
    try {
      const questions = getPYQQuestions({ paper_id: req.params.id });
      const qIds = questions.map(q => q.pyq_question_id);
      const analysed = await analyseQuestionBatch(qIds);
      res.json({ success: true, count: analysed.length, questions: analysed });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to analyse questions" });
    }
  });

  // Questions
  app.get("/api/pyq/questions", (req, res) => {
    try {
      const filter = {
        exam_id: req.query.examId as string | undefined,
        paper_id: req.query.paperId as string | undefined,
        subject: req.query.subject as string | undefined,
        topic: req.query.topic as string | undefined,
        question_type: req.query.questionType as string | undefined,
        difficulty: req.query.difficulty as string | undefined,
        static_or_current: req.query.staticOrCurrent as string | undefined,
        search: req.query.search as string | undefined,
      };
      const questions = getPYQQuestions(filter);
      res.json(questions);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch questions" });
    }
  });

  app.get("/api/pyq/questions/:id", (req, res) => {
    try {
      const q = getPYQQuestionById(req.params.id);
      if (!q) return res.status(404).json({ error: "Question not found" });
      res.json(q);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch question" });
    }
  });

  app.post("/api/pyq/questions/:id/review", (req, res) => {
    try {
      const reviewed = reviewPYQQuestion(req.params.id, req.body);
      res.json(reviewed);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to record auditor review" });
    }
  });

  // Intelligence Profile & Trends
  app.get("/api/pyq/intelligence/:examId", (req, res) => {
    try {
      const intel = getExamIntelligence(req.params.examId);
      if (!intel) return res.status(404).json({ error: "Intelligence profile not found" });
      res.json(intel);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch exam intelligence" });
    }
  });

  app.post("/api/pyq/intelligence/:examId/recalculate", (req, res) => {
    try {
      const intel = buildExamIntelligenceProfile(req.params.examId);
      res.json(intel);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to calculate intelligence profile" });
    }
  });

  // Clusters
  app.get("/api/pyq/clusters/:examId", (req, res) => {
    try {
      const clusters = getPYQClusters(req.params.examId);
      res.json(clusters);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch clusters" });
    }
  });

  // Readiness
  app.get("/api/pyq/readiness/:examId", (req, res) => {
    try {
      const readiness = getExamIntelligenceReadiness(req.params.examId);
      res.json(readiness);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to evaluate PYQ readiness" });
    }
  });

  app.get("/api/pyq/runs", (req, res) => {
    try {
      const runs = getAnalysisRuns(req.query.examId as string | undefined);
      res.json(runs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch analysis runs" });
    }
  });

  // ==========================================
  // EVIDENCE-BASED MOCK BLUEPRINT ENGINE API
  // ==========================================

  // List blueprints (filter by examId)
  app.get("/api/blueprints", async (req, res) => {
    try {
      const examId = req.query.exam_id as string | undefined;
      if (getPersistenceBackend() === 'DATABASE') {
        const bps = await getRepositoryRegistry().blueprints.getBlueprints(examId);
        return res.json(bps);
      }
      const blueprints = getStoredBlueprints(examId);
      res.json(blueprints);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch blueprints" });
    }
  });

  // Get blueprint by ID
  app.get("/api/blueprints/:id", async (req, res) => {
    try {
      let bp = getBlueprintById(req.params.id);
      if (!bp && getPersistenceBackend() === 'DATABASE') {
        bp = (await getRepositoryRegistry().blueprints.getBlueprintById(req.params.id)) || undefined;
      }
      if (!bp) return res.status(404).json({ error: "Blueprint not found" });
      res.json(bp);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch blueprint" });
    }
  });

  // Create new blueprint
  app.post("/api/blueprints", async (req, res) => {
    try {
      const blueprint = await createMockBlueprint(req.body);
      if (getPersistenceBackend() === 'DATABASE') {
        await getRepositoryRegistry().blueprints.saveBlueprint(blueprint);
      }
      res.status(201).json(blueprint);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to generate blueprint" });
    }
  });

  // Re-validate blueprint
  app.post("/api/blueprints/:id/validate", async (req, res) => {
    try {
      let bp = getBlueprintById(req.params.id);
      if (!bp && getPersistenceBackend() === 'DATABASE') {
        bp = (await getRepositoryRegistry().blueprints.getBlueprintById(req.params.id)) || undefined;
      }
      if (!bp) return res.status(404).json({ error: "Blueprint not found" });
      const audit_result = validateBlueprint(bp);
      bp.audit_result = audit_result;
      if (getPersistenceBackend() === 'DATABASE') {
        await getRepositoryRegistry().blueprints.saveBlueprint(bp);
      }
      res.json({ audit_result, overall_status: audit_result.overall_status });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to validate blueprint" });
    }
  });

  // Lock blueprint (enforces hard blockers)
  app.post("/api/blueprints/:id/lock", async (req, res) => {
    try {
      const auditor = req.body.auditor || "Senior Curriculum Auditor";
      let bp = getBlueprintById(req.params.id);
      if (!bp && getPersistenceBackend() === 'DATABASE') {
        bp = (await getRepositoryRegistry().blueprints.getBlueprintById(req.params.id)) || undefined;
        if (bp) saveBlueprintRecord(bp);
      }
      const result = lockBlueprintRecord(req.params.id, auditor);
      if (getPersistenceBackend() === 'DATABASE') {
        const lockedBp = getBlueprintById(req.params.id) || (await getRepositoryRegistry().blueprints.getBlueprintById(req.params.id));
        if (lockedBp) {
          lockedBp.status = 'BLUEPRINT_LOCKED';
          lockedBp.locked_by = auditor;
          lockedBp.locked_at = new Date().toISOString();
          await getRepositoryRegistry().blueprints.saveBlueprint(lockedBp);
        }
      }
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to lock blueprint" });
    }
  });

  // Auditor edit of slot or blueprint property
  app.post("/api/blueprints/:id/edit", (req, res) => {
    try {
      const result = recordAuditorBlueprintEdit(req.params.id, req.body);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to record auditor edit" });
    }
  });

  // Clone & Supersede locked blueprint
  app.post("/api/blueprints/:id/clone", (req, res) => {
    try {
      const reason = req.body.reason || "Auditor requested adjustments on locked blueprint";
      const auditor = req.body.auditor || "Curriculum Auditor";
      const cloned = cloneAndSupersedeBlueprint(req.params.id, reason, auditor);
      res.status(201).json(cloned);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to clone blueprint" });
    }
  });

  // Audit logs for a blueprint
  app.get("/api/blueprints/:id/audit-logs", (req, res) => {
    try {
      const logs = getStoredBlueprintAuditLogs(req.params.id);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch blueprint audit logs" });
    }
  });

  // Series summary & preview (for non-repeat and mock number detection)
  app.get("/api/blueprints/series-summary/:examId", (req, res) => {
    try {
      const test_mode = (req.query.test_mode as any) || "FULL_LENGTH";
      const subject_id = req.query.subject_id as string | undefined;
      const topic_id = req.query.topic_id as string | undefined;
      const prep_mode = req.query.preparation_mode as PreparationMode | undefined;
      const next_mock_number = getNextMockNumber(req.params.examId, test_mode, subject_id, topic_id, prep_mode);
      const summary = getSeriesLedgerSummary(req.params.examId, test_mode, next_mock_number, true, prep_mode);
      res.json({
        exam_id: req.params.examId,
        test_mode,
        next_mock_number,
        summary: {
          existing_final_mocks: summary.existing_final_mocks,
          questions_used: summary.questions_used,
          unique_facts_used: summary.unique_facts_used,
          fact_families_planned: summary.fact_families_planned,
          blocked_duplicates: summary.blocked_duplicates,
          uniqueness_pressure: summary.uniqueness_pressure,
          pressure_details: summary.pressure_details
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch series summary" });
    }
  });


  return app;
}
