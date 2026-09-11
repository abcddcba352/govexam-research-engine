import { buildExamResearchQuery } from './researchQuery.ts';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  ExamIdentification,
  OfficialSourceRegistryRecord,
  ResearchFact,
  ResearchMode,
  ResearchRunLog,
  ExamRecord,
  ExamStructureScheme,
  ExamStage,
  ExamStagePaper,
} from './types.ts';
import { ExamStructureExplorer } from './components/common/ExamStructureExplorer.tsx';
import { ModeSelector } from './components/ModeSelector.tsx';
import { ExamIdentificationCard } from './components/ExamIdentificationCard.tsx';
import { FactsDisplay } from './components/FactsDisplay.tsx';
import { TrustHierarchyLegend } from './components/TrustBadges.tsx';
import { RegistryView } from './components/RegistryView.tsx';
import { RunsComparisonView } from './components/RunsComparisonView.tsx';
import { DirectWebPanel } from './components/DirectWebPanel.tsx';
import { IntakeScreen } from './components/IntakeScreen.tsx';
import {
  Search,
  Sparkles,
  Database,
  BarChart3,
  History,
  ShieldCheck,
  Key,
  Zap,
  ArrowRight,
  BookOpen,
  Building2,
  RefreshCw,
  Layers,
  Award,
  FileCheck2,
  HelpCircle,
  Brain,
  ChevronDown
} from 'lucide-react';
import { CleanMockStudio } from './components/CleanMockStudio.tsx';

// These audit workspaces are only needed after the user changes tabs. Loading
// them on demand keeps the research/intake screen responsive on slower devices.
const CurrentAffairsDesk = lazy(() => import('./components/CurrentAffairsDesk.tsx').then(m => ({ default: m.CurrentAffairsDesk })));
const ResearchCoverageDesk = lazy(() => import('./components/ResearchCoverageDesk.tsx').then(m => ({ default: m.ResearchCoverageDesk })));
const MocksScreen = lazy(() => import('./components/MocksScreen.tsx').then(m => ({ default: m.MocksScreen })));
const DuplicateLedgerScreen = lazy(() => import('./components/DuplicateLedgerScreen.tsx').then(m => ({ default: m.DuplicateLedgerScreen })));
const SourcesScreen = lazy(() => import('./components/SourcesScreen.tsx').then(m => ({ default: m.SourcesScreen })));
const PYQIntelligenceScreen = lazy(() => import('./components/PYQIntelligenceScreen.tsx').then(m => ({ default: m.PYQIntelligenceScreen })));
const BlueprintStudioScreen = lazy(() => import('./components/BlueprintStudioScreen.tsx').then(m => ({ default: m.BlueprintStudioScreen })));
import { ConductingBoardExplorer } from './components/common/ConductingBoardExplorer.tsx';
import {
  INDIAN_STATES,
  CENTRAL_EXAM_PRESETS,
  isCentralExam,
  getExamState,
  filterExamsByJurisdiction,
  getBoardForExam
} from './utils/examJurisdiction.ts';

const COMMON_EXAM_PRESETS = [
  "TGPSC Group 2 Paper 1",
  "APPSC Group 2 Screening",
  "SSC CGL Tier 1",
  "RRB NTPC",
  "TNPSC Group 2",
  "Kerala PSC Degree Level",
  "UPPSC PCS Prelims",
  "UPSC Civil Services Prelims"
];

