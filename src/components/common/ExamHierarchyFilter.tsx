import React, { useMemo, useEffect, useState } from 'react';
import {
  Building2,
  MapPin,
  FileText,
  Layers,
  ChevronRight,
  Filter,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import type { ExamRecord, ExamStage, ExamStagePaper } from '../../types.ts';
import {
  isCentralExam,
  getExamState,
  getBoardForExam,
  getCleanExamTitle
} from '../../utils/examJurisdiction.ts';

export interface ExamHierarchyFilterProps {
  exams: ExamRecord[];
  selectedExamId: string;
  onSelectExam: (examId: string) => void;
  onPaperChange?: (stage: ExamStage | null, paper: ExamStagePaper | null) => void;
  title?: string;
  subtitle?: string;
  badgeLabel?: string;
  disabled?: boolean;
  extraControls?: React.ReactNode;
  showSpecsStrip?: boolean;
}

export const ExamHierarchyFilter: React.FC<ExamHierarchyFilterProps> = ({
  exams,
  selectedExamId,
  onSelectExam,
  onPaperChange,
  title = 'Examination & Paper Hierarchy Filter',
  subtitle = 'Filter down through the official structure: State ➔ Board ➔ Exam ➔ Stage ➔ Paper',
  badgeLabel = 'State ➔ Board ➔ Exam ➔ Stage ➔ Paper',
  disabled = false,
  extraControls,
  showSpecsStrip = true
}) => {
  // Current active exam object
  const currentExam = useMemo(() => {
    return exams.find(e => e.exam_id === selectedExamId) || exams[0];
  }, [exams, selectedExamId]);

  // Determine current exam's state & board
  const currentExamState = useMemo(() => {
    if (!currentExam) return 'Telangana';
    if (isCentralExam(currentExam)) return 'Central';
    return getExamState(currentExam) || currentExam.state_or_central || 'Telangana';
  }, [currentExam]);

  const currentExamBoardId = useMemo(() => {
    if (!currentExam) return '';
    const b = getBoardForExam(currentExam);
    return b?.id || currentExam.commission;
  }, [currentExam]);

  // Cascading Selection State
  const [selectedState, setSelectedState] = useState<string>(currentExamState);
  const [selectedBoardId, setSelectedBoardId] = useState<string>(currentExamBoardId);
  const [selectedExamTitle, setSelectedExamTitle] = useState<string>(currentExam?.title || '');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [selectedPaperId, setSelectedPaperId] = useState<string>('');

  // 1. Available States list from existing exams
  const availableStates = useMemo(() => {
    const statesSet = new Set<string>();
    let hasCentral = false;

    for (const exam of exams) {
      if (isCentralExam(exam)) {
        hasCentral = true;
      } else {
        const s = getExamState(exam) || exam.state_or_central || 'Other States';
        statesSet.add(s);
      }
    }

    const sortedStates = Array.from(statesSet).sort((a, b) => {
      if (a === 'Telangana') return -1;
      if (b === 'Telangana') return 1;
      if (a === 'Andhra Pradesh') return -1;
      if (b === 'Andhra Pradesh') return 1;
      return a.localeCompare(b);
    });

    const result: Array<{ id: string; label: string; icon: string }> = [];
    if (hasCentral) {
      result.push({ id: 'Central', label: 'Central / National (All-India)', icon: '🏛️' });
    }
    for (const st of sortedStates) {
      result.push({ id: st, label: `State: ${st}`, icon: '🗺️' });
    }
    return result;
  }, [exams]);

  // 2. Filter exams matching selected state
  const stateExams = useMemo(() => {
    if (selectedState === 'Central') {
      return exams.filter(isCentralExam);
    }
    return exams.filter(e => {
      if (isCentralExam(e)) return false;
      const s = getExamState(e) || e.state_or_central || 'Other States';
      return s.toLowerCase() === selectedState.toLowerCase();
    });
  }, [exams, selectedState]);

  // 3. Available Boards for selected state
  const availableBoards = useMemo(() => {
    const boardsMap = new Map<string, { id: string; name: string; shortName: string; count: number }>();

    for (const ex of stateExams) {
      const b = getBoardForExam(ex);
      const bId = b?.id || ex.commission;
      const bName = b?.name || ex.commission;
      const bShort = b?.shortName || ex.commission;

      if (!boardsMap.has(bId)) {
        boardsMap.set(bId, { id: bId, name: bName, shortName: bShort, count: 1 });
      } else {
        boardsMap.get(bId)!.count++;
      }
    }

    return Array.from(boardsMap.values());
  }, [stateExams]);

  // 4. Exams matching selected board in active state
  const boardExams = useMemo(() => {
    return stateExams.filter(ex => {
      const b = getBoardForExam(ex);
      const bId = b?.id || ex.commission;
      return bId === selectedBoardId;
    });
  }, [stateExams, selectedBoardId]);

  // Active targeted exam record
  const activeExam = useMemo(() => {
    const matched = boardExams.find(e => e.exam_id === selectedExamId) ||
      boardExams.find(e => e.title === selectedExamTitle) ||
      boardExams.find(e => getCleanExamTitle(e) === getCleanExamTitle(selectedExamTitle)) ||
      boardExams[0] ||
      currentExam;
    return matched;
  }, [boardExams, selectedExamId, selectedExamTitle, currentExam]);

  // Clean exam title without paper or stage suffix
  const activeCleanExamTitle = useMemo(() => {
    return getCleanExamTitle(activeExam);
  }, [activeExam]);

  // Distinct exams matching selected board in active state (unique clean titles)
  const distinctBoardExams = useMemo(() => {
    const map = new Map<string, ExamRecord>();
    for (const ex of boardExams) {
      const cleanTitle = getCleanExamTitle(ex);
      // Prefer the currently active exam record if it shares this clean title
      if (!map.has(cleanTitle) || ex.exam_id === activeExam?.exam_id) {
        map.set(cleanTitle, ex);
      }
    }
    return Array.from(map.entries()).map(([cleanTitle, exam]) => ({
      cleanTitle,
      exam
    }));
  }, [boardExams, activeExam?.exam_id]);

  // 5. Stages for the active exam
  const availableStages = useMemo((): ExamStage[] => {
    if (!activeExam) return [];
    if (activeExam.stages && activeExam.stages.length > 0) {
      return activeExam.stages;
    }
    if (activeExam.structure_scheme?.stages && activeExam.structure_scheme.stages.length > 0) {
      return activeExam.structure_scheme.stages;
    }
    // Fallback single stage
    return [{
      stage_id: 'stage_1',
      stage_number: 1,
      stage_type: 'PRELIMINARY',
      total_papers: 1,
      stage_name: activeExam.stage || 'Stage 1: Official Written Examination',
      papers: [{
        paper_id: 'paper_1',
        title: activeExam.paper || activeExam.title,
        total_questions: activeExam.pattern?.total_questions || 150,
        total_marks: activeExam.pattern?.total_marks || 150,
        duration_minutes: activeExam.pattern?.duration_minutes || 150,
        negative_marking_rate: activeExam.pattern?.negative_marking_rate ?? 0.25,
        syllabus_topics: activeExam.syllabus_topics || []
      }]
    }];
  }, [activeExam]);

  // Active selected stage
  const activeStage = useMemo(() => {
    return availableStages.find(s => s.stage_id === selectedStageId) || availableStages[0];
  }, [availableStages, selectedStageId]);

  // 6. Papers for the active stage
  const availablePapers = useMemo((): ExamStagePaper[] => {
    if (!activeStage || !activeStage.papers || activeStage.papers.length === 0) {
      return [{
        paper_id: 'paper_default',
        title: activeExam?.paper || activeExam?.title || 'Main Examination Paper',
        total_questions: activeExam?.pattern?.total_questions || 150,
        total_marks: activeExam?.pattern?.total_marks || 150,
        duration_minutes: activeExam?.pattern?.duration_minutes || 150,
        negative_marking_rate: activeExam?.pattern?.negative_marking_rate ?? 0.25,
        syllabus_topics: activeExam?.syllabus_topics || []
      }];
    }
    return activeStage.papers;
  }, [activeStage, activeExam]);

  // Active selected paper
  const activePaper = useMemo(() => {
    return availablePapers.find(p => p.paper_id === selectedPaperId) || availablePapers[0];
  }, [availablePapers, selectedPaperId]);

  // Sync internal state when external currentExam changes
  useEffect(() => {
    if (currentExam) {
      const state = isCentralExam(currentExam) ? 'Central' : (getExamState(currentExam) || currentExam.state_or_central || 'Telangana');
      setSelectedState(state);
      const b = getBoardForExam(currentExam);
      setSelectedBoardId(b?.id || currentExam.commission);
      setSelectedExamTitle(currentExam.title);
    }
  }, [currentExam]);

  // Keep stage and paper in sync when activeExam changes
  useEffect(() => {
    if (availableStages.length > 0) {
      if (!availableStages.some(s => s.stage_id === selectedStageId)) {
        setSelectedStageId(availableStages[0].stage_id);
      }
    }
  }, [availableStages, selectedStageId]);

  useEffect(() => {
    if (availablePapers.length > 0) {
      if (!availablePapers.some(p => p.paper_id === selectedPaperId)) {
        setSelectedPaperId(availablePapers[0].paper_id);
      }
    }
  }, [availablePapers, selectedPaperId]);

  // Notify parent of active paper whenever activeStage or activePaper updates
  useEffect(() => {
    if (onPaperChange) {
      onPaperChange(activeStage || null, activePaper || null);
    }
  }, [activeStage, activePaper, onPaperChange]);

  // Helper to switch exam_id if an exact paper is registered as a standalone ExamRecord
  const findAndSelectMatchingExam = (stageId: string, paperId: string) => {
    const paperObj = availablePapers.find(p => p.paper_id === paperId);
    if (!paperObj) return;

    const directMatch = stateExams.find(e => {
      if (e.exam_id === activeExam.exam_id) return false;
      const t = e.title.toLowerCase();
      const p = e.paper.toLowerCase();
      const targetTitle = paperObj.title.toLowerCase();
      return (t.includes(targetTitle) || p.includes(targetTitle)) && e.commission === activeExam.commission;
    });

    if (directMatch) {
      onSelectExam(directMatch.exam_id);
    }
  };

  // Handlers
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    const nextStateExams = newState === 'Central'
      ? exams.filter(isCentralExam)
      : exams.filter(e => !isCentralExam(e) && (getExamState(e) || e.state_or_central || '').toLowerCase() === newState.toLowerCase());

    if (nextStateExams.length > 0) {
      const firstExam = nextStateExams[0];
      const b = getBoardForExam(firstExam);
      const newBoardId = b?.id || firstExam.commission;
      setSelectedBoardId(newBoardId);
      setSelectedExamTitle(firstExam.title);
      onSelectExam(firstExam.exam_id);
    }
  };

  const handleBoardChange = (newBoardId: string) => {
    setSelectedBoardId(newBoardId);
    const nextBoardExams = stateExams.filter(ex => {
      const b = getBoardForExam(ex);
      return (b?.id || ex.commission) === newBoardId;
    });

    if (nextBoardExams.length > 0) {
      const firstExam = nextBoardExams[0];
      setSelectedExamTitle(firstExam.title);
      onSelectExam(firstExam.exam_id);
    }
  };

  const handleExamChange = (newExamTitle: string) => {
    const matched = distinctBoardExams.find(item => item.cleanTitle === newExamTitle);
    if (matched) {
      setSelectedExamTitle(matched.exam.title);
      onSelectExam(matched.exam.exam_id);
    } else {
      setSelectedExamTitle(newExamTitle);
      const targetExam = boardExams.find(e => e.title === newExamTitle);
      if (targetExam) {
        onSelectExam(targetExam.exam_id);
      }
    }
  };

  const handleStageChange = (newStageId: string) => {
    setSelectedStageId(newStageId);
    const targetStage = availableStages.find(s => s.stage_id === newStageId);
    const firstPaper = targetStage?.papers?.[0];
    if (firstPaper) {
      setSelectedPaperId(firstPaper.paper_id);
      findAndSelectMatchingExam(newStageId, firstPaper.paper_id);
    }
  };

  const handlePaperChange = (newPaperId: string) => {
    setSelectedPaperId(newPaperId);
    findAndSelectMatchingExam(selectedStageId, newPaperId);
  };

  return (
    <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
      {/* Top Header & Breadcrumb Info */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
                {title}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                {badgeLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {extraControls && <div className="shrink-0">{extraControls}</div>}

          {/* Live Breadcrumb Badge Path */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-600" />
              {selectedState}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-amber-600" />
              {availableBoards.find(b => b.id === selectedBoardId)?.shortName || 'Board'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-bold border border-slate-200 max-w-[180px] truncate" title={activeCleanExamTitle}>
              {activeCleanExamTitle}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-bold border border-purple-200 max-w-[150px] truncate" title={activeStage?.stage_name}>
              {activeStage?.stage_name}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 max-w-[200px] truncate" title={activePaper?.title}>
              {activePaper?.title}
            </span>
          </div>
        </div>
      </div>

      {/* 5-Level Cascading Dropdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* LEVEL 1: State / Jurisdiction */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-indigo-600" />
            <span>1. State / Jurisdiction</span>
          </label>
          <select
            disabled={disabled}
            value={selectedState}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full bg-white hover:border-slate-400 focus:border-indigo-600 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            {availableStates.map(st => (
              <option key={st.id} value={st.id}>
                {st.icon} {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* LEVEL 2: Conducting Board */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-indigo-600" />
            <span>2. Conducting Board</span>
          </label>
          <select
            disabled={disabled}
            value={selectedBoardId}
            onChange={(e) => handleBoardChange(e.target.value)}
            className="w-full bg-white hover:border-slate-400 focus:border-indigo-600 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            {availableBoards.map(b => (
              <option key={b.id} value={b.id}>
                [{b.shortName}] {b.name} ({b.count})
              </option>
            ))}
          </select>
        </div>

        {/* LEVEL 3: Targeted Exam */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
            <Layers className="w-3 h-3 text-indigo-600" />
            <span>3. Targeted Exam</span>
          </label>
          <select
            disabled={disabled}
            value={activeCleanExamTitle}
            onChange={(e) => handleExamChange(e.target.value)}
            className="w-full bg-white hover:border-slate-400 focus:border-indigo-600 border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer truncate shadow-2xs disabled:opacity-50"
            title={activeCleanExamTitle}
          >
            {distinctBoardExams.map(item => (
              <option key={item.cleanTitle} value={item.cleanTitle}>
                {item.cleanTitle}
              </option>
            ))}
          </select>
        </div>

        {/* LEVEL 4: Selection Stage */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-600" />
            <span>4. Selection Stage</span>
          </label>
          <select
            disabled={disabled}
            value={selectedStageId}
            onChange={(e) => handleStageChange(e.target.value)}
            className="w-full bg-purple-50/60 hover:bg-white focus:bg-white border border-purple-200 rounded-xl px-2.5 py-2 text-xs font-bold text-purple-950 focus:ring-2 focus:ring-purple-500 focus:border-purple-600 transition-all cursor-pointer truncate shadow-2xs disabled:opacity-50"
            title={activeStage?.stage_name}
          >
            {availableStages.map(stg => (
              <option key={stg.stage_id} value={stg.stage_id}>
                {stg.stage_name} {stg.papers?.length ? `(${stg.papers.length} Papers)` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* LEVEL 5: Target Paper */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
            <FileText className="w-3 h-3 text-emerald-600" />
            <span>5. Target Paper</span>
          </label>
          <select
            disabled={disabled}
            value={selectedPaperId}
            onChange={(e) => handlePaperChange(e.target.value)}
            className="w-full bg-emerald-50/70 hover:bg-white focus:bg-white border border-emerald-300 rounded-xl px-2.5 py-2 text-xs font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 transition-all cursor-pointer truncate shadow-2xs disabled:opacity-50"
            title={activePaper?.title}
          >
            {availablePapers.map(p => (
              <option key={p.paper_id} value={p.paper_id}>
                {p.title} {p.total_questions ? `[${p.total_questions} Qs]` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Target Paper Specs Strip */}
      {showSpecsStrip && activePaper && (
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5 text-slate-700 font-medium">
            <span className="font-bold text-slate-900 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{activePaper.title}</span>
            </span>
            <span className="text-slate-400">•</span>
            <span>Questions: <strong className="text-slate-900">{activePaper.total_questions || activeExam?.pattern?.total_questions || 150} Qs</strong></span>
            <span>•</span>
            <span>Marks: <strong className="text-slate-900">{activePaper.total_marks || activeExam?.pattern?.total_marks || 150} M</strong></span>
            <span>•</span>
            <span>Duration: <strong className="text-slate-900">{activePaper.duration_minutes || activeExam?.pattern?.duration_minutes || 150} Mins</strong></span>
            <span>•</span>
            <span>Penalty: <strong className="text-rose-700">-{activePaper.negative_marking_rate ?? activeExam?.pattern?.negative_marking_rate ?? 0.25}</strong></span>
            {activePaper.applicable_branch && (
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                Branch: {activePaper.applicable_branch}
              </span>
            )}
            {activePaper.syllabus_topics && activePaper.syllabus_topics.length > 0 && (
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 text-[10px] font-bold border border-indigo-200">
                {activePaper.syllabus_topics.length} Syllabus Domains
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Cycle: <strong className="text-slate-800">{activeExam?.active_cycle || activeExam?.recruitment_cycle || 'Current'}</strong></span>
            <span>•</span>
            <span>ID: <code className="font-mono font-bold text-slate-700">{activeExam?.exam_id}</code></span>
          </div>
        </div>
      )}
    </div>
  );
};
