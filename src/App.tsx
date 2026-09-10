import { buildExamResearchQuery } from './researchQuery.ts';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  ExamIdentification,
  OfficialSourceRegistryRecord,
  ResearchFact,
  ResearchMode,
  ResearchRunLog,
  ExamRecord,
} from './types.ts';
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
  Zap,
  ArrowRight,
  BookOpen,
  Building2,
  RefreshCw,
  Layers,
  Award,
  FileCheck2,
  HelpCircle,
  Brain
} from 'lucide-react';

// These audit workspaces are only needed after the user changes tabs. Loading
// them on demand keeps the research/intake screen responsive on slower devices.
const CurrentAffairsDesk = lazy(() => import('./components/CurrentAffairsDesk.tsx').then(m => ({ default: m.CurrentAffairsDesk })));
const ResearchCoverageDesk = lazy(() => import('./components/ResearchCoverageDesk.tsx').then(m => ({ default: m.ResearchCoverageDesk })));
const MocksScreen = lazy(() => import('./components/MocksScreen.tsx').then(m => ({ default: m.MocksScreen })));
const DuplicateLedgerScreen = lazy(() => import('./components/DuplicateLedgerScreen.tsx').then(m => ({ default: m.DuplicateLedgerScreen })));
const SourcesScreen = lazy(() => import('./components/SourcesScreen.tsx').then(m => ({ default: m.SourcesScreen })));
const PYQIntelligenceScreen = lazy(() => import('./components/PYQIntelligenceScreen.tsx').then(m => ({ default: m.PYQIntelligenceScreen })));
const BlueprintStudioScreen = lazy(() => import('./components/BlueprintStudioScreen.tsx').then(m => ({ default: m.BlueprintStudioScreen })));

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
  const [activeTab, setActiveTab] = useState<
    'COVERAGE' | 'CURRENT_AFFAIRS' | 'INTAKE' | 'STUDIO' | 'COMPARE' | 'PYQ' | 'BLUEPRINT' | 'MOCKS' | 'LEDGER' | 'SOURCES' | 'LOGS'
  >('INTAKE');
  const [examQuery, setExamQuery] = useState('TGPSC Group 2 Paper 1');
  const [researchExamId, setResearchExamId] = useState<string | undefined>();
  const [selectedMode, setSelectedMode] = useState<ResearchMode>('HYBRID');
  
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
  const [selectedMockExamId, setSelectedMockExamId] = useState<string>('');
  const [selectedPYQExamId, setSelectedPYQExamId] = useState<string>('');
  const [selectedBlueprintExamId, setSelectedBlueprintExamId] = useState<string>('');
  const [registry, setRegistry] = useState<OfficialSourceRegistryRecord[]>([]);
  const [runs, setRuns] = useState<ResearchRunLog[]>([]);

  // Benchmarking state
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  // Fetch initial data from server
  useEffect(() => {
    fetchExams();
    fetchRegistry();
    fetchRuns();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/exams');
      if (res.ok) {
        const data = await res.json();
        setExams(data);
        if (data.length > 0 && !selectedMockExamId) {
          const target = data.find((e: any) => e.exam_id.includes('endowment')) || data[0];
          setSelectedMockExamId(target.exam_id);
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
        if (data.length > 0 && !currentRunLog) {
          setCurrentRunLog(data[0]);
          setIdentification(data[0].identification);
          setCurrentFacts(data[0].facts);
        }
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
        throw new Error("Research execution failed on server");
      }

      const runData: ResearchRunLog = await runRes.json();
      setCurrentRunLog(runData);
      setIdentification(runData.identification);
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
    setResearchExamId(exams.some(e => e.exam_id === run.exam_id) ? run.exam_id : undefined);
    setSelectedMode(run.research_mode);
    setIdentification(run.identification);
    setCurrentFacts(run.facts);
    setActiveTab('STUDIO');
  };

  const handleLaunchResearchFromIntake = (query: string, mode: ResearchMode, examId?: string) => {
    const selectedExam = exams.find(exam => exam.exam_id === examId);
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
                  GovExam Curriculum & Exam Engine
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Admin Studio
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Curriculum Research • Blueprint Verification • Non-Repeat Duplicate Ledger
              </p>
            </div>
          </div>

          {/* Navigation Screens */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto">
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

            <button
              type="button"
              id="nav-studio-btn"
              onClick={() => setActiveTab('STUDIO')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'STUDIO'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Research Studio</span>
            </button>

            <button
              type="button"
              id="nav-compare-btn"
              onClick={() => setActiveTab('COMPARE')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'COMPARE'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Compare Modes</span>
            </button>

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
              <span>PYQ Intelligence</span>
            </button>

            <button
              type="button"
              id="nav-blueprint-btn"
              onClick={() => {
                if (!selectedBlueprintExamId && exams.length > 0) {
                  setSelectedBlueprintExamId(exams[0].exam_id);
                }
                setActiveTab('BLUEPRINT');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'BLUEPRINT'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Blueprint Engine</span>
            </button>

            <button
              type="button"
              id="nav-mocks-btn"
              onClick={() => setActiveTab('MOCKS')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'MOCKS'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Master Papers & Audit</span>
            </button>

            <button type="button" id="nav-coverage-btn" onClick={() => setActiveTab('COVERAGE')} className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab==='COVERAGE'?'bg-white text-indigo-700 font-bold shadow-sm':'text-slate-600'}`}>Syllabus Coverage</button>
            <button type="button" id="nav-current-affairs-btn" onClick={() => setActiveTab('CURRENT_AFFAIRS')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'CURRENT_AFFAIRS' ? 'bg-white text-indigo-700 font-bold shadow-sm' : 'text-slate-600'}`}>
              Current Affairs Desk
            </button>

            <button
              type="button"
              id="nav-ledger-btn"
              onClick={() => setActiveTab('LEDGER')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'LEDGER'
                  ? 'bg-white text-amber-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Duplicate Ledger</span>
            </button>

            <button
              type="button"
              id="nav-sources-btn"
              onClick={() => setActiveTab('SOURCES')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'SOURCES'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Sources & Registry</span>
            </button>

            <button
              type="button"
              id="nav-logs-btn"
              onClick={() => setActiveTab('LOGS')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'LOGS'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Logs ({runs.length})</span>
            </button>
          </nav>
        </div>
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

        {/* SCREEN 2: RESEARCH STUDIO */}
        {activeTab === 'STUDIO' && (
          <div className="space-y-6">
            {/* Input & Mode Selector Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
              {/* Common Exam Input Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="exam-query-input" className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    Target Examination Input
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Enter commission, paper, or short exam phrase
                  </span>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="exam-query-input"
                      type="text"
                      placeholder='e.g. "TGPSC Group 2 Paper 1" or "SSC CGL Tier 1"'
                      value={examQuery}
                      onChange={(e) => { setExamQuery(e.target.value); setResearchExamId(undefined); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isResearching) handleStartResearch();
                      }}
                      className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    id="execute-research-btn"
                    disabled={isResearching || !examQuery.trim()}
                    onClick={() => handleStartResearch()}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isResearching ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Researching...</span>
                      </>
                    ) : (
                      <>
                        <span>Research Examination</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Common Presets Chips */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">Presets:</span>
                  {COMMON_EXAM_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setExamQuery(preset);
                        setResearchExamId(undefined);
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        examQuery === preset
                          ? 'bg-blue-50 text-blue-800 border-blue-300 font-semibold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Research Mode Selector */}
              <div className="pt-3 border-t border-slate-100">
                <ModeSelector
                  mode={selectedMode}
                  onChange={setSelectedMode}
                  disabled={isResearching}
                />
              </div>

              {/* Optional Direct Web Attachment Panel */}
              <DirectWebPanel
                userUrls={userUrls}
                onChangeUrls={setUserUrls}
                documentText={documentText}
                onChangeDocumentText={setDocumentText}
                documentName={documentName}
                onChangeDocumentName={setDocumentName}
              />
            </div>

            {/* Research Progress State */}
            {isResearching && (
              <div className="bg-white border border-blue-200 rounded-2xl p-6 text-center space-y-3 shadow-sm animate-pulse">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="text-sm font-bold text-slate-900">{researchStage}</div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Adhering to strict protocol: Identifying entities first, searching official authority registry, and assigning Level 5 source trust.
                </p>
              </div>
            )}

            {/* Step 1: Examination Identification Result */}
            {identification && !isResearching && (
              <ExamIdentificationCard identification={identification} />
            )}

            {/* Source Trust Hierarchy Legend */}
            <TrustHierarchyLegend />

            {/* Step 2: Discovered Facts with Source Verification */}
            {(currentFacts.length > 0 || currentRunLog?.research_status === 'RESEARCH_PARTIAL_QUOTA_EXHAUSTED' || currentRunLog?.ui_message) && !isResearching && (
              <FactsDisplay
                facts={currentFacts}
                summaryNotes={currentRunLog?.summary_notes}
                researchMode={currentRunLog?.research_mode || selectedMode}
                researchStatus={currentRunLog?.research_status}
                unresolvedFacts={currentRunLog?.unresolved_facts}
                fallbackApplied={currentRunLog?.fallback_applied}
                uiMessage={currentRunLog?.ui_message}
              />
            )}

            {/* Active Run Telemetry Banner */}
            {currentRunLog && !isResearching && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <h3 className="font-bold text-sm">Collected sources ({currentRunLog.collected_sources?.length || 0})</h3>
                <p className="text-xs text-slate-600">Source collection and exam verification are separate. Video metadata and secondary material require review.</p>
                {currentRunLog.collected_sources?.map(source => <div key={source.url} className="text-sm">
                  <a href={source.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">{source.title}</a>
                  <span className="ml-2 text-xs text-slate-500">{source.kind} · {source.characters.toLocaleString()} characters</span>
                </div>)}
                <details><summary className="text-sm cursor-pointer">Collection diagnostics</summary>
                  <ul className="mt-3 space-y-2 text-xs">{currentRunLog.collection_diagnostics?.map((d,i) =>
                    <li key={i}><strong>{d.stage}: {d.status}</strong> — {d.target}<br />{d.detail}</li>)}</ul>
                </details>
              </div>
            )}
            {currentRunLog && !isResearching && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-slate-500">Run: {currentRunLog.run_id}</span>
                  <span><strong>Mode:</strong> {currentRunLog.research_mode}</span>
                  <span><strong>Duration:</strong> {(currentRunLog.duration_ms / 1000).toFixed(2)}s</span>
                  <span><strong>Tokens:</strong> {currentRunLog.Gemini_tokens}</span>
                  <span><strong>Search API Calls:</strong> {currentRunLog.Google_search_queries}</span>
                  <span><strong>Cost:</strong> ${currentRunLog.estimated_cost}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('COMPARE')}
                  className="text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  Compare with other modes <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
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
            onSelectExam={(id) => setSelectedPYQExamId(id)}
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
          <span>GovExam Mock Test Expert • Research Engine & Deduplication Architecture</span>
          <span className="font-mono text-[11px]">
            Mode A: Google API • Mode B: Direct Web • Mode C: Hybrid
          </span>
        </div>
      </footer>
    </div>
  );
}