export default function App() {
  const getInitialTab = (): 'COVERAGE' | 'CURRENT_AFFAIRS' | 'INTAKE' | 'STUDIO' | 'COMPARE' | 'PYQ' | 'BLUEPRINT' | 'MOCKS' | 'LEDGER' | 'SOURCES' | 'LOGS' => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qTab = params.get('tab')?.toUpperCase();
      const validTabs = ['COVERAGE', 'CURRENT_AFFAIRS', 'INTAKE', 'STUDIO', 'COMPARE', 'PYQ', 'BLUEPRINT', 'MOCKS', 'LEDGER', 'SOURCES', 'LOGS'];
      if (qTab && validTabs.includes(qTab)) return qTab as any;
      const hash = window.location.hash.replace('#', '').toUpperCase();
      if (hash && validTabs.includes(hash)) return hash as any;
    }
    return 'STUDIO';
  };

  const [activeTab, setActiveTab] = useState<
    'COVERAGE' | 'CURRENT_AFFAIRS' | 'INTAKE' | 'STUDIO' | 'COMPARE' | 'PYQ' | 'BLUEPRINT' | 'MOCKS' | 'LEDGER' | 'SOURCES' | 'LOGS'
  >(getInitialTab);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [isGeminiKeysModalOpen, setIsGeminiKeysModalOpen] = useState(false);
  const [geminiKeyCount, setGeminiKeyCount] = useState<number>(0);

  const fetchGeminiKeyCount = async () => {
    try {
      const res = await fetch('/api/admin/gemini-keys');
      if (res.ok) {
        const data = await res.json();
        setGeminiKeyCount(data.total_configured || 0);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchGeminiKeyCount();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('tab')?.toUpperCase() !== activeTab) {
        url.searchParams.set('tab', activeTab);
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [activeTab]);
  const [examQuery, setExamQuery] = useState('');
  const [researchExamId, setResearchExamId] = useState<string | undefined>();
  const [selectedMode, setSelectedMode] = useState<ResearchMode>('HYBRID');
  const [jurisdictionTier, setJurisdictionTier] = useState<'CENTRAL' | 'STATE'>('STATE');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  
  // Direct Web inputs
  const [userUrls, setUserUrls] = useState<string[]>([]);
  const [documentText, setDocumentText] = useState('');
  const [documentName, setDocumentName] = useState('');

  // Execution states
  const [isResearching, setIsResearching] = useState(false);
  const [researchStage, setResearchStage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Results
  const [identification, setIdentification] = useState<ExamIdentification | null>(null);
  const [currentFacts, setCurrentFacts] = useState<ResearchFact[]>([]);
  const [currentRunLog, setCurrentRunLog] = useState<ResearchRunLog | null>(null);

  // Persistent server data
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const getInitialExamId = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('exam_id') || params.get('exam') || '';
    }
    return '';
  };
  const [selectedMockExamId, setSelectedMockExamId] = useState<string>(getInitialExamId);
  const [selectedPYQExamId, setSelectedPYQExamId] = useState<string>(getInitialExamId);
  const [selectedBlueprintExamId, setSelectedBlueprintExamId] = useState<string>(getInitialExamId);
  const [registry, setRegistry] = useState<OfficialSourceRegistryRecord[]>([]);
  const [runs, setRuns] = useState<ResearchRunLog[]>([]);

  // Benchmarking state
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  // Exam Selection Structure Scheme state
  const [structureScheme, setStructureScheme] = useState<ExamStructureScheme | null>(null);
  const [isLoadingStructure, setIsLoadingStructure] = useState<boolean>(false);
  const [showStructureExplorer, setShowStructureExplorer] = useState<boolean>(false);

  const handleFetchStructure = async (queryToFetch?: string) => {
    const q = (queryToFetch || examQuery || '').trim();
    if (!q) return;
    setIsLoadingStructure(true);
    setShowStructureExplorer(true);
    try {
      const res = await fetch('/api/research/exam-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.structure) {
          setStructureScheme(data.structure);
        }
      }
    } catch (err) {
      console.error('Failed to fetch exam structure:', err);
    } finally {
      setIsLoadingStructure(false);
    }
  };

  // Fetch initial data from server
  useEffect(() => {
    fetchExams();
    fetchRegistry();
    fetchRuns();
  }, []);

  // Automatically clear transient global errors when switching navigation tabs
  useEffect(() => {
    setErrorMsg(null);
  }, [activeTab]);

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/exams');
      if (res.ok) {
        const data = await res.json();
        setExams(data);
        if (data.length > 0) {
          const target = data.find((e: any) => e.exam_id === 'appsc_group_2_screening') || data.find((e: any) => e.exam_id.includes('group_2')) || data[0];
          if (!selectedMockExamId) {
            setSelectedMockExamId(target.exam_id);
          }
          if (!selectedPYQExamId) {
            setSelectedPYQExamId(target.exam_id);
          }
          if (!selectedBlueprintExamId) {
            setSelectedBlueprintExamId(target.exam_id);
          }
        }
      }
    } catch (e) {
      console.error("Failed to load exams", e);
    }
  };

  const fetchRegistry = async () => {
    try {
      const res = await fetch('/api/registry');
      if (res.ok) {
        const data = await res.json();
        setRegistry(data);
      }
    } catch (e) {
      console.error("Failed to load registry", e);
    }
  };

  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/runs');
      if (res.ok) {
        const data = await res.json();
        setRuns(data);

      }
    } catch (e) {
      console.error("Failed to load runs", e);
    }
  };

  const handleUpdateRegistry = async (record: OfficialSourceRegistryRecord) => {
    const res = await fetch('/api/registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    if (res.ok) {
      const result = await res.json();
      setRegistry(result.registry);
    }
  };

  // Main Research Trigger
  const handleStartResearch = async (overrideMode?: ResearchMode, overrideQuery?: string, overrideExamId?: string) => {
    const queryToUse = (overrideQuery ?? examQuery).trim();
    const examIdToUse = overrideQuery !== undefined ? overrideExamId : researchExamId;
    const modeToUse = overrideMode || selectedMode;
    if (!queryToUse) return;

    setIsResearching(true);
    setErrorMsg(null);
    setCurrentRunLog(null);
    setIdentification(null);
    setCurrentFacts([]);
    setResearchStage('Phase 1: Identifying commission, stage, paper, and cycle...');

    try {
      setResearchStage(`Researching ${modeToUse} sources for the selected examination...`);

      // Step 2: Execute actual research run
      const runRes = await fetch('/api/research/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_query: queryToUse,
          exam_id: examIdToUse,
          research_mode: modeToUse,
          user_provided_urls: userUrls,
          uploaded_document_text: documentText,
          uploaded_document_name: documentName,
        }),
      });

      if (!runRes.ok) {
        if (runRes.status === 429) {
          setErrorMsg("The AI quota is unavailable. Direct, PDF, archive, PYQ, and source-discovery results are still shown; unsupported fields remain blocked.");
          return;
        }
        const errData = await runRes.json().catch(() => ({} as any));
        const errMsg = errData.error || (runRes.status === 503 ? "The research service is temporarily unavailable. Please retry." : `Research execution failed on server (HTTP ${runRes.status})`);
        throw new Error(errMsg);
      }

      const runData: ResearchRunLog = await runRes.json();
      setCurrentRunLog(runData);
      setIdentification(runData.identification);
      if (runData.identification?.structure_scheme) {
        setStructureScheme(runData.identification.structure_scheme);
      }
      setCurrentFacts(runData.facts);

      // Refresh runs list
      const refreshedRuns = await fetch('/api/runs');
      if (refreshedRuns.ok) setRuns(await refreshedRuns.json());
      await fetchExams();
    } catch (err: any) {
      console.error("Research error:", err);
      const msg = String(err?.message || err);
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.toLowerCase().includes("quota")) {
        setErrorMsg("The AI quota is unavailable. Direct, PDF, archive, PYQ, and source-discovery results are still shown; unsupported fields remain blocked.");
      } else {
        setErrorMsg(msg || "An unexpected error occurred during research.");
      }
    } finally {
      setIsResearching(false);
      setResearchStage('');
    }
  };

  // Sequential 3-Mode Benchmark Runner
  const handleRunBenchmark = async () => {
    if (!examQuery.trim()) return;
    setIsBenchmarking(true);
    setErrorMsg(null);

    const modes: ResearchMode[] = ['DIRECT_WEB', 'HYBRID', 'GOOGLE_API'];
    try {
      for (const m of modes) {
        setResearchStage(`Benchmarking Mode: ${m}...`);
        await fetch('/api/research/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exam_query: examQuery.trim(),
            research_mode: m,
            user_provided_urls: userUrls,
            uploaded_document_text: documentText,
            uploaded_document_name: documentName,
          }),
        });
      }
      await fetchRuns();
      setActiveTab('COMPARE');
    } catch (err: any) {
      setErrorMsg(`Benchmark failed: ${err.message}`);
    } finally {
      setIsBenchmarking(false);
      setResearchStage('');
    }
  };

  const handleSelectRunFromHistory = (run: ResearchRunLog) => {
    setCurrentRunLog(run);
    setExamQuery(run.query_input);
    const matchedExam = exams.find(e => e.exam_id === run.exam_id);
    if (matchedExam) {
      if (isCentralExam(matchedExam)) {
        setJurisdictionTier('CENTRAL');
      } else {
        setJurisdictionTier('STATE');
        const st = getExamState(matchedExam);
        if (st) setSelectedState(st);
      }
      const board = getBoardForExam(matchedExam);
      if (board) setSelectedBoardId(board.id);
    }
    setResearchExamId(matchedExam ? run.exam_id : undefined);
    setSelectedMode(run.research_mode);
    setIdentification(run.identification);
    setCurrentFacts(run.facts);
    setActiveTab('STUDIO');
  };

  const handleLaunchResearchFromIntake = (query: string, mode: ResearchMode, examId?: string) => {
    const selectedExam = exams.find(exam => exam.exam_id === examId);
    if (selectedExam) {
      if (isCentralExam(selectedExam)) {
        setJurisdictionTier('CENTRAL');
      } else {
        setJurisdictionTier('STATE');
        const st = getExamState(selectedExam);
        if (st) setSelectedState(st);
      }
      const board = getBoardForExam(selectedExam);
      if (board) setSelectedBoardId(board.id);
    }
    const exactQuery = selectedExam ? buildExamResearchQuery(selectedExam) : query;
    setExamQuery(exactQuery);
    setResearchExamId(examId);
    setSelectedMode(mode);
    setActiveTab('STUDIO');
    void handleStartResearch(mode, exactQuery, examId);
  };

  const handleNavigateToMocksFromIntake = (examId: string) => {
    setSelectedMockExamId(examId);
    setActiveTab('MOCKS');
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-900 flex flex-col font-sans antialiased">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Varadhi Exam Studio
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Admin Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                High-Fidelity Mock Test Generation & PYQ Question Bank for Varadhi
              </p>
            </div>
          </div>

          {/* Clean Navigation Bar */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto">
            {/* 1. MOCK GENERATOR (DEFAULT & PRIMARY) */}
            <button
              type="button"
              id="nav-studio-btn"
              onClick={() => setActiveTab('STUDIO')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'STUDIO'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>⚡ Mock Generator</span>
            </button>

            {/* 2. EXAM INTAKE */}
            <button
              type="button"
              id="nav-intake-btn"
              onClick={() => setActiveTab('INTAKE')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'INTAKE'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Exam Intake</span>
            </button>

            {/* 3. PAST PAPERS & PYQ */}
            <button
              type="button"
              id="nav-pyq-btn"
              onClick={() => setActiveTab('PYQ')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'PYQ'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Past Papers (PYQ)</span>
            </button>

            {/* 4. ADVANCED AUDIT TOOLS TOGGLE */}
            <button
              type="button"
              id="nav-advanced-toggle-btn"
              onClick={() => setShowAdvancedTools(!showAdvancedTools)}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap border ${
                showAdvancedTools || ['BLUEPRINT', 'MOCKS', 'COVERAGE', 'CURRENT_AFFAIRS', 'COMPARE', 'LEDGER', 'SOURCES', 'LOGS'].includes(activeTab)
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-800 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Advanced Tools</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedTools ? 'rotate-180' : ''}`} />
            </button>
          </nav>
        </div>

        {/* Optional Secondary Ribbon for Advanced Curriculum Tools */}
        {(showAdvancedTools || ['BLUEPRINT', 'MOCKS', 'COVERAGE', 'CURRENT_AFFAIRS', 'COMPARE', 'LEDGER', 'SOURCES', 'LOGS'].includes(activeTab)) && (
          <div className="bg-slate-50 border-t border-slate-200/80 px-4 sm:px-6 py-2 overflow-x-auto animate-in fade-in">
            <div className="max-w-7xl mx-auto flex items-center gap-1 text-[11px] font-medium text-slate-600">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Audit Suite:</span>
              <button
                type="button"
                onClick={() => setActiveTab('MOCKS')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${activeTab === 'MOCKS' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200'}`}
              >
                Master Papers & Audit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedBlueprintExamId && exams.length > 0) setSelectedBlueprintExamId(exams[0].exam_id);
                  setActiveTab('BLUEPRINT');
                }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${activeTab === 'BLUEPRINT' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200'}`}
              >
                Blueprint Engine
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('COVERAGE')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${activeTab === 'COVERAGE' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200'}`}
              >
                Syllabus Coverage
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CURRENT_AFFAIRS')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${activeTab === 'CURRENT_AFFAIRS' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200'}`}
              >
                Current Affairs Desk
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('LEDGER')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${activeTab === 'LEDGER' ? 'bg-amber-600 text-white font-bold' : 'hover:bg-slate-200'}`}
              >
                Duplicate Ledger
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SOURCES')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${activeTab === 'SOURCES' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200'}`}
              >
                Sources & Registry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('LOGS')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${activeTab === 'LOGS' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200'}`}
              >
                Logs ({runs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('COMPARE')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${activeTab === 'COMPARE' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200'}`}
              >
                Compare Modes
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Error notification */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="font-bold ml-2">×</button>
          </div>
        )}

        <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading workspace…</div>}>
        {activeTab === 'CURRENT_AFFAIRS' && <CurrentAffairsDesk exams={exams} />}
        {activeTab === 'COVERAGE' && <ResearchCoverageDesk exams={exams} />}

        {/* SCREEN 1: EXAM INTAKE WORKFLOW */}
        {activeTab === 'INTAKE' && (
          <IntakeScreen
            exams={exams}
            onIntakeCreated={(newExam) => {
              setExams(prev => [newExam, ...prev]);
            }}
            onRefreshExams={fetchExams}
            onLaunchResearch={handleLaunchResearchFromIntake}
            onNavigateToMocks={handleNavigateToMocksFromIntake}
          />
        )}

        {/* SCREEN: CLEAN ADMIN MOCK GENERATOR STUDIO (FOR VARADHI) */}
        {activeTab === 'STUDIO' && (
          <CleanMockStudio
            exams={exams}
            initialExamId={selectedMockExamId}
            onNavigateToAdvanced={() => {
              setShowAdvancedTools(true);
              setActiveTab('MOCKS');
            }}
          />
        )}

        {/* SCREEN 3: COMPARE APPROACHES */}
        {activeTab === 'COMPARE' && (
          <RunsComparisonView
            runs={runs}
            onSelectRun={handleSelectRunFromHistory}
            onRunBenchmark={handleRunBenchmark}
            isBenchmarking={isBenchmarking}
          />
        )}

        {/* SCREEN: PYQ INTELLIGENCE ENGINE */}
        {activeTab === 'PYQ' && (
          <PYQIntelligenceScreen
            exams={exams}
            selectedExamId={selectedPYQExamId || exams[0]?.exam_id || 'tgpsc_group2_paper1'}
            onSelectExam={(id) => {
              setSelectedPYQExamId(id);
              fetchExams();
            }}
          />
        )}

        {/* SCREEN: EVIDENCE-BASED MOCK BLUEPRINT ENGINE */}
        {activeTab === 'BLUEPRINT' && (
          <BlueprintStudioScreen
            exams={exams}
            selectedExamId={selectedBlueprintExamId || exams[0]?.exam_id || 'tgpsc_group2_paper1'}
            onSelectExam={(id) => setSelectedBlueprintExamId(id)}
            onNavigateToMocks={(bpId) => {
              setSelectedMockExamId(selectedBlueprintExamId || exams[0]?.exam_id);
              setActiveTab('MOCKS');
            }}
            onNavigateToCoverage={() => setActiveTab('COVERAGE')}
          />
        )}

        {/* SCREEN 4: MOCK TESTS EXPERT */}
        {activeTab === 'MOCKS' && (
          <MocksScreen
            exams={exams}
            initialExamId={selectedMockExamId}
            onNavigateToLedger={() => setActiveTab('LEDGER')}
            onLaunchResearch={(query, mode) => handleLaunchResearchFromIntake(query, mode)}
          />
        )}

        {/* SCREEN 5: DUPLICATE LEDGER */}
        {activeTab === 'LEDGER' && (
          <DuplicateLedgerScreen />
        )}

        {/* SCREEN 6: SOURCES & REGISTRY */}
        {activeTab === 'SOURCES' && (
          <SourcesScreen />
        )}

        {/* SCREEN 7: RUN AUDIT LOG */}
        {activeTab === 'LOGS' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Historical Research Runs Log (research_runs)
                </h2>
                <p className="text-xs text-slate-500">
                  Comprehensive audit record of every research attempt and verification metric
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm("Clear research runs history?")) {
                    await fetch('/api/runs', { method: 'DELETE' });
                    fetchRuns();
                  }
                }}
                className="text-xs text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
              >
                Clear History
              </button>
            </div>

            <RunsComparisonView
              runs={runs}
              onSelectRun={handleSelectRunFromHistory}
              onRunBenchmark={handleRunBenchmark}
              isBenchmarking={isBenchmarking}
            />
          </div>
        )}
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>Varadhi Exam Studio • Admin Content & Test Generation Platform</span>
          <span className="text-[11px] text-slate-400">
            Syllabus Governed • Direct Varadhi Export
          </span>
        </div>
      </footer>
    </div>
  );
}
