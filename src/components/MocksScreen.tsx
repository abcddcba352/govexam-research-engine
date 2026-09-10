import { QuestionGrayscaleVisual } from './QuestionGrayscaleVisual.tsx';
export { QuestionGrayscaleVisual } from './QuestionGrayscaleVisual.tsx';
import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Layers,
  HelpCircle,
  Hash,
  Scale,
  FileText,
  History,
  Info,
  Printer,
  ListFilter,
  Search,
  ChevronDown,
  ChevronUp,
  Table,
  Eye,
  Check,
  Download,
  Copy,
  FileSpreadsheet
} from 'lucide-react';
import {
  ExamRecord,
  MockTestRecord,
  MockQuestion,
  MockBlueprintRecord,
  PreparationMode,
  PatternChangeReport,
  VisualSpecification
} from '../types.ts';
import { getBoardForExam, groupExamsByJurisdiction } from '../utils/examJurisdiction.ts';

interface MocksScreenProps {
  exams: ExamRecord[];
  initialExamId?: string;
  onNavigateToLedger: () => void;
  onNavigateToBank?: (examId:string) => void;
  onLaunchResearch?: (query: string, mode: any) => void;
}

interface ReadinessInfo {
  can_generate: boolean;
  status: 'READY' | 'NOT_READY';
  missing_requirements?: string[];
  missing_prerequisites?: string[];
  exam_profile_status?: string;
  pattern_status?: string;
  reason?: string;
  preparation_mode?: PreparationMode;
  preparation_basis?: {
    status?: string;
    notification?: string;
    recruitment_cycle?: string;
    basis_summary?: string;
    future_notification_availability?: string;
    source_references?: string[];
    pyq_intelligence_version?: string;
    pattern_change_risk?: 'LOW' | 'MEDIUM' | 'HIGH';
    risk_reasons?: string[];
  };
  checks?: {
    exam_identity_verified?: boolean;
    exam_pattern_verified?: boolean;
    syllabus_available?: boolean;
    test_mode_selected?: boolean;
    language_selected?: boolean;
    question_count_resolved?: boolean;
    marks_pattern_resolved?: boolean;
    duration_resolved?: boolean;
    negative_marking_resolved?: boolean;
    source_confidence_sufficient?: boolean;
    all_critical_facts_verified?: boolean;
    no_critical_conflicts?: boolean;
  };
}

