import React, { useState, useMemo } from 'react';
import {
  Building2,
  MapPin,
  FileText,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  HelpCircle,
  BookOpen,
  Split,
  Workflow,
  X,
  UploadCloud,
  Loader2,
  Check,
  Award
} from 'lucide-react';
import type { ExamIntakeInput, ExamRecord, ExamStage, ExamStagePaper } from '../types.ts';
import {
  INDIAN_STATES,
  getBoardsForState,
  getCentralBoards,
  ConductingBoardInfo
} from '../utils/examJurisdiction.ts';

export interface HierarchicalIntakeWizardProps {
  onIntakeCreated: (exam: ExamRecord) => void;
  onCancel: () => void;
  existingExams?: ExamRecord[];
}

export const HierarchicalIntakeWizard: React.FC<HierarchicalIntakeWizardProps> = ({
  onIntakeCreated,
  onCancel,
  existingExams = []
}) => {
  // Wizard active step: 1 = State, 2 = Board & Exam & Branch, 3 = Paper Structure & Subjects
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // =========================================================================
  // STEP 1 STATE: State & Jurisdiction
  // =========================================================================
  const [jurisdictionType, setJurisdictionType] = useState<'STATE' | 'CENTRAL'>('STATE');
  const [selectedState, setSelectedState] = useState<string>('Telangana');
  const [isCustomState, setIsCustomState] = useState<boolean>(false);
  const [customStateName, setCustomStateName] = useState<string>('');

  const effectiveState = useMemo(() => {
    if (jurisdictionType === 'CENTRAL') return 'Central';
    if (isCustomState) return customStateName.trim() || 'Custom State';
    return selectedState;
  }, [jurisdictionType, isCustomState, customStateName, selectedState]);

  // Boards filtered strictly by selected State / Central
  const availableBoards = useMemo(() => {
    if (jurisdictionType === 'CENTRAL') {
      return getCentralBoards();
    }
    return getBoardsForState(effectiveState);
  }, [jurisdictionType, effectiveState]);

  // =========================================================================
  // STEP 2 STATE: Recruiting Board, Exam Group & Specializations / Branches
  // =========================================================================
  const [selectedBoardId, setSelectedBoardId] = useState<string>(() => {
    return availableBoards[0]?.id || 'custom_board';
  });
  const [isCustomBoard, setIsCustomBoard] = useState<boolean>(false);
  const [customBoardName, setCustomBoardName] = useState<string>('');
  const [customBoardShort, setCustomBoardShort] = useState<string>('');

  const activeBoard = useMemo(() => {
    if (isCustomBoard) {
      return {
        id: 'custom_board',
        name: customBoardName.trim() || 'Custom Recruiting Board',
        shortName: customBoardShort.trim() || 'Board',
        exams: []
      };
    }
    return availableBoards.find(b => b.id === selectedBoardId) || availableBoards[0];
  }, [isCustomBoard, customBoardName, customBoardShort, availableBoards, selectedBoardId]);

  // Targeted Notification / Exam Group
  const [examTitle, setExamTitle] = useState<string>('Telangana Police Constable (Civil / AR / TSSP)');
  const [targetPost, setTargetPost] = useState<string>('Police Constable');
  const [recruitmentCycle, setRecruitmentCycle] = useState<string>('2026 Notification');
  const [notificationNumber, setNotificationNumber] = useState<string>('');
  const [researchMode,setResearchMode]=useState<'HYBRID'|'GOOGLE_API'|'DIRECT_WEB'>('HYBRID');
  const [discoveryMessage,setDiscoveryMessage]=useState('');
  const [selectedPaperId,setSelectedPaperId]=useState('');
  const [languageI,setLanguageI]=useState('Telugu');
  const [questionMedium,setQuestionMedium]=useState('Telugu');

  // Specialization / Branches (e.g. Civil, Electrical, Mechanical for AEE)
  const [hasBranches, setHasBranches] = useState<boolean>(false);
  const [branches, setBranches] = useState<string[]>(['Civil', 'Electrical', 'Mechanical']);
  const [newBranchInput, setNewBranchInput] = useState<string>('');

  const handleAddBranch = (branchToAdd?: string) => {
    const b = (branchToAdd || newBranchInput).trim();
    if (!b) return;
    if (!branches.some(existing => existing.toLowerCase() === b.toLowerCase())) {
      setBranches(prev => [...prev, b]);
    }
    setNewBranchInput('');
  };

  const handleRemoveBranch = (branchToRemove: string) => {
    setBranches(prev => prev.filter(b => b !== branchToRemove));
  };

  // =========================================================================
  // STEP 3 STATE: Paper Structure, Stages & Subject Breakdown
  // =========================================================================
  const [stages, setStages] = useState<ExamStage[]>([
    {
      stage_id: 'stage_1',
      stage_number: 1,
      stage_name: 'Preliminary Written Test (PWT)',
      stage_type: 'PRELIMINARY',
      total_papers: 1,
      is_qualifying_only: true,
      papers: [
        {
          paper_id: 'paper_1_1',
          paper_number: 'Paper-I',
          title: 'General Studies and Mental Ability',
          type: 'OBJECTIVE',
          total_questions: 150,
          total_marks: 150,
          duration_minutes: 150,
          negative_marking_rate: 0.25,
          is_qualifying: false,
          is_common_paper: true,
          branch_or_specialization: 'Common (All Candidates)',
          sections: [
            'General Science in everyday life',
            'Current Affairs & International Relations',
            'History of India and Indian National Movement',
            'Telangana Movement and State Formation',
            'Logical Reasoning & Analytical Ability'
          ]
        }
      ]
    }
  ]);

  // Stage Management
  const handleAddStage = () => {
    const nextNum = stages.length + 1;
    const newStage: ExamStage = {
      stage_id: `stage_${Date.now().toString(36)}_${nextNum}`,
      stage_number: nextNum,
      stage_name: nextNum === 2 ? 'Final Written Examination (Mains)' : `Stage ${nextNum}`,
      stage_type: nextNum === 2 ? 'MAINS' : 'PRELIMINARY',
      total_papers: 1,
      is_qualifying_only: false,
      papers: [
        {
          paper_id: `paper_${Date.now().toString(36)}_p1`,
          paper_number: `Paper-${nextNum}`,
          title: nextNum === 2 ? 'Paper-II: Domain & Technical Subject' : `Paper ${nextNum}`,
          type: 'OBJECTIVE',
          total_questions: 150,
          total_marks: 150,
          duration_minutes: 150,
          negative_marking_rate: 0.25,
          is_qualifying: false,
          is_common_paper: !hasBranches,
          branch_or_specialization: hasBranches && branches.length > 0 ? branches[0] : 'Common',
          sections: ['General Studies', 'Domain Subject']
        }
      ]
    };
    setStages(prev => [...prev, newStage]);
  };

  const handleRemoveStage = (stageId: string) => {
    if (stages.length === 1) {
      alert('An examination requires at least one stage.');
      return;
    }
    setStages(prev => prev.filter(s => s.stage_id !== stageId));
  };

  const handleUpdateStage = (stageId: string, patch: Partial<ExamStage>) => {
    setStages(prev => prev.map(s => s.stage_id === stageId ? { ...s, ...patch } : s));
  };

  // Paper Management
  const handleAddPaperToStage = (stageId: string, branchName?: string) => {
    setStages(prev => prev.map(stg => {
      if (stg.stage_id !== stageId) return stg;
      const currentPapers = stg.papers || [];
      const paperCount = currentPapers.length + 1;
      const isBranchSpecific = Boolean(branchName);

      const newPaper: ExamStagePaper = {
        paper_id: `paper_${Date.now().toString(36)}_${paperCount}`,
        paper_number: `Paper-${paperCount}`,
        title: isBranchSpecific
          ? `Paper-II: ${branchName} Engineering Domain`
          : `Paper-${paperCount}: General Studies & Subject`,
        type: stg.stage_type === 'MAINS' ? 'OBJECTIVE' : 'OBJECTIVE',
        total_questions: 150,
        total_marks: 150,
        duration_minutes: 150,
        negative_marking_rate: 0.25,
        is_qualifying: false,
        is_common_paper: !isBranchSpecific,
        branch_or_specialization: isBranchSpecific ? branchName : 'Common (All Candidates)',
        sections: isBranchSpecific
          ? [`${branchName} Core Concepts`, `${branchName} Standards & Specifications`, 'Applied Engineering']
          : ['General Studies', 'General Ability']
      };

      return {
        ...stg,
        total_papers: currentPapers.length + 1,
        papers: [...currentPapers, newPaper]
      };
    }));
  };

  const handleRemovePaper = (stageId: string, paperId: string) => {
    setStages(prev => prev.map(stg => {
      if (stg.stage_id !== stageId) return stg;
      const remaining = stg.papers.filter(p => p.paper_id !== paperId);
      return {
        ...stg,
        total_papers: remaining.length,
        papers: remaining
      };
    }));
  };

  const handleUpdatePaper = (stageId: string, paperId: string, patch: Partial<ExamStagePaper>) => {
    setStages(prev => prev.map(stg => {
      if (stg.stage_id !== stageId) return stg;
      return {
        ...stg,
        papers: stg.papers.map(p => p.paper_id === paperId ? { ...p, ...patch } : p)
      };
    }));
  };

  // 1-Click Generator: Generate Papers for each Technical Branch under a Stage (e.g. AEE Paper 2)
  const handleGenerateBranchPapersForStage = (stageId: string) => {
    if (branches.length === 0) {
      alert('Please add at least one branch in Step 2 first.');
      return;
    }
    setStages(prev => prev.map(stg => {
      if (stg.stage_id !== stageId) return stg;
      // Preserve existing common papers
      const commonPapers = stg.papers.filter(p => p.is_common_paper);
      // Generate branch papers
      const generatedBranchPapers: ExamStagePaper[] = branches.map((branch, idx) => ({
        paper_id: `paper_branch_${branch.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString(36)}_${idx}`,
        paper_number: `Paper-II (${branch})`,
        title: `Paper-II: ${branch} Domain Examination`,
        type: 'OBJECTIVE',
        total_questions: 150,
        total_marks: 150,
        duration_minutes: 150,
        negative_marking_rate: 0.25,
        is_qualifying: false,
        is_common_paper: false,
        branch_or_specialization: branch,
        sections: [
          `${branch} Core Principles & Theory`,
          `${branch} Practice, Codes & Standards`,
          'Analysis, Design & Problem Solving'
        ]
      }));

      const merged = [...commonPapers, ...generatedBranchPapers];
      return {
        ...stg,
        total_papers: merged.length,
        papers: merged
      };
    }));
  };

  // AI Auto-Detect Structure from Official Database/Gazette
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const handleAutoDetectStructure = async () => {
    if (!examTitle.trim()) {
      alert('Please enter an Examination Title in Step 2 first.');
      return;
    }
    setIsDetecting(true);
    try {
      const res = await fetch('/api/research/exam-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `${effectiveState} ${examTitle} ${recruitmentCycle}`, mode:researchMode })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.structure?.stages && data.structure.stages.length > 0) {
          setStages(data.structure.stages);
          setSelectedPaperId(data.structure.stages[0]?.papers[0]?.paper_id||'');
          setDiscoveryMessage([data.structure.selection_summary,...(data.structure.discovery_notes||[])].join(' '));
          if(data.structure.commission){setIsCustomBoard(true);setCustomBoardName(data.structure.commission);}
        } else {
          setDiscoveryMessage(data.structure?.selection_summary||'No usable syllabus found. Try a more specific exam name and session.');
        }
      } else {
        setDiscoveryMessage('Research failed. Please retry; the existing draft was preserved.');
      }
    } catch (err) {
      setDiscoveryMessage('Research connection failed. Please retry.');
      console.warn('Auto-detect error:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  // Notification Document Parser
  const [showDocExtractor, setShowDocExtractor] = useState<boolean>(false);
  const [docText, setDocText] = useState<string>('');
  const [isExtractingDoc, setIsExtractingDoc] = useState<boolean>(false);

  const handleExtractFromDoc = async () => {
    if (!docText.trim()) return;
    setIsExtractingDoc(true);
    try {
      const res = await fetch('/api/research/extract-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_text: docText,
          document_name: 'Pasted Official Notification',
          exam_query: examTitle
        })
      });
      const data = await res.json();
      if (res.ok && data.extracted) {
        const ext = data.extracted;
        if (ext.exam_name) setExamTitle(ext.exam_name);
        if (ext.authority && isCustomBoard) setCustomBoardName(ext.authority);
        if (ext.stages && ext.stages.length > 0) {
          setStages(ext.stages);
        }
        alert('Notification extracted! Pre-filled exam title, stages, and syllabus topics.');
        setShowDocExtractor(false);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to extract notification structure.');
    } finally {
      setIsExtractingDoc(false);
    }
  };

  // =========================================================================
  // SUBMISSION: Compile into ExamIntakeInput & Send to /api/intake/create
  // =========================================================================
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!examTitle.trim()) {
      alert('Please provide an Examination Title in Step 2.');
      setCurrentStep(2);
      return;
    }
    const commissionName = isCustomBoard ? customBoardName.trim() : (activeBoard?.name || 'Recruiting Commission');
    if (!commissionName) {
      alert('Please provide a Recruiting Commission name.');
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const chosenStage=stages.find(s=>s.papers.some(p=>p.paper_id===selectedPaperId))||stages[0];
      const firstPaper=chosenStage?.papers.find(p=>p.paper_id===selectedPaperId)||chosenStage?.papers[0];
      if(!firstPaper)throw Error('Choose a discovered paper before registering intake.');
      if(!firstPaper.total_questions||!firstPaper.duration_minutes||firstPaper.negative_marking_rate===undefined)throw Error('Paper count, duration and negative marking require review before intake.');
      const selectedLanguage=firstPaper.language_i_options?.includes(languageI)?languageI:firstPaper.language_i_options?.[0];
      const selectedMedium=firstPaper.language_mediums?.includes(questionMedium)?questionMedium:firstPaper.language_mediums?.[0]||questionMedium;
      const allSections=(firstPaper.sections||[]).map(s=>s==='Language I'&&selectedLanguage?`Language I (${selectedLanguage})`:s);
      const paperIdentity=[firstPaper.title,selectedLanguage?`Language I: ${selectedLanguage}`:'',`Medium: ${selectedMedium}`].filter(Boolean).join(' | ');

      const payload: ExamIntakeInput = {
        title: examTitle.trim(),
        commission: commissionName,
        state_or_central: effectiveState,
        post: targetPost.trim() || examTitle.trim(),
        stage: chosenStage.stage_name,
        paper: paperIdentity,
        recruitment_cycle: recruitmentCycle.trim() || 'Current Notification',
        total_questions: firstPaper.total_questions || 150,
        duration_minutes: firstPaper.duration_minutes || 150,
        marks_per_question: firstPaper.total_marks && firstPaper.total_questions ? (firstPaper.total_marks / firstPaper.total_questions) : 1,
        negative_marking_rate: firstPaper.negative_marking_rate ?? 0.25,
        sections: allSections.length > 0 ? allSections : ['General Studies'],
        syllabus_topics: firstPaper.syllabus_topics?.length?firstPaper.syllabus_topics:allSections,
        mediums: [selectedMedium],
        notes: `Selected paper: ${paperIdentity}. Language II: ${firstPaper.language_ii||'Requires review'}. Syllabus reference: ${firstPaper.syllabus_reference||'Requires research'}. ${discoveryMessage}`,
        stages: stages,
        specializations: hasBranches ? branches : undefined,
        structure_scheme: {
          query: examTitle.trim(),
          exam_name: examTitle.trim(),
          commission: commissionName,
          state_or_central: effectiveState,
          recruitment_cycle: recruitmentCycle.trim() || 'Current Notification',
          total_stages: stages.length,
          selection_summary: `Selection comprising ${stages.length} stages and ${stages.reduce((acc, s) => acc + (s.papers?.length || 0), 0)} papers across ${hasBranches ? `${branches.length} branches` : 'general cadre'}.`,
          stages: stages,
          source_status: 'REVIEW_REQUIRED'
        }
      };

      const res = await fetch('/api/intake/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}: Failed to create exam intake.`);
      }

      const data = await res.json();
      onIntakeCreated(data.exam);
    } catch (err: any) {
      console.error('Registration failed:', err);
      alert(err.message || 'Failed to register examination.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 shadow-xl overflow-hidden animate-in fade-in duration-200">
      {/* Wizard Header with Progress Bar */}
      <div className="p-6 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
              <Workflow className="w-3.5 h-3.5" />
              <span>HIERARCHICAL INTAKE BUILDER</span>
            </div>
            <h2 className="text-xl font-bold">Government Examination Architecture Setup</h2>
            <p className="text-xs text-slate-400 mt-1">
              Follow the 3-step blueprint to configure State, Recruiting Board, Exam Group, Specializations, and multi-stage Paper structures.
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="self-start md:self-auto p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close Wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Stepper Bar */}
        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
              currentStep === 1
                ? 'bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-500/30 text-white'
                : currentStep > 1
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/40 border-slate-700 text-slate-400'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
              currentStep === 1
                ? 'bg-indigo-600 text-white'
                : currentStep > 1
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-400'
            }`}>
              {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Step 1</div>
              <div className="text-xs font-bold truncate">State & Jurisdiction</div>
            </div>
          </button>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
              currentStep === 2
                ? 'bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-500/30 text-white'
                : currentStep > 2
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/40 border-slate-700 text-slate-400'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
              currentStep === 2
                ? 'bg-indigo-600 text-white'
                : currentStep > 2
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-400'
            }`}>
              {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Step 2</div>
              <div className="text-xs font-bold truncate">Board & Exam Group</div>
            </div>
          </button>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
              currentStep === 3
                ? 'bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-500/30 text-white'
                : 'bg-slate-800/40 border-slate-700 text-slate-400'
            }`}
          >
            <div className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
              currentStep === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'
            }`}>
              3
            </div>
            <div className="overflow-hidden">
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">Step 3</div>
              <div className="text-xs font-bold truncate">Paper Structure & Subjects</div>
            </div>
          </button>
        </div>

        {/* Live Hierarchy Breadcrumb Preview */}
        <div className="mt-4 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">Hierarchy:</span>
          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">{effectiveState}</span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">
            {isCustomBoard ? (customBoardShort || customBoardName || 'Board') : activeBoard?.shortName}
          </span>
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-medium truncate max-w-[200px]">
            {targetPost || examTitle || 'Target Exam'}
          </span>
          {hasBranches && branches.length > 0 && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                {branches.length} Branches ({branches.join(', ')})
              </span>
            </>
          )}
          <ChevronRight className="w-3 h-3 text-slate-600" />
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
            {stages.length} Stage(s) • {stages.reduce((acc, s) => acc + (s.papers?.length || 0), 0)} Paper(s)
          </span>
        </div>
      </div>

      {/* Main Wizard Step Content */}
      <div className="p-6 md:p-8 space-y-6">

        {/* ===================================================================
            STEP 1: STATE & JURISDICTION (Filters out unrelated boards & exams)
           =================================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">
                  1
                </span>
                <h3 className="text-lg font-bold text-slate-900">Choose State Jurisdiction</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Selecting your state immediately filters out exams and recruiting boards from unrelated states.
              </p>
            </div>

            {/* Jurisdiction Type: Central vs State */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Jurisdiction Type *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                <button
                  type="button"
                  onClick={() => {
                    setJurisdictionType('STATE');
                    setIsCustomState(false);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    jurisdictionType === 'STATE' && !isCustomState
                      ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <MapPin className={`w-6 h-6 ${jurisdictionType === 'STATE' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-bold text-sm text-slate-900">🗺️ State-Wise Examination</div>
                    <div className="text-xs text-slate-500">Telangana, Andhra Pradesh, Tamil Nadu, etc.</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setJurisdictionType('CENTRAL');
                    setIsCustomState(false);
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    jurisdictionType === 'CENTRAL'
                      ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Building2 className={`w-6 h-6 ${jurisdictionType === 'CENTRAL' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-bold text-sm text-slate-900">🏛️ Central / All-India</div>
                    <div className="text-xs text-slate-500">SSC, UPSC, Railway (RRB), IBPS, Central NITs</div>
                  </div>
                </button>
              </div>
            </div>

            {/* State Selection */}
            {jurisdictionType === 'STATE' && (
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select State (All fields are editable) *
                </label>

                {/* Popular State Quick Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  {['Telangana', 'Andhra Pradesh', 'Tamil Nadu', 'Karnataka', 'Kerala', 'Maharashtra'].map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setSelectedState(st);
                        setIsCustomState(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        selectedState === st && !isCustomState
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setIsCustomState(!isCustomState)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                      isCustomState
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Other / Custom State</span>
                  </button>
                </div>

                {/* Dropdown or Custom Input */}
                {!isCustomState ? (
                  <div className="max-w-md">
                    <select
                      value={selectedState}
                      onChange={e => setSelectedState(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                    >
                      {INDIAN_STATES.map(st => (
                        <option key={st.code} value={st.name}>
                          {st.name} ({st.shortCommission})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="max-w-md space-y-1.5 p-4 bg-amber-50/70 border border-amber-200 rounded-xl">
                    <label className="block text-xs font-bold text-amber-900">
                      Enter Custom State / Territory Name:
                    </label>
                    <input
                      type="text"
                      value={customStateName}
                      onChange={e => setCustomStateName(e.target.value)}
                      placeholder="e.g. Goa, Sikkim, Ladakh"
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Filter Confirmation Summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Filtered to <strong>{effectiveState}</strong>: {availableBoards.length} official recruiting board(s) available in Step 2.
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">Unrelated states filtered</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            STEP 2: RECRUITING BOARD, EXAM GROUP & SPECIALIZATIONS / BRANCHES
           =================================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">
                  2
                </span>
                <h3 className="text-lg font-bold text-slate-900">Recruiting Board & Targeted Notification</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Pick the recruiting commission for {effectiveState} and specify the targeted notification cadre, plus any technical specializations (e.g. Civil/Mechanical for AEE).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Board Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Recruiting Board / Commission *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomBoard(!isCustomBoard)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                  >
                    {isCustomBoard ? '← Select Standard Board' : '+ Custom Board'}
                  </button>
                </div>

                {!isCustomBoard ? (
                  <select
                    value={selectedBoardId}
                    onChange={e => setSelectedBoardId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-indigo-300 rounded-xl text-sm font-semibold bg-indigo-50/40 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                  >
                    {availableBoards.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.icon} {b.shortName} - {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2 p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                    <input
                      type="text"
                      value={customBoardName}
                      onChange={e => setCustomBoardName(e.target.value)}
                      placeholder="Full Commission Name (e.g. Telangana State Police Recruitment Board)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={customBoardShort}
                      onChange={e => setCustomBoardShort(e.target.value)}
                      placeholder="Short Abbreviation (e.g. TSLPRB)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* Popular Exams Quick Selector for this Board */}
                {!isCustomBoard && activeBoard?.exams && activeBoard.exams.length > 0 && (
                  <div className="mt-2.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Quick Select under {activeBoard.shortName}:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {activeBoard.exams.map((ex, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setExamTitle(`${activeBoard.shortName} ${ex.title}`);
                            setTargetPost(ex.title);
                            if (ex.title.toLowerCase().includes('aee') || ex.title.toLowerCase().includes('engineer')) {
                              setHasBranches(true);
                              setBranches(['Civil', 'Electrical', 'Mechanical', 'Agricultural']);
                            }
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                        >
                          {ex.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Target Notification / Exam Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Targeted Notification / Exam Title *
                </label>
                <input
                  type="text"
                  required
                  value={examTitle}
                  onChange={e => setExamTitle(e.target.value)}
                  placeholder="e.g. Telangana Police Constable (SCT PC Civil / AR / TSSP)"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Official name as published in the gazette.
                </span>
              </div>

              {/* Post Cadres & Recruitment Cycle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Post Cadre(s)
                </label>
                <input
                  type="text"
                  value={targetPost}
                  onChange={e => setTargetPost(e.target.value)}
                  placeholder="e.g. Police Constable (Civil / AR / TSSP / Communications)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Recruitment Year / Cycle
                </label>
                <input
                  type="text"
                  value={recruitmentCycle}
                  onChange={e => setRecruitmentCycle(e.target.value)}
                  placeholder="e.g. 2026 Notification (Cycle 41/2022)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Specialization / Branches Manager (Crucial for AEE, Polytechnic, Tech SI) */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Split className="w-4 h-4 text-indigo-600" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Specialization / Engineering Branches (Optional)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Does this notification have different branches (e.g. AEE has common Paper 1, but different technical Paper 2 for Civil, Electrical, Mechanical)?
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasBranches}
                    onChange={e => setHasBranches(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Enable Branches</span>
                </label>
              </div>

              {hasBranches && (
                <div className="pt-3 border-t border-indigo-100 space-y-3">
                  {/* Preset Engineering & Police Wing Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Quick Add:</span>
                    {['Civil', 'Electrical', 'Mechanical', 'Agricultural', 'Electronics'].map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleAddBranch(b)}
                        className="text-[10px] px-2 py-1 rounded bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 font-semibold transition-colors cursor-pointer"
                      >
                        + {b}
                      </button>
                    ))}
                  </div>

                  {/* Active Branches Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {branches.map(br => (
                      <span
                        key={br}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold shadow-2xs"
                      >
                        <span>{br}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBranch(br)}
                          className="text-indigo-200 hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Custom Branch Input */}
                  <div className="flex items-center gap-2 max-w-sm">
                    <input
                      type="text"
                      value={newBranchInput}
                      onChange={e => setNewBranchInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBranch(); } }}
                      placeholder="Type branch & click Add..."
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddBranch()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                    >
                      Add Branch
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            STEP 3: PAPER STRUCTURE & SUBJECTS (Prelims vs Mains / Common vs Branch)
           =================================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-xl border border-indigo-200 p-4 space-y-3">
              <p className="text-sm">Fetch the exam scheme, choose one paper and its languages, then register that paper for research. Mock generation opens after syllabus and rules verification.</p>
              <label className="block text-sm">Research mode <select aria-label="Intake research mode" value={researchMode} onChange={e=>setResearchMode(e.target.value as typeof researchMode)} className="border rounded p-2"><option value="HYBRID">Automatic: Direct Web + Gemini fallback</option><option value="DIRECT_WEB">Direct Web — no AI API key</option><option value="GOOGLE_API">Direct Web + Gemini</option></select></label>
              {discoveryMessage&&<p role="status" className="text-sm text-amber-800">{discoveryMessage}</p>}
              <label className="block text-sm">Paper to register <select aria-label="Paper to register" value={selectedPaperId||stages[0]?.papers[0]?.paper_id||''} onChange={e=>setSelectedPaperId(e.target.value)} className="border rounded p-2 max-w-full">{stages.flatMap(s=>s.papers.map(p=><option key={p.paper_id} value={p.paper_id}>{s.stage_name}: {p.title}</option>))}</select></label>
              {(()=>{const p=stages.flatMap(s=>s.papers).find(p=>p.paper_id===(selectedPaperId||stages[0]?.papers[0]?.paper_id));return <>
                {!!p?.language_i_options?.length&&<label className="block text-sm">Language I <select aria-label="Language I" value={p.language_i_options.includes(languageI)?languageI:p.language_i_options[0]} onChange={e=>setLanguageI(e.target.value)} className="border rounded p-2">{p.language_i_options.map(l=><option key={l}>{l}</option>)}</select></label>}
                {p?.language_ii&&<p className="text-sm">Language II: {p.language_ii}</p>}
                <label className="block text-sm">Question medium <select aria-label="Question medium" value={p?.language_mediums?.includes(questionMedium)?questionMedium:p?.language_mediums?.[0]||questionMedium} onChange={e=>setQuestionMedium(e.target.value)} className="border rounded p-2">{(p?.language_mediums?.length?p.language_mediums:['English','Telugu','Hindi']).map(l=><option key={l}>{l}</option>)}</select></label>
                {p?.syllabus_reference&&<a href={p.syllabus_reference} target="_blank" rel="noreferrer" className="text-sm underline">Official paper and language syllabus</a>}
              </>})()}
            </div>
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">Define Official Paper Structure & Subjects</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Add exact selection stages (Prelims vs Mains) and official papers. Support common papers (e.g. Paper 1) and branch-specific technical papers (e.g. Paper 2 for Civil vs Electrical).
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAutoDetectStructure}
                  disabled={isDetecting}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Auto-detect from government gazette"
                >
                  {isDetecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>⚡ Auto-Detect Stages</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDocExtractor(!showDocExtractor)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{showDocExtractor ? 'Close Doc' : 'Paste Notification Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddStage}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Stage</span>
                </button>
              </div>
            </div>

            {/* Paste Notification Extractor Drawer */}
            {showDocExtractor && (
              <div className="p-4 bg-slate-50 border border-indigo-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Paste Official Notification / Examination Scheme Annexure:
                  </span>
                  <span className="text-[10px] text-slate-400">{docText.length} characters</span>
                </div>
                <textarea
                  rows={4}
                  value={docText}
                  onChange={e => setDocText(e.target.value)}
                  placeholder="Paste notification text here to automatically parse stages, papers, marks, and syllabus..."
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleExtractFromDoc}
                  disabled={isExtractingDoc || !docText.trim()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isExtractingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Parse & Auto-Fill Papers</span>
                </button>
              </div>
            )}

            {/* Stages & Papers Tree */}
            <div className="space-y-6">
              {stages.map((stg, stgIdx) => (
                <div
                  key={stg.stage_id || stgIdx}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Stage Header */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
                      <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {stgIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={stg.stage_name}
                        onChange={e => handleUpdateStage(stg.stage_id, { stage_name: e.target.value })}
                        placeholder="Stage Name (e.g. Preliminary Written Test)"
                        className="text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-1.5 flex-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={stg.stage_type}
                        onChange={e => handleUpdateStage(stg.stage_id, { stage_type: e.target.value as any })}
                        className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700"
                      >
                        <option value="PRELIMINARY">PRELIMINARY / SCREENING</option>
                        <option value="MAINS">MAINS EXAMINATION</option>
                        <option value="INTERVIEW">INTERVIEW / PERSONALITY</option>
                        <option value="PHYSICAL_TEST">PHYSICAL TEST (PET/PMT)</option>
                        <option value="SKILL_TEST">SKILL / TYPING TEST</option>
                      </select>

                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(stg.is_qualifying_only)}
                          onChange={e => handleUpdateStage(stg.stage_id, { is_qualifying_only: e.target.checked })}
                          className="rounded text-indigo-600"
                        />
                        <span>Qualifying Only</span>
                      </label>

                      {hasBranches && branches.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleGenerateBranchPapersForStage(stg.stage_id)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Generate a separate technical paper for each branch"
                        >
                          <Split className="w-3 h-3 text-amber-700" />
                          <span>Generate Branch Papers</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAddPaperToStage(stg.stage_id)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Paper</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveStage(stg.stage_id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Stage"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Papers under this Stage */}
                  <div className="p-4 space-y-4 bg-slate-50/40">
                    {stg.papers.map((paper, pIdx) => (
                      <div
                        key={paper.paper_id || pIdx}
                        className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
                      >
                        {/* Paper Title & Scope Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                              {paper.paper_number || `Paper-${pIdx + 1}`}
                            </span>
                            <input
                              type="text"
                              value={paper.title}
                              onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, { title: e.target.value })}
                              placeholder="e.g. Paper-I: General Studies and Mental Ability"
                              className="font-bold text-xs text-slate-900 bg-slate-50/60 border border-slate-300 rounded px-2.5 py-1 flex-1 focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Paper Scope: Common vs Branch */}
                            <select
                              value={paper.is_common_paper ? 'COMMON' : (paper.branch_or_specialization || 'BRANCH')}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === 'COMMON') {
                                  handleUpdatePaper(stg.stage_id, paper.paper_id, {
                                    is_common_paper: true,
                                    branch_or_specialization: 'Common (All Candidates)'
                                  });
                                } else {
                                  handleUpdatePaper(stg.stage_id, paper.paper_id, {
                                    is_common_paper: false,
                                    branch_or_specialization: val
                                  });
                                }
                              }}
                              className="text-[11px] font-semibold bg-indigo-50/50 border border-indigo-200 rounded px-2 py-1 text-indigo-900 cursor-pointer"
                            >
                              <option value="COMMON">🌐 Common Paper (All Branches)</option>
                              {hasBranches && branches.map(br => (
                                <option key={br} value={br}>
                                  🛠️ Technical: {br} Branch
                                </option>
                              ))}
                            </select>

                            <select
                              value={paper.type}
                              onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, { type: e.target.value as any })}
                              className="text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700"
                            >
                              <option value="OBJECTIVE">OBJECTIVE (MCQ)</option>
                              <option value="DESCRIPTIVE">DESCRIPTIVE</option>
                              <option value="QUALIFYING">QUALIFYING</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemovePaper(stg.stage_id, paper.paper_id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Delete Paper"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Paper Exam Specifications Grid (Questions, Marks, Duration, Negative Marking) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 p-3 rounded-lg text-xs">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                              Questions
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={paper.total_questions || 150}
                              onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, { total_questions: parseInt(e.target.value) || 0 })}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                              Total Marks
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={paper.total_marks || 150}
                              onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, { total_marks: parseInt(e.target.value) || 0 })}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                              Duration (Mins)
                            </label>
                            <input
                              type="number"
                              min={10}
                              value={paper.duration_minutes || 150}
                              onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, { duration_minutes: parseInt(e.target.value) || 0 })}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">
                              Negative Penalty
                            </label>
                            <select
                              value={paper.negative_marking_rate ?? 0.25}
                              onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, { negative_marking_rate: parseFloat(e.target.value) })}
                              className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800"
                            >
                              <option value={0}>0.00 (No Negative)</option>
                              <option value={0.20}>0.20 (1/5th Penalty)</option>
                              <option value={0.25}>0.25 (1/4th Penalty)</option>
                              <option value={0.33}>0.33 (1/3rd Penalty)</option>
                            </select>
                          </div>
                        </div>

                        {/* Subjects / Sections Breakdown for this Paper */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase font-bold text-slate-500">
                            Syllabus Subjects / Sections for {paper.paper_number} (One per line or comma-separated):
                          </label>
                          <textarea
                            rows={2}
                            value={(paper.sections || []).join('\n')}
                            onChange={e => {
                              const lines = e.target.value.split('\n').map(l => l.trim()).filter(Boolean);
                              handleUpdatePaper(stg.stage_id, paper.paper_id, { sections: lines });
                            }}
                            placeholder="e.g. General Science, History of India, Telangana Movement..."
                            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Wizard Action Footer */}
      <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <div>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep((currentStep - 1) as any)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((currentStep + 1) as any)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Next: {currentStep === 1 ? 'Board & Exam' : 'Paper Structure'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Intake & Papers...</span>
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  <span>Register Examination Intake</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