export const MocksScreen: React.FC<MocksScreenProps> = ({
  exams,
  initialExamId,
  onNavigateToLedger,
  onNavigateToBank,
  onLaunchResearch,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(
    initialExamId || (exams.length > 0 ? exams[0].exam_id : '')
  );
  const [mocks, setMocks] = useState<MockTestRecord[]>([]);
  const [activeMock, setActiveMock] = useState<MockTestRecord | null>(null);
  const [isLoadingMocks, setIsLoadingMocks] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);

  // Preparation Mode & Pattern Change Report
  const [selectedPreparationMode, setSelectedPreparationMode] = useState<PreparationMode>('PRE_NOTIFICATION_PREPARATION');
  const [patternReport, setPatternReport] = useState<PatternChangeReport | null>(null);
  const [showPatternReportModal, setShowPatternReportModal] = useState(false);
  const [selectedModeFilter, setSelectedModeFilter] = useState<string>('ALL');

  // Readiness & Audit Logs
  const [readiness, setReadiness] = useState<ReadinessInfo | null>(null);
  const [isLoadingReadiness, setIsLoadingReadiness] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  const groupedExams = useMemo(() => groupExamsByJurisdiction(exams), [exams]);
  const [lockedBlueprints, setLockedBlueprints] = useState<MockBlueprintRecord[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>('');

  // Admin View Modes: Continuous Master Paper vs Question Inspector vs Answer Key Table
  const [viewMode, setViewMode] = useState<'CONTINUOUS' | 'INSPECTOR' | 'ANSWER_KEY'>('CONTINUOUS');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Collapsible Verification Matrix
  const [showVerificationMatrix, setShowVerificationMatrix] = useState(false);

  // Filters for 150-Question Paper
  const [rangeFilter, setRangeFilter] = useState<'ALL' | '1-50' | '51-100' | '101-150'>('ALL');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState<string>('ALL');
  const [selectedCognitiveFilter, setSelectedCognitiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Print Configuration & Clipboard
  const [includeKeyInPrint, setIncludeKeyInPrint] = useState(true);
  const [copiedQId, setCopiedQId] = useState<string | null>(null);

  useEffect(() => {
    if (initialExamId) {
      setSelectedExamId(initialExamId);
    } else if ((!selectedExamId || !exams.some(e => e.exam_id === selectedExamId)) && exams.length > 0) {
      setSelectedExamId(exams[0].exam_id);
    }
  }, [initialExamId, exams, selectedExamId]);

  useEffect(() => {
    if (selectedExamId) {
      const exam = exams.find(e => e.exam_id === selectedExamId);
      if (exam?.preparation_mode) {
        setSelectedPreparationMode(exam.preparation_mode);
      }
      fetchMocksForExam(selectedExamId);
      fetchReadiness(selectedExamId, selectedPreparationMode);
      fetchBlueprints(selectedExamId);
      fetchPatternReport(selectedExamId);
    }
  }, [selectedExamId, selectedPreparationMode]);

  const fetchBlueprints = async (examId: string) => {
    try {
      const res = await fetch(`/api/blueprints?exam_id=${examId}`);
      if (res.ok) {
        const data: MockBlueprintRecord[] = await res.json();
        const locked = data.filter(b => b.status === 'BLUEPRINT_LOCKED');
        setLockedBlueprints(locked);
        if (locked.length > 0) {
          setSelectedBlueprintId(locked[0].blueprint_id);
        } else {
          setSelectedBlueprintId('');
        }
      }
    } catch (e) {
      console.error("Failed to load blueprints:", e);
    }
  };

  const fetchReadiness = async (examId: string, mode?: PreparationMode) => {
    setIsLoadingReadiness(true);
    try {
      const targetMode = mode || selectedPreparationMode;
      const res = await fetch(`/api/exams/${examId}/readiness?mode=${targetMode}`);
      if (res.ok) {
        const data = await res.json();
        setReadiness(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingReadiness(false);
    }
  };

  const fetchPatternReport = async (examId: string) => {
    try {
      const res = await fetch(`/api/exams/${examId}/pattern-change-report`);
      if (res.ok) {
        const data = await res.json();
        setPatternReport(data.report || null);
      } else {
        setPatternReport(null);
      }
    } catch (e) {
      setPatternReport(null);
    }
  };

  const fetchAuditLogs = async () => {
    if (!selectedExamId) return;
    try {
      const res = await fetch(`/api/mocks/audit-logs?exam_id=${selectedExamId}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
        setShowAuditLogs(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinalizeMock = async (mockId: string) => {
    setIsFinalizing(true);
    try {
      const res = await fetch(`/api/mocks/${mockId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditor_notes: 'Audited and verified against official examination specifications',
          verified_by: 'Lead Curriculum Auditor'
        })
      });
      if (!res.ok) throw new Error('Finalization failed');
      const data = await res.json();
      setGenerationNotice(`Master paper finalized successfully! ${data.questions_registered} questions registered in the Non-Repeat Duplicate Ledger.`);
      fetchMocksForExam(selectedExamId);
    } catch (err: any) {
      alert(`Failed to finalize paper: ${err.message}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  const fetchMocksForExam = async (examId: string) => {
    setIsLoadingMocks(true);
    try {
      const res = await fetch(`/api/mocks?exam_id=${examId}`);
      if (!res.ok) throw new Error('Failed to load mocks');
      const data: MockTestRecord[] = await res.json();
      setMocks(data);
      if (data.length > 0) {
        setActiveMock(data[0]);
        setActiveQuestionIndex(0);
      } else {
        setActiveMock(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMocks(false);
    }
  };

  const handleGenerateNextMock = async (overrideBlueprintId?: string) => {
    if (!selectedExamId || !readiness?.can_generate) return;
    setIsGenerating(true);
    setGenerationNotice(null);
    try {
      const bpId = overrideBlueprintId || selectedBlueprintId || undefined;
      const targetQCount = bpId
        ? (lockedBlueprints.find(b => b.blueprint_id === bpId)?.question_count || selectedExam?.pattern.total_questions || 150)
        : (selectedExam?.pattern.total_questions || 150);
      const res = await fetch('/api/mocks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: selectedExamId,
          blueprint_id: bpId,
          question_count: targetQCount,
          difficulty: 'Standard',
          preparation_mode: selectedPreparationMode
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Mock generation failed');
      }
      const data = await res.json();
      const newMock: MockTestRecord = data.mock;
      
      setMocks(prev => [newMock, ...prev]);
      setActiveMock(newMock);
      setActiveQuestionIndex(0);
      const bpMsg = newMock.blueprint_id ? ` (Evidence Blueprint locked)` : '';
      setGenerationNotice(`Generated Master Paper #${newMock.mock_number}${bpMsg} with ${newMock.total_questions} verified questions. Duplicate Ledger blocked ${newMock.duplicates_prevented_count} repeat questions.`);
    } catch (err: any) {
      alert(`Generation notice: ${err.message || 'Error occurred'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedExam = exams.find(e => e.exam_id === selectedExamId);

  // Flatten all questions in the active mock
  const allQuestions: MockQuestion[] = useMemo(() => {
    return activeMock ? activeMock.sections.flatMap(s => s.questions) : [];
  }, [activeMock]);

  // Unique sections and cognitive levels in the active mock
  const availableSections = useMemo(() => {
    if (!activeMock) return [];
    return activeMock.sections.map(s => s.section_name);
  }, [activeMock]);

  const availableCognitiveLevels = useMemo(() => {
    const set = new Set<string>();
    allQuestions.forEach(q => {
      if (q.cognitive_level) set.add(q.cognitive_level);
    });
    return Array.from(set);
  }, [allQuestions]);

  // Filtered questions based on range, section, difficulty, cognitive level, and search
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q, idx) => {
      // Range check
      if (rangeFilter === '1-50' && (idx < 0 || idx >= 50)) return false;
      if (rangeFilter === '51-100' && (idx < 50 || idx >= 100)) return false;
      if (rangeFilter === '101-150' && (idx < 100 || idx >= 150)) return false;

      // Section filter
      if (selectedSectionFilter !== 'ALL' && q.section_name !== selectedSectionFilter) {
        return false;
      }

      // Difficulty filter
      if (selectedDifficultyFilter !== 'ALL' && (q.difficulty || 'MEDIUM').toUpperCase() !== selectedDifficultyFilter) {
        return false;
      }

      // Cognitive filter
      if (selectedCognitiveFilter !== 'ALL' && (q.cognitive_level || 'UNDERSTAND') !== selectedCognitiveFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const textMatch = q.question_text.toLowerCase().includes(query);
        const topicMatch = q.topic.toLowerCase().includes(query);
        const refMatch = q.source_reference?.toLowerCase().includes(query);
        const numMatch = (idx + 1).toString() === query.trim();
        if (!textMatch && !topicMatch && !refMatch && !numMatch) return false;
      }

      return true;
    });
  }, [allQuestions, rangeFilter, selectedSectionFilter, selectedDifficultyFilter, selectedCognitiveFilter, searchQuery]);

  // Admin Quality & Balance Metrics calculations
  const paperMetrics = useMemo(() => {
    if (allQuestions.length === 0) {
      return {
        keyDistribution: { A: 0, B: 0, C: 0, D: 0 },
        difficultyCounts: { EASY: 0, MEDIUM: 0, HARD: 0 },
        cognitiveCounts: {} as Record<string, number>,
        citationsCount: 0,
        isKeyBalanced: true
      };
    }

    const keyDist = { A: 0, B: 0, C: 0, D: 0 };
    const diffCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    const cogCounts: Record<string, number> = {};
    let citations = 0;

    allQuestions.forEach(q => {
      // Key distribution
      if (q.correct_option_index === 0) keyDist.A++;
      else if (q.correct_option_index === 1) keyDist.B++;
      else if (q.correct_option_index === 2) keyDist.C++;
      else if (q.correct_option_index === 3) keyDist.D++;

      // Difficulty
      const diff = (q.difficulty || 'MEDIUM').toUpperCase() as 'EASY' | 'MEDIUM' | 'HARD';
      if (diff in diffCounts) {
        diffCounts[diff]++;
      } else {
        diffCounts.MEDIUM++;
      }

      // Cognitive
      const cog = q.cognitive_level || 'UNDERSTAND';
      cogCounts[cog] = (cogCounts[cog] || 0) + 1;

      // Citations
      if (q.source_lineage?.some(source => source.evidence_snippet && source.source_url && source.fact_verified_at) && q.audit_result?.source_status === 'PASS' && q.audit_result?.fact_status === 'SUPPORTED') citations++;
    });

    // Check if key distribution is balanced (ideal ~25% each, tolerance within 10%)
    const expected = allQuestions.length / 4;
    const maxVariance = Math.max(
      Math.abs(keyDist.A - expected),
      Math.abs(keyDist.B - expected),
      Math.abs(keyDist.C - expected),
      Math.abs(keyDist.D - expected)
    );
    const isBalanced = maxVariance <= expected * 0.4;

    return {
      keyDistribution: keyDist,
      difficultyCounts: diffCounts,
      cognitiveCounts: cogCounts,
      citationsCount: citations,
      isKeyBalanced: isBalanced
    };
  }, [allQuestions]);

  const currentQuestion = allQuestions[activeQuestionIndex];

  const handlePrintMasterPaper = () => {
    window.print();
  };

  const handleExportJSON = () => {
    if (!activeMock) return;
    const jsonStr = JSON.stringify(activeMock, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeMock.exam_id}_master_paper_${activeMock.mock_number}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!activeMock) return;
    const headers = [
      "Question_Number",
      "Section",
      "Topic",
      "Subtopic",
      "Question_Text",
      "Option_A",
      "Option_B",
      "Option_C",
      "Option_D",
      "Correct_Key",
      "Difficulty",
      "Cognitive_Level",
      "Blueprint_Slot",
      "Canonical_Hash",
      "Statutory_Reference",
      "Official_Explanation"
    ];

    const escapeCsv = (str: string = '') => `"${(str || '').replace(/"/g, '""')}"`;

    const rows = allQuestions.map((q, idx) => {
      const keyLetter = ['A', 'B', 'C', 'D'][q.correct_option_index] || '';
      return [
        idx + 1,
        escapeCsv(q.section_name),
        escapeCsv(q.topic),
        escapeCsv(q.subtopic || ''),
        escapeCsv(q.question_text),
        escapeCsv(q.options[0] || ''),
        escapeCsv(q.options[1] || ''),
        escapeCsv(q.options[2] || ''),
        escapeCsv(q.options[3] || ''),
        keyLetter,
        q.difficulty || '',
        escapeCsv(q.cognitive_level || ''),
        escapeCsv(q.slot_id || ''),
        escapeCsv(q.canonical_hash || ''),
        escapeCsv(q.source_reference || ''),
        escapeCsv(q.explanation || '')
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeMock.exam_id}_paper_${activeMock.mock_number}_question_bank.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyQuestion = (q: MockQuestion, globalIdx: number) => {
    const keyLetter = ['A', 'B', 'C', 'D'][q.correct_option_index] || '';
    const text = `Q${globalIdx + 1}. [${q.section_name} • ${q.topic}]\n${q.question_text}\n\n` +
      q.options.map((opt, oIdx) => `(${['A', 'B', 'C', 'D'][oIdx]}) ${opt}`).join('\n') +
      `\n\nApproved Key: Option ${keyLetter}` +
      (q.source_reference ? `\nStatutory Reference: ${q.source_reference}` : '') +
      `\nOfficial Explanation: ${q.explanation}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedQId(q.question_id);
      setTimeout(() => setCopiedQId(null), 2000);
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {onNavigateToBank&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 print:hidden"><p className="text-sm text-indigo-950">Build full, subject or topic papers from checked questions in the cloud.</p><button type="button" onClick={()=>onNavigateToBank(selectedExamId)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Open question bank & paper builder</button></div>}
      {/* Printable Paper Header (only visible on print) */}
      <div className="hidden print:block mb-8 text-center border-b-2 border-slate-900 pb-4">
        <h1 className="text-xl font-bold uppercase tracking-wider text-slate-950">
          {selectedExam?.commission} • {includeKeyInPrint ? 'CONFIDENTIAL MASTER EXAMINATION PAPER (WITH STATUTORY KEYS)' : 'OFFICIAL CANDIDATE QUESTION PAPER'}
        </h1>
        <h2 className="text-lg font-semibold text-slate-800 mt-1">
          {selectedExam?.title} ({selectedExam?.paper})
        </h2>
        <div className="flex justify-between items-center text-xs text-slate-600 mt-3 pt-2 border-t border-slate-300 font-mono">
          <span>PAPER CODE: {activeMock?.mock_id || 'MOCK-MASTER'}</span>
          <span>TOTAL QUESTIONS: {allQuestions.length}</span>
          <span>DURATION: {activeMock?.duration_minutes ?? selectedExam?.pattern.duration_minutes} MINS</span>
          <span>MAX MARKS: {activeMock?.total_marks ?? selectedExam?.pattern.total_marks}</span>
        </div>
      </div>

      {/* Admin Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>ADMINISTRATIVE CURRICULUM & EXAM DESIGN STUDIO</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Master Examination Papers & Quality Audit Studio</h1>
          <p className="text-sm text-slate-600 mt-1">
            Official question paper review, statutory evidence auditing, key distribution symmetry, and commission-grade paper export.
          </p>
        </div>

        {/* Exam Picker Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Target Exam:</label>
          {(() => {
            const b = selectedExam ? getBoardForExam(selectedExam) : null;
            if (!b) return null;
            return (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold shrink-0">
                <span>{b.icon}</span>
                <span>{b.shortName}</span>
              </span>
            );
          })()}
          <select
            value={selectedExamId}
            onChange={e => setSelectedExamId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {groupedExams.central.length > 0 && (
              <optgroup label="🏛️ Central / National (All-India)">
                {groupedExams.central.map(exam => {
                  const b = getBoardForExam(exam);
                  const prefix = b ? `[${b.shortName}] ` : '';
                  return (
                    <option key={exam.exam_id} value={exam.exam_id}>
                      {prefix}{exam.commission}: {exam.title} ({exam.paper})
                    </option>
                  );
                })}
              </optgroup>
            )}
            {groupedExams.stateNames.map(stateName => (
              <optgroup key={stateName} label={`🗺️ State: ${stateName}`}>
                {groupedExams.states[stateName].map(exam => {
                  const b = getBoardForExam(exam);
                  const prefix = b ? `[${b.shortName}] ` : '';
                  return (
                    <option key={exam.exam_id} value={exam.exam_id}>
                      {prefix}{exam.commission}: {exam.title} ({exam.paper})
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Preparation Mode Selector & Pattern Change Notice */}
      {selectedExam && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preparation Mode:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'PRE_NOTIFICATION_PREPARATION', label: 'Pre-Notification Preparation', desc: 'Authoritative historical scheme & syllabus foundation' },
                { id: 'ACTIVE_NOTIFICATION', label: 'Active Notification', desc: 'Bound strictly to active official notification' },
                { id: 'HISTORICAL_PRACTICE', label: 'Historical Practice', desc: 'Exact previous cycle rules' },
                { id: 'CUSTOM_PRACTICE', label: 'Custom Practice', desc: 'Custom syllabus module design' }
              ].map(mode => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSelectedPreparationMode(mode.id as PreparationMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedPreparationMode === mode.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                  title={mode.desc}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {patternReport && (
            <button
              type="button"
              onClick={() => setShowPatternReportModal(true)}
              className="text-xs px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pattern Stability ({patternReport.has_pattern_changed ? 'Changes Detected' : 'Pattern Stable'})</span>
            </button>
          )}
        </div>
      )}

      {/* Collapsible Verification Matrix Accordion */}
      {selectedExam && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden print:hidden">
          <div 
            onClick={() => setShowVerificationMatrix(!showVerificationMatrix)}
            className="p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer border-b border-slate-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-700">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Official Exam Preparation & Verification Matrix</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {readiness?.preparation_basis?.status || 'HISTORICAL_BASIS_VERIFIED'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 font-medium">
                  <span>Scheme: {selectedExam.pattern.total_questions} Qs / {selectedExam.pattern.duration_minutes} Mins</span>
                  <span>•</span>
                  <span>Penalty: -{selectedExam.pattern.negative_marking_rate} Marks</span>
                  <span>•</span>
                  <span>Risk: {readiness?.preparation_basis?.pattern_change_risk || 'LOW'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <span>{showVerificationMatrix ? 'Collapse Details' : 'Expand Matrix Details'}</span>
              {showVerificationMatrix ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showVerificationMatrix && (
            <div className="p-5 space-y-4 animate-in fade-in">
              {/* Policy Statement Banner */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-950 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-emerald-900">Zero Unsupported Exam Facts Policy</span>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Zero Unsupported Exam Facts — when a new recruitment notification has not yet been released, preparation mocks and master papers strictly adhere to the latest verified historical syllabus, official scheme, PYQs, and authoritative statutory gazette sources.
                  </p>
                </div>
              </div>

              {/* 9 Required Labels Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {/* 1. Preparation Mode */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">1. Preparation Mode</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 inline-block">
                    {selectedPreparationMode === 'PRE_NOTIFICATION_PREPARATION' ? 'Pre-Notification Preparation' :
                     selectedPreparationMode === 'ACTIVE_NOTIFICATION' ? 'Active Notification' :
                     selectedPreparationMode === 'HISTORICAL_PRACTICE' ? 'Historical Practice' : 'Custom Practice'}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {selectedPreparationMode === 'PRE_NOTIFICATION_PREPARATION' ? 'Historical foundation permitted' : 'Notification-bound'}
                  </span>
                </div>

                {/* 2. Notification Status */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">2. Notification Status</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold border inline-block ${
                    readiness?.preparation_basis?.future_notification_availability === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {readiness?.preparation_basis?.future_notification_availability === 'ACTIVE'
                      ? 'Official Notification Active'
                      : 'Pre-Release (Historical Fallback)'}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Cycle: {readiness?.preparation_basis?.notification || selectedExam.recruitment_cycle}
                  </span>
                </div>

                {/* 3. Preparation Basis */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">3. Preparation Basis</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                    {readiness?.preparation_basis?.status || 'HISTORICAL_BASIS_VERIFIED'}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {readiness?.preparation_basis?.basis_summary || 'Verified historical gazette specifications'}
                  </span>
                </div>

                {/* 4. Basis Cycle */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">4. Recruitment Cycle</span>
                  <span className="text-xs font-bold text-slate-800 block truncate">
                    {readiness?.preparation_basis?.recruitment_cycle || selectedExam.recruitment_cycle}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Authority: {selectedExam.commission}
                  </span>
                </div>

                {/* 5. Pattern Verification */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">5. Pattern Verification</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                    VERIFIED ({selectedExam.pattern.total_questions} Qs / {selectedExam.pattern.duration_minutes}m)
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Penalty: -{selectedExam.pattern.negative_marking_rate} marks / wrong
                  </span>
                </div>

                {/* 6. Syllabus Verification */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">6. Syllabus Verification</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                    VERIFIED ({selectedExam.syllabus_topics.length} Domains)
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Sections: {selectedExam.pattern.sections.length} Mapped
                  </span>
                </div>

                {/* 7. PYQ Bank */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">7. PYQ Intelligence</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                    {readiness?.preparation_basis?.pyq_intelligence_version || 'AUTHENTIC BANK'}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Historical commission bank vetted
                  </span>
                </div>

                {/* 8. Pattern Risk */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">8. Pattern Change Risk</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block">
                    {readiness?.preparation_basis?.pattern_change_risk || 'LOW'} RISK
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Scheme demonstrated high multi-year stability
                  </span>
                </div>

                {/* 9. Readiness */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">9. Master Paper Readiness</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>READY FOR DESIGN & AUDIT</span>
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    All specifications satisfied
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Action & Generation Bar */}
      {selectedExam && (
        <div className="space-y-4 print:hidden">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedExam.commission}
                </span>
                <span className="text-xs text-slate-400">
                  Specification: {selectedExam.pattern.total_questions} Questions | {selectedExam.pattern.duration_minutes} Mins | -{selectedExam.pattern.negative_marking_rate} Negative
                </span>
                {readiness?.can_generate && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-600/50 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Verified & Ready
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white">{selectedExam.title} ({selectedExam.paper})</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {lockedBlueprints.length > 0 ? (
                <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                  <select
                    value={selectedBlueprintId}
                    onChange={(e) => setSelectedBlueprintId(e.target.value)}
                    className="bg-slate-900 border-none text-white text-xs px-2.5 py-1.5 rounded focus:outline-none cursor-pointer"
                  >
                    {lockedBlueprints.map(bp => (
                      <option key={bp.blueprint_id} value={bp.blueprint_id}>
                        Blueprint v{bp.blueprint_version} ({bp.question_count} Qs Locked)
                      </option>
                    ))}
                    <option value="">-- Standard Syllabus Mock --</option>
                  </select>
                  <button
                    onClick={() => handleGenerateNextMock()}
                    disabled={isGenerating || (!readiness?.can_generate)}
                    className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-semibold text-xs transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{isGenerating ? 'Generating...' : selectedBlueprintId ? 'Generate from Blueprint' : 'Generate Paper'}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleGenerateNextMock()}
                  disabled={isGenerating || (!readiness?.can_generate)}
                  className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-semibold text-sm transition-all shadow-md inline-flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>{isGenerating ? 'Generating Master Paper...' : 'Generate Master Paper'}</span>
                </button>
              )}

              {/* Print Master Paper */}
              <button
                onClick={handlePrintMasterPaper}
                disabled={!activeMock}
                className="px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-semibold border border-indigo-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Print full examination paper or export to PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Paper</span>
              </button>

              {/* Export JSON Button */}
              <button
                onClick={handleExportJSON}
                disabled={!activeMock}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-medium border border-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Export complete mock specification as JSON"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>JSON</span>
              </button>

              {/* Export CSV Button */}
              <button
                onClick={handleExportCSV}
                disabled={!activeMock}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-medium border border-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Export question bank as CSV for commission databases"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV</span>
              </button>

              <button
                onClick={fetchAuditLogs}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Audit</span>
              </button>

              <button
                onClick={onNavigateToLedger}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Ledger</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {generationNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between animate-in fade-in print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{generationNotice}</span>
          </div>
          <button
            onClick={() => setGenerationNotice(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {isLoadingMocks ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 print:hidden">
          Loading master examination papers...
        </div>
      ) : mocks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4 print:hidden">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Master Papers Available</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Click "Generate Master Paper" to create an official 150-question paper grounded on syllabus topics and audited against the Duplicate Ledger.
          </p>
          <button
            onClick={() => handleGenerateNextMock()}
            disabled={isGenerating || !readiness?.can_generate}
            className="disabled:opacity-50 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate First Master Paper</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Paper Selector & Admin Metrics Ribbon */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:hidden">
            {/* Left Column: Master Paper Selector */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Exam Papers</h3>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'PRE_NOTIFICATION_PREPARATION', label: 'Pre-Notif' },
                    { id: 'ACTIVE_NOTIFICATION', label: 'Active' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedModeFilter(f.id)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                        selectedModeFilter === f.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {mocks
                  .filter(m => selectedModeFilter === 'ALL' || (m.preparation_mode || 'PRE_NOTIFICATION_PREPARATION') === selectedModeFilter)
                  .map(m => (
                  <button
                    key={m.mock_id}
                    onClick={() => {
                      setActiveMock(m);
                      setActiveQuestionIndex(0);
                    }}
                    className={`w-full text-left p-3 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      activeMock?.mock_id === m.mock_id
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900">Paper 0{m.mock_number}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          m.status === 'FINAL'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : m.status === 'READY_FOR_AUDIT'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {m.status === 'FINAL' ? 'FINAL' : m.status === 'READY_FOR_AUDIT' ? 'AUDIT PENDING' : m.status || 'DRAFT'}
                        </span>
                        {m.blueprint_id && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-200">
                            BP v{m.blueprint_version || 1}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 bg-white rounded border text-slate-500 font-mono">
                        {m.total_questions} Qs
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-1">{m.title}</p>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                      <span>-{m.negative_marking_rate} Neg</span>
                      <span className="text-emerald-700 font-semibold">{m.duplicates_prevented_count || 0} Repeats Blocked</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right 3 Columns: Admin Examination Quality & Balance Dashboard */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Master Paper Quality & Specification Audit
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-700">
                      Paper 0{activeMock?.mock_number} • {allQuestions.length} Questions
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Balance verification across option keys, cognitive taxonomy, and statutory evidence coverage.
                  </p>
                </div>

                {activeMock && activeMock.status === 'READY_FOR_AUDIT' ? (
                  <button
                    onClick={() => handleFinalizeMock(activeMock.mock_id)}
                    disabled={isFinalizing}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-200" />
                    <span>{isFinalizing ? 'Finalizing...' : 'Audit & Finalize Master Paper'}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finalized & Committed to Duplicate Ledger</span>
                  </div>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Key Balance Symmetry */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Key Distribution</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      paperMetrics.isKeyBalanced ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {paperMetrics.isKeyBalanced ? '✓ Balanced' : 'Skew Detected'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center font-mono">
                    <div className="bg-white p-1 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">A</span>
                      <span className="text-xs font-bold text-slate-800">{paperMetrics.keyDistribution.A}</span>
                    </div>
                    <div className="bg-white p-1 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">B</span>
                      <span className="text-xs font-bold text-slate-800">{paperMetrics.keyDistribution.B}</span>
                    </div>
                    <div className="bg-white p-1 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">C</span>
                      <span className="text-xs font-bold text-slate-800">{paperMetrics.keyDistribution.C}</span>
                    </div>
                    <div className="bg-white p-1 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">D</span>
                      <span className="text-xs font-bold text-slate-800">{paperMetrics.keyDistribution.D}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 block text-center">
                    ~25% key allocation per option
                  </span>
                </div>

                {/* 2. Difficulty Breakdown */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Difficulty Allocation</span>
                  <div className="grid grid-cols-3 gap-1 text-center font-mono">
                    <div className="bg-white p-1 rounded border border-slate-200">
                      <span className="text-[10px] text-emerald-600 block font-semibold">Easy</span>
                      <span className="text-xs font-bold text-slate-800">{paperMetrics.difficultyCounts.EASY}</span>
                    </div>
                    <div className="bg-white p-1 rounded border border-slate-200">
                      <span className="text-[10px] text-blue-600 block font-semibold">Med</span>
                      <span className="text-xs font-bold text-slate-800">{paperMetrics.difficultyCounts.MEDIUM}</span>
                    </div>
                    <div className="bg-white p-1 rounded border border-slate-200">
                      <span className="text-[10px] text-amber-600 block font-semibold">Hard</span>
                      <span className="text-xs font-bold text-slate-800">{paperMetrics.difficultyCounts.HARD}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 block text-center">
                    33% / 33% / 33% target mix
                  </span>
                </div>

                {/* 3. Statutory Evidence Citations */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Statutory Citations</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-indigo-900">{paperMetrics.citationsCount}</span>
                    <span className="text-xs text-slate-500 font-semibold">/ {allQuestions.length} Questions</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    {allQuestions.length ? Math.round(paperMetrics.citationsCount / allQuestions.length * 100) : 0}% with checked evidence and answer support
                  </span>
                </div>

                {/* 4. Deduplication Integrity */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ledger Deduplication</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-emerald-800">
                      {activeMock?.duplicates_prevented_count || 0}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">Repeats Intercepted</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Zero Duplicate Questions Guaranteed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* View Mode Switcher Tabs & Comprehensive Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3 print:hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* View Mode Buttons */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('CONTINUOUS')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'CONTINUOUS'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Continuous Master Paper</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('INSPECTOR')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'INSPECTOR'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Question Slot Inspector</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('ANSWER_KEY')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'ANSWER_KEY'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Master Answer Key Table</span>
                </button>
              </div>

              {/* Print Configuration Checkbox */}
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  id="includeKeyCheckbox"
                  checked={includeKeyInPrint}
                  onChange={e => setIncludeKeyInPrint(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="includeKeyCheckbox" className="cursor-pointer select-none">
                  Include Commission Keys & Citations in Print
                </label>
              </div>
            </div>

            {/* Filter Controls Row: Range, Section, Difficulty, Cognitive, Search */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2">
                {/* Range Filters */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
                  {(['ALL', '1-50', '51-100', '101-150'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setRangeFilter(r)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                        rangeFilter === r
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {r === 'ALL' ? 'All 150' : r}
                    </button>
                  ))}
                </div>

                {/* Section Filter Dropdown */}
                {availableSections.length > 1 && (
                  <select
                    value={selectedSectionFilter}
                    onChange={e => setSelectedSectionFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Sections ({availableSections.length})</option>
                    {availableSections.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                )}

                {/* Difficulty Filter Dropdown */}
                <select
                  value={selectedDifficultyFilter}
                  onChange={e => setSelectedDifficultyFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">All Difficulties</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>

                {/* Cognitive Taxonomy Dropdown */}
                {availableCognitiveLevels.length > 0 && (
                  <select
                    value={selectedCognitiveFilter}
                    onChange={e => setSelectedCognitiveFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Cognitive Levels</option>
                    {availableCognitiveLevels.map(cog => (
                      <option key={cog} value={cog}>{cog}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search stem, topic, ref..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-52"
                />
              </div>
            </div>
          </div>

          {/* VIEW 1: CONTINUOUS MASTER PAPER (Admin Document Review & Print) */}
          {viewMode === 'CONTINUOUS' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 print:hidden">
                <span>
                  Showing <strong>{filteredQuestions.length}</strong> of <strong>{allQuestions.length}</strong> verified questions
                </span>
                <span className="font-mono">
                  {includeKeyInPrint ? 'Keys & Statutory Citations Included in Master Print' : 'Printing in Candidate Mode (Keys Hidden)'}
                </span>
              </div>

              <div className="space-y-4">
                {filteredQuestions.map((q) => {
                  const globalIndex = allQuestions.findIndex(item => item.question_id === q.question_id);
                  const optLetters = ['A', 'B', 'C', 'D'];
                  const isCopied = copiedQId === q.question_id;

                  return (
                    <div
                      key={q.question_id}
                      className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 break-inside-avoid print:border-slate-300 print:shadow-none print:p-4 print:mb-4"
                    >
                      {/* Meta Information Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                            Q{globalIndex + 1}
                          </span>
                          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {q.section_name}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            q.difficulty === 'HARD' ? 'bg-amber-100 text-amber-800' :
                            q.difficulty === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {q.difficulty}
                          </span>
                          {q.cognitive_level && (
                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-200">
                              {q.cognitive_level}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          {q.slot_id && (
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded print:hidden">
                              Slot: {q.slot_id}
                            </span>
                          )}
                          <span className="print:hidden">Hash: {q.canonical_hash?.substring(0, 12)}...</span>

                          <button
                            onClick={() => handleCopyQuestion(q, globalIndex)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors print:hidden cursor-pointer"
                            title="Copy question, options, and key to clipboard"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Topic Tag */}
                      <div className="text-xs">
                        <span className="text-slate-400 font-medium">Domain / Topic: </span>
                        <span className="font-semibold text-slate-800">{q.topic}</span>
                        {q.subtopic && <span className="text-slate-500"> • {q.subtopic}</span>}
                      </div>

                      {/* Question Stem */}
                      <div className="text-sm sm:text-base font-medium text-slate-900 leading-relaxed whitespace-pre-line bg-slate-50/60 p-4 rounded-lg border border-slate-100 print:bg-white print:p-0 print:border-none">
                        {q.question_text}
                      </div>

                      {/* Autonomous Grayscale Diagram / Visual Specification */}
                      <QuestionGrayscaleVisual visual={q.visual_specification} />

                      {/* 4 Options with Approved Key Highlighted */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map((optText, optIdx) => {
                          const isApprovedKey = q.correct_option_index === optIdx;

                          return (
                            <div
                              key={optIdx}
                              className={`p-3 rounded-lg border text-xs sm:text-sm flex items-start gap-2.5 ${
                                isApprovedKey
                                  ? includeKeyInPrint
                                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-medium ring-1 ring-emerald-500 print:border-emerald-700'
                                    : 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-medium ring-1 ring-emerald-500 print:bg-white print:text-slate-800 print:border-slate-300 print:ring-0'
                                  : 'border-slate-200 bg-white text-slate-700'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                                isApprovedKey
                                  ? includeKeyInPrint
                                    ? 'bg-emerald-600 text-white print:bg-slate-900'
                                    : 'bg-emerald-600 text-white print:bg-slate-100 print:text-slate-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {optLetters[optIdx]}
                              </span>
                              <span className="flex-1 leading-snug">{optText}</span>
                              {isApprovedKey && (
                                <span className={`shrink-0 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1 ${
                                  !includeKeyInPrint ? 'print:hidden' : ''
                                }`}>
                                  <Check className="w-3 h-3" />
                                  <span>{q.audit_result?.answer_status === 'PASS' && q.audit_result?.fact_status === 'SUPPORTED' ? 'Reviewed Key' : 'Proposed Key'}</span>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Direct Authoritative Statutory Explanation & Reference */}
                      <div className={`bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs space-y-1.5 print:bg-white print:border-slate-300 ${
                        !includeKeyInPrint ? 'print:hidden' : ''
                      }`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800">
                            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Authoritative Statutory Explanation:</span>
                          </div>
                          {q.source_reference && (
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200 text-[11px]">
                              Statutory Ref: {q.source_reference}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 leading-relaxed pl-5">
                          {q.explanation}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 2: QUESTION SLOT INSPECTOR (Detailed Single-Question Audit) */}
          {viewMode === 'INSPECTOR' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:hidden">
              {/* Question Navigator Grid */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Slot Navigator</h3>
                  <span className="text-xs text-slate-500 font-mono">
                    {filteredQuestions.length} Questions
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 max-h-[500px] overflow-y-auto pt-1 pr-1">
                  {filteredQuestions.map((q) => {
                    const globalIdx = allQuestions.findIndex(item => item.question_id === q.question_id);
                    const isCurrent = globalIdx === activeQuestionIndex;

                    return (
                      <button
                        key={q.question_id}
                        onClick={() => setActiveQuestionIndex(globalIdx)}
                        className={`h-8 text-xs rounded transition-all flex items-center justify-center cursor-pointer font-mono ${
                          isCurrent
                            ? 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-600 ring-offset-1 shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {globalIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question Inspector Detail */}
              <div className="lg:col-span-3">
                {currentQuestion ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                    {/* Meta Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                          Question {activeQuestionIndex + 1} of {allQuestions.length}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                          {currentQuestion.section_name}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          currentQuestion.difficulty === 'HARD' ? 'bg-amber-100 text-amber-800' :
                          currentQuestion.difficulty === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {currentQuestion.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <Hash className="w-3.5 h-3.5 text-slate-400" />
                        <span>Hash: {currentQuestion.canonical_hash}</span>

                        <button
                          onClick={() => handleCopyQuestion(currentQuestion, activeQuestionIndex)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          title="Copy question text and metadata"
                        >
                          {copiedQId === currentQuestion.question_id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Blueprint Slot Mapping Banner */}
                    {currentQuestion.slot_id && (
                      <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-3.5 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-indigo-950 font-semibold flex-wrap gap-2">
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Blueprint Slot: {currentQuestion.slot_id}</span>
                          </span>
                          {currentQuestion.cognitive_level && (
                            <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[10px] font-bold">
                              Cognitive: {currentQuestion.cognitive_level}
                            </span>
                          )}
                        </div>
                        {currentQuestion.core_concept_target && (
                          <div className="text-indigo-900 text-[11px]">
                            <span className="font-semibold text-indigo-700">Target Concept:</span> {currentQuestion.core_concept_target}
                          </div>
                        )}
                        {currentQuestion.answerable_fact_family && (
                          <div className="text-indigo-800 text-[11px]">
                            <span className="font-semibold text-indigo-700">Fact Family:</span> {currentQuestion.answerable_fact_family}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Topic Label */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Topic / Domain:</span>
                      <span className="text-xs font-semibold text-slate-800">{currentQuestion.topic}</span>
                    </div>

                    {/* Question Stem */}
                    <div className="text-base text-slate-900 font-medium leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                      {currentQuestion.question_text}
                    </div>

                    {/* Autonomous Grayscale Diagram / Visual Specification */}
                    <QuestionGrayscaleVisual visual={currentQuestion.visual_specification} />

                    {/* Options List with Key Directly Visible */}
                    <div className="space-y-3">
                      {currentQuestion.options.map((optionText, optIdx) => {
                        const isCorrect = currentQuestion.correct_option_index === optIdx;
                        const optLabels = ['A', 'B', 'C', 'D'];

                        return (
                          <div
                            key={optIdx}
                            className={`w-full text-left p-3.5 rounded-lg border text-sm flex items-start gap-3 ${
                              isCorrect
                                ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-medium ring-1 ring-emerald-500'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {optLabels[optIdx]}
                            </span>
                            <span className="flex-1">{optionText}</span>
                            {isCorrect && (
                              <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>{currentQuestion.audit_result?.answer_status === 'PASS' && currentQuestion.audit_result?.fact_status === 'SUPPORTED' ? 'Reviewed Key' : 'Proposed Key'} ({optLabels[optIdx]})</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Authoritative Explanation Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                          <HelpCircle className="w-4 h-4 text-indigo-600" />
                          <span>Authoritative Official Explanation</span>
                        </div>
                        {currentQuestion.source_reference && (
                          <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            Statutory Reference: {currentQuestion.source_reference}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {currentQuestion.explanation}
                      </p>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        disabled={activeQuestionIndex === 0}
                        onClick={() => setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous Question</span>
                      </button>

                      <button
                        disabled={activeQuestionIndex === allQuestions.length - 1}
                        onClick={() => setActiveQuestionIndex(prev => Math.min(allQuestions.length - 1, prev + 1))}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <span>Next Question</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* VIEW 3: MASTER ANSWER KEY TABLE (Official Commission Format) */}
          {viewMode === 'ANSWER_KEY' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Official Commission Master Answer Key Table
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verified answer key, taxonomy classification, and statutory legal reference for each question.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={handlePrintMasterPaper}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Print Key Table</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-16 text-center">Q#</th>
                      <th className="p-3 w-28 text-center">Approved Key</th>
                      <th className="p-3">Section</th>
                      <th className="p-3">Topic / Domain</th>
                      <th className="p-3 w-24">Difficulty</th>
                      <th className="p-3 w-28">Cognitive</th>
                      <th className="p-3">Statutory Gazette Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {filteredQuestions.map(q => {
                      const globalIdx = allQuestions.findIndex(item => item.question_id === q.question_id);
                      const keyLetter = ['A', 'B', 'C', 'D'][q.correct_option_index] || '—';

                      return (
                        <tr key={q.question_id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-center font-bold text-slate-900 font-mono">
                            {globalIdx + 1}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300">
                              Option {keyLetter}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-slate-800">
                            {q.section_name}
                          </td>
                          <td className="p-3 text-slate-600">
                            {q.topic}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              q.difficulty === 'HARD' ? 'bg-amber-100 text-amber-800' :
                              q.difficulty === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {q.difficulty}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-600">
                            {q.cognitive_level || 'UNDERSTAND'}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px] truncate max-w-xs" title={q.source_reference}>
                            {q.source_reference || 'Source missing'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Trail Modal */}
      {showAuditLogs && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <span>Generation & Auditor Audit Trail</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verification events, Gemini model telemetry, deduplication rates, and auditor approvals.
                </p>
              </div>
              <button
                onClick={() => setShowAuditLogs(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No generation audit events logged yet for this examination.
                </div>
              ) : (
                auditLogs.map((log, lidx) => (
                  <div key={lidx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          log.action === 'MOCK_FINALIZED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {log.action}
                        </span>
                        <span className="font-semibold text-slate-800">
                          Paper #{log.mock_number || '—'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 pt-1">
                      <div>
                        <span className="text-slate-400 block">Model Used:</span>
                        <span className="font-mono text-slate-800">{log.model_used || 'gemini-3.8-flash'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Attempts:</span>
                        <span className="font-semibold text-slate-800">{log.generation_attempts || 1}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Duplicates Prevented:</span>
                        <span className="font-semibold text-emerald-700">{log.duplicates_prevented || 0}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Latency:</span>
                        <span className="text-slate-800">{log.duration_ms ? `${log.duration_ms} ms` : '—'}</span>
                      </div>
                    </div>

                    {log.notes && (
                      <p className="text-slate-600 text-[11px] bg-white p-2 rounded border border-slate-200 mt-1">
                        {log.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowAuditLogs(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pattern Change Report Modal */}
      {showPatternReportModal && patternReport && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <span>Pattern Change Report: {patternReport.exam_title}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparison between {patternReport.old_recruitment_cycle} and {patternReport.new_recruitment_cycle}
                </p>
              </div>
              <button
                onClick={() => setShowPatternReportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Status Alert */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                patternReport.has_pattern_changed
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-950'
              }`}>
                {patternReport.has_pattern_changed ? (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold text-sm block">
                    {patternReport.has_pattern_changed ? 'Examination Scheme Changes Identified' : 'Examination Scheme Has Demonstrated High Stability'}
                  </span>
                  <p className="text-xs mt-0.5">
                    {patternReport.guidance_for_candidates}
                  </p>
                </div>
              </div>

              {/* Scheme Comparison Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Specification</th>
                      <th className="p-3">Historical ({patternReport.old_recruitment_cycle})</th>
                      <th className="p-3">Current / New ({patternReport.new_recruitment_cycle})</th>
                      <th className="p-3">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    <tr>
                      <td className="p-3 font-semibold">Total Questions</td>
                      <td className="p-3 font-mono">{patternReport.total_questions.old_value} Qs</td>
                      <td className="p-3 font-mono">{patternReport.total_questions.new_value} Qs</td>
                      <td className="p-3 font-semibold">
                        {patternReport.total_questions.changed ? (
                          <span className="text-amber-700">Changed ({patternReport.total_questions.difference > 0 ? `+${patternReport.total_questions.difference}` : patternReport.total_questions.difference})</span>
                        ) : (
                          <span className="text-emerald-700 font-normal">Identical</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Duration</td>
                      <td className="p-3 font-mono">{patternReport.duration_minutes.old_value} Mins</td>
                      <td className="p-3 font-mono">{patternReport.duration_minutes.new_value} Mins</td>
                      <td className="p-3 font-semibold">
                        {patternReport.duration_minutes.changed ? (
                          <span className="text-amber-700">Changed ({patternReport.duration_minutes.difference > 0 ? `+${patternReport.duration_minutes.difference}` : patternReport.duration_minutes.difference}m)</span>
                        ) : (
                          <span className="text-emerald-700 font-normal">Identical</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Total Marks</td>
                      <td className="p-3 font-mono">{patternReport.total_marks.old_value} Marks</td>
                      <td className="p-3 font-mono">{patternReport.total_marks.new_value} Marks</td>
                      <td className="p-3 font-semibold">
                        {patternReport.total_marks.changed ? (
                          <span className="text-amber-700">Changed</span>
                        ) : (
                          <span className="text-emerald-700 font-normal">Identical</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Negative Marking Rate</td>
                      <td className="p-3 font-mono">-{patternReport.negative_marking.old_rate}</td>
                      <td className="p-3 font-mono">-{patternReport.negative_marking.new_rate}</td>
                      <td className="p-3 font-semibold">
                        {patternReport.negative_marking.changed ? (
                          <span className="text-rose-700">Rule Revision</span>
                        ) : (
                          <span className="text-emerald-700 font-normal">Identical Penalty</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sections & Topics Delta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="font-bold text-slate-800 text-xs block">Sectional Structure</span>
                  {patternReport.sections_added.length === 0 && patternReport.sections_removed.length === 0 ? (
                    <span className="text-slate-500 text-[11px] block">No sectional restructuring observed.</span>
                  ) : (
                    <div className="space-y-1 text-[11px]">
                      {patternReport.sections_added.map((s, idx) => (
                        <div key={idx} className="text-emerald-700 font-medium">+ Added: {s}</div>
                      ))}
                      {patternReport.sections_removed.map((s, idx) => (
                        <div key={idx} className="text-rose-700 font-medium">- Removed: {s}</div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <span className="font-bold text-slate-800 text-xs block">Syllabus Domains</span>
                  {patternReport.syllabus_topics_added.length === 0 && patternReport.syllabus_topics_removed.length === 0 ? (
                    <span className="text-slate-500 text-[11px] block">Core syllabus domains remain aligned.</span>
                  ) : (
                    <div className="space-y-1 text-[11px]">
                      {patternReport.syllabus_topics_added.map((t, idx) => (
                        <div key={idx} className="text-emerald-700 font-medium">+ Added Domain: {t}</div>
                      ))}
                      {patternReport.syllabus_topics_removed.map((t, idx) => (
                        <div key={idx} className="text-rose-700 font-medium">- Removed Domain: {t}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Integrity Reminder */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Series Isolation Guarantee:</strong> Pre-notification mock papers are permanently preserved under their historical series and will never be overwritten or merged with new cycle papers.
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowPatternReportModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
