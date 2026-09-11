import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  Loader2,
  Building2,
  FileCheck2,
  PlusCircle,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Layers,
  BookOpen,
  Calendar,
  AlertCircle,
  ShieldCheck,
  FileText,
  History,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Trash2,
  Plus,
  Check,
  X,
  Youtube
} from 'lucide-react';
import { ExamIntakeInput, ExamRecord, ResearchMode, CriticalFactName, ExamPatternVersion, ExamStage, ExamStagePaper, ExamStructureScheme } from '../types';
import { RecruitmentCycleManager } from './RecruitmentCycleManager';
import { ExamStagesManager } from './ExamStagesManager';
import { ExamHierarchyDrilldown } from './ExamHierarchyDrilldown';
import { YoutubeMaterialExtractor } from './YoutubeMaterialExtractor';
import { AuditorSignoffModal } from './AuditorSignoffModal';
import { SystemAuditLogsModal } from './SystemAuditLogsModal';
import { HierarchicalIntakeWizard } from './HierarchicalIntakeWizard.tsx';
import {
  INDIAN_STATES,
  isCentralExam,
  getExamState,
  groupExamsByJurisdiction,
  filterExamsByJurisdiction,
  getBoardsForState,
  getCentralBoards,
  getBoardForExam,
  ConductingBoardInfo
} from '../utils/examJurisdiction';

interface IntakeScreenProps {
  exams: ExamRecord[];
  onIntakeCreated: (newExam: ExamRecord) => void;
  onRefreshExams?: () => void;
  onLaunchResearch: (query: string, mode: ResearchMode, examId?: string) => void;
  onNavigateToMocks: (examId: string) => void;
}

interface PresetItem {
  id: string;
  label: string;
  shortTag: string;
  tier: 'CENTRAL' | 'STATE';
  state?: string;
  data: ExamIntakeInput;
}

const PRESET_TEMPLATES: PresetItem[] = [
  {
    id: 'tslprb_si',
    label: 'TS Police SI',
    shortTag: 'TS Police',
    tier: 'STATE',
    state: 'Telangana',
    data: {
      title: 'Telangana State Police Sub-Inspector (SI): Preliminary Written Test',
      commission: 'Telangana State Level Police Recruitment Board (TSLPRB)',
      state_or_central: 'Telangana',
      post: 'Sub-Inspector of Police (Civil / AR / TSSP / Communications)',
      stage: 'Preliminary Written Test (PWT)',
      paper: 'Single Paper: Arithmetic, Reasoning & General Studies (200 Questions)',
      recruitment_cycle: 'Notification 41/2022 Cycle',
      total_questions: 200,
      duration_minutes: 180,
      marks_per_question: 1,
      negative_marking_rate: 0.20,
      sections: [
        'Arithmetic and Test of Reasoning / Mental Ability (100 Questions)',
        'General Studies: Indian & Telangana History, Geography, Polity (100 Questions)'
      ],
      syllabus_topics: [
        'Arithmetic & Reasoning (Number Systems, Time & Work, Coding-Decoding)',
        'Telangana Movement, Statehood & Culture',
        'Indian Constitution & General Science'
      ],
      mediums: ['English', 'Telugu', 'Urdu'],
      target_date: '2025-11-15',
      notes: 'Official TSLPRB Police SI format: 200 questions, 1/5th negative marking (0.20 penalty)'
    }
  },
  {
    id: 'tgpsc_g2',
    label: 'TGPSC Group 2',
    shortTag: 'Telangana',
    tier: 'STATE',
    state: 'Telangana',
    data: {
      title: 'TGPSC Group-II Services: Paper I (General Studies & General Abilities)',
      commission: 'Telangana Public Service Commission (TGPSC)',
      state_or_central: 'Telangana',
      post: 'Municipal Commissioner Gr.III, Sub-Registrar Gr.II, ACTO',
      stage: 'Written Examination (Objective)',
      paper: 'Paper-I: General Studies and General Abilities',
      recruitment_cycle: 'Notification 28/2022 (Current Cycle)',
      total_questions: 150,
      duration_minutes: 150,
      marks_per_question: 1,
      negative_marking_rate: 0.25,
      sections: [
        'History and Cultural Heritage of India & Telangana',
        'Indian Constitution and Polity',
        'Economy of India and Telangana',
        'General Science in everyday life',
        'Logical Reasoning & Analytical Ability'
      ],
      syllabus_topics: [
        'Telangana Movement and State Formation',
        'Constitutional Articles 371D and Basic Structure',
        'Telangana Socio-Economic Outlook & Welfare Schemes',
        'Western & Eastern Ghats Ecology'
      ],
      mediums: ['English', 'Telugu', 'Urdu'],
      target_date: '2025-12-15',
      notes: 'Verified against TGPSC Gazette & Notification 28/2022'
    }
  },
  {
    id: 'appsc_g2',
    label: 'APPSC Group 2',
    shortTag: 'Andhra Pradesh',
    tier: 'STATE',
    state: 'Andhra Pradesh',
    data: {
      title: 'APPSC Group-II Services: Screening Test (General Studies & Mental Ability)',
      commission: 'Andhra Pradesh Public Service Commission (APPSC)',
      state_or_central: 'Andhra Pradesh',
      post: 'Assistant Section Officer (ASO), Deputy Tahsildar',
      stage: 'Screening Test (Prelims)',
      paper: 'General Studies and Mental Ability (5 Sections × 30 Marks)',
      recruitment_cycle: 'Notification 11/2023 Cycle',
      total_questions: 150,
      duration_minutes: 150,
      marks_per_question: 1,
      negative_marking_rate: 0.33,
      sections: [
        'Indian History (Ancient, Medieval, Modern)',
        'Geography (General, Physical, India, AP)',
        'Indian Society (Structure, Issues, Welfare)',
        'Current Affairs & Mental Ability'
      ],
      syllabus_topics: [
        'AP Reorganisation Act 2014 & Schedule IX/X',
        'Modern Indian Freedom Struggle & 1905 Swadeshi Movement',
        'Panchayati Raj Institutions & PESA Act'
      ],
      mediums: ['English', 'Telugu'],
      target_date: '2025-11-20',
      notes: 'Negative marking is 1/3rd (0.33 marks penalty)'
    }
  },
  {
    id: 'appsc_endowment',
    label: 'APPSC Endowment Gr-III',
    shortTag: 'AP Endowments',
    tier: 'STATE',
    state: 'Andhra Pradesh',
    data: {
      title: 'APPSC Executive Officer Grade-III: Mains Paper-I (General Studies & Mental Ability)',
      commission: 'Andhra Pradesh Public Service Commission (APPSC)',
      state_or_central: 'Andhra Pradesh',
      post: 'Executive Officer Grade-III (Endowments Sub-Service)',
      stage: 'Mains Written Examination',
      paper: 'Paper-I: General Studies and Mental Ability',
      recruitment_cycle: 'Notification 13/2021 Cycle',
      total_questions: 150,
      duration_minutes: 150,
      marks_per_question: 1,
      negative_marking_rate: 0.33,
      sections: [
        'Events of National and International Importance',
        'Current Affairs - International, National and Regional',
        'General Science and its applications to day-to-day life',
        'History of Modern India with emphasis on Andhra Pradesh',
        'Indian Polity and Governance, Public Policy and e-Governance',
        'Economic Development in India and Andhra Pradesh',
        'Physical Geography of Indian Sub-Continent and Andhra Pradesh',
        'Disaster Management: Vulnerability profile and mitigation strategies',
        'Sustainable Development and Environmental Protection',
        'Logical Reasoning, Analytical Ability and Data Interpretation',
        'Bifurcation of Andhra Pradesh and its Administrative and Economic Implications'
      ],
      syllabus_topics: [
        'AP Reorganisation Act 2014 & Schedule IX/X',
        'Disaster Management & National Disaster Management Act 2005',
        'Socio-Economic Survey of Andhra Pradesh',
        'Polity, Governance & 73rd/74th Constitutional Amendments'
      ],
      mediums: ['English', 'Telugu'],
      target_date: '2025-12-30',
      notes: '150 questions, 150 minutes, -0.33 negative marking penalty'
    }
  },
  {
    id: 'ssc_cgl',
    label: 'SSC CGL',
    shortTag: 'Central',
    tier: 'CENTRAL',
    data: {
      title: 'SSC Combined Graduate Level (CGL): Tier-I',
      commission: 'Staff Selection Commission (SSC)',
      state_or_central: 'Central',
      post: 'Assistant Section Officer, Inspector of Central Excise',
      stage: 'Tier-I Computer Based Examination',
      paper: 'Combined Tier-I (4 Sections × 25 Questions)',
      recruitment_cycle: 'CGL 2024-2025 Cycle',
      total_questions: 100,
      duration_minutes: 60,
      marks_per_question: 2,
      negative_marking_rate: 0.50,
      sections: [
        'General Intelligence and Reasoning',
        'General Awareness',
        'Quantitative Aptitude',
        'English Comprehension'
      ],
      syllabus_topics: [
        'Indian Polity and Constitutional Framework',
        'Static GK: Classical Arts, Census 2011, Biospheres',
        'Arithmetic & Advanced Algebra / Geometry'
      ],
      mediums: ['English', 'Hindi'],
      target_date: '2025-10-10',
      notes: 'Central government recruitment pattern (0.50 negative mark per wrong answer)'
    }
  },
  {
    id: 'rrb_ntpc',
    label: 'RRB NTPC',
    shortTag: 'Railways / Central',
    tier: 'CENTRAL',
    data: {
      title: 'RRB Non-Technical Popular Categories (NTPC): CBT-1',
      commission: 'Railway Recruitment Boards (RRB)',
      state_or_central: 'Central',
      post: 'Station Master, Goods Guard, Senior Clerk cum Typist',
      stage: '1st Stage Computer Based Test (CBT-1)',
      paper: 'CBT-1 Common Screening Test (100 Qs)',
      recruitment_cycle: 'CEN 05/2024 Cycle',
      total_questions: 100,
      duration_minutes: 90,
      marks_per_question: 1,
      negative_marking_rate: 0.33,
      sections: [
        'General Awareness (40 Qs)',
        'Mathematics (30 Qs)',
        'General Intelligence & Reasoning (30 Qs)'
      ],
      syllabus_topics: [
        'Current Events of National & International Importance',
        'Games and Sports, Art and Culture of India',
        'General Science & Life Sciences (up to 10th CBSE)',
        'Indian Economy & Famous Personalities'
      ],
      mediums: ['English', 'Hindi', 'Regional Languages'],
      target_date: '2025-11-30',
      notes: 'Preset identification shortcut. Requires official CEN verification.'
    }
  },
  {
    id: 'tnpsc_g2',
    label: 'TNPSC Group 2',
    shortTag: 'Tamil Nadu',
    tier: 'STATE',
    state: 'Tamil Nadu',
    data: {
      title: 'TNPSC Combined Civil Services Examination-II (Group-II & IIA): Prelims',
      commission: 'Tamil Nadu Public Service Commission (TNPSC)',
      state_or_central: 'Tamil Nadu',
      post: 'Assistant Section Officer, Sub-Registrar Grade-II, Municipal Commissioner',
      stage: 'Preliminary Examination (Single Paper)',
      paper: 'General Studies (100 Qs) + General Tamil / General English (100 Qs)',
      recruitment_cycle: 'Notification 2024-2025 Cycle',
      total_questions: 200,
      duration_minutes: 180,
      marks_per_question: 1.5,
      negative_marking_rate: 0.0,
      sections: [
        'General Studies (Degree Standard) & Aptitude',
        'General Tamil / General English (SSLC Standard)',
        'History, Culture, Heritage and Socio-Political Movements in Tamil Nadu',
        'Development Administration in Tamil Nadu'
      ],
      syllabus_topics: [
        'Thirukkural and Tamil Literature Heritage',
        'Justice Party & Dravidian Movement Reforms',
        'Human Development Indicators in Tamil Nadu',
        'Indian Polity and Constitution'
      ],
      mediums: ['English', 'Tamil'],
      target_date: '2025-12-05',
      notes: 'Preset identification shortcut. No negative marking in preliminary objective exam.'
    }
  },
  {
    id: 'kerala_psc_degree',
    label: 'Kerala PSC Degree Level',
    shortTag: 'Kerala',
    tier: 'STATE',
    state: 'Kerala',
    data: {
      title: 'Kerala PSC Common Preliminary Examination (Graduate Level)',
      commission: 'Kerala Public Service Commission (KPSC)',
      state_or_central: 'Kerala',
      post: 'Secretariat Assistant, Sub-Inspector, Auditor',
      stage: 'Common Preliminary Examination (Stage 1)',
      paper: 'Degree Level Common Preliminary Test',
      recruitment_cycle: 'Category No. 2024-2025 Cycle',
      total_questions: 100,
      duration_minutes: 75,
      marks_per_question: 1,
      negative_marking_rate: 0.33,
      sections: [
        'History (Kerala, India, World) & Geography',
        'Economics, Civics & Indian Constitution',
        'General Science & Technology',
        'Simple Arithmetic & Mental Ability',
        'General English & Malayalam / Regional Language'
      ],
      syllabus_topics: [
        'Kerala Renaissance & Social Reform Movements',
        'Panchayat Raj & Kudumbashree Initiatives in Kerala',
        'Indian Constitution & Fundamental Rights',
        'Basic Science & Environmental Issues'
      ],
      mediums: ['English', 'Malayalam'],
      target_date: '2025-12-20',
      notes: 'Preset identification shortcut. Negative marking 1/3rd (0.333).'
    }
  }
];

export const IntakeScreen: React.FC<IntakeScreenProps> = ({
  exams,
  onIntakeCreated,
  onRefreshExams,
  onLaunchResearch,
  onNavigateToMocks
}) => {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Jurisdiction filters & form states
  const [presetFilterTier, setPresetFilterTier] = useState<'ALL' | 'CENTRAL' | 'STATE'>('STATE');
  const [registryFilterTier, setRegistryFilterTier] = useState<'ALL' | 'CENTRAL' | 'STATE'>('STATE');
  const [registrySelectedState, setRegistrySelectedState] = useState<string>('Telangana');
  const [registrySelectedBoard, setRegistrySelectedBoard] = useState<string>('ALL_BOARDS');
  const [formJurisdictionType, setFormJurisdictionType] = useState<'CENTRAL' | 'STATE'>('STATE');
  const [formSelectedState, setFormSelectedState] = useState<string>('Telangana');
  const [formSelectedBoardId, setFormSelectedBoardId] = useState<string>('tgpsc');

  const availableFormBoards = useMemo(() => {
    if (formJurisdictionType === 'CENTRAL') {
      return getCentralBoards();
    }
    return getBoardsForState(formSelectedState);
  }, [formJurisdictionType, formSelectedState]);

  // Auditor Sign-off Modal state
  const [verifyingExam, setVerifyingExam] = useState<ExamRecord | null>(null);
  const [targetFact, setTargetFact] = useState<{
    key: CriticalFactName;
    label: string;
    currentValue: any;
  } | null>(null);

  // System Audit Logs modal state
  const [auditLogsExam, setAuditLogsExam] = useState<ExamRecord | null>(null);

  // Expanded Exam ID for progressive disclosure drilldown (Exam -> Stages -> Papers -> Subjects)
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

  // Locally deleted exam IDs for immediate optimistic UI update
  const [deletedExamIds, setDeletedExamIds] = useState<string[]>([]);

  const toggleExamExpanded = (examId: string) => {
    setExpandedExamId(prev => prev === examId ? null : examId);
  };

  const handleDeleteExam = async (examId: string) => {
    // Optimistically hide the exam immediately
    setDeletedExamIds(prev => [...prev, examId]);
    try {
      const res = await fetch(`/api/exams/${examId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete exam');
      }
      if (onRefreshExams) onRefreshExams();
    } catch (err: any) {
      // Revert optimistic delete on error
      setDeletedExamIds(prev => prev.filter(id => id !== examId));
      alert(err.message || 'Failed to delete exam');
    }
  };

  const handleUpdateExamRecord = (_updated: ExamRecord) => {
    if (onRefreshExams) onRefreshExams();
  };

  // Hidden / Deleted board IDs (allows deleting / removing boards from filters)
  const [hiddenBoardIds, setHiddenBoardIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('govexam_hidden_board_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDeleteBoard = async (board: ConductingBoardInfo) => {
    const examsInBoard = exams.filter(e => {
      const b = getBoardForExam(e);
      return b?.id === board.id;
    });

    if (examsInBoard.length > 0) {
      const confirmed = window.confirm(
        `Board "${board.name}" (${board.shortName}) has ${examsInBoard.length} registered exam(s).\n\n` +
        `• Click OK to DELETE all ${examsInBoard.length} exam(s) and remove this board from view.\n` +
        `• Click Cancel to keep everything.`
      );
      if (!confirmed) return;

      for (const ex of examsInBoard) {
        try {
          await fetch(`/api/exams/${ex.exam_id}`, { method: 'DELETE' });
        } catch (err) {
          console.error('Failed to delete exam:', ex.exam_id, err);
        }
      }
      setHiddenBoardIds(prev => {
        const next = [...prev, board.id];
        try { localStorage.setItem('govexam_hidden_board_ids', JSON.stringify(next)); } catch {}
        return next;
      });
      if (registrySelectedBoard === board.id) {
        setRegistrySelectedBoard('ALL_BOARDS');
      }
      if (onRefreshExams) onRefreshExams();
    } else {
      const confirmed = window.confirm(
        `Remove board "${board.shortName}" from board filters?`
      );
      if (!confirmed) return;
      setHiddenBoardIds(prev => {
        const next = [...prev, board.id];
        try { localStorage.setItem('govexam_hidden_board_ids', JSON.stringify(next)); } catch {}
        return next;
      });
      if (registrySelectedBoard === board.id) {
        setRegistrySelectedBoard('ALL_BOARDS');
      }
    }
  };

  const handleRestoreBoards = () => {
    setHiddenBoardIds([]);
    try { localStorage.removeItem('govexam_hidden_board_ids'); } catch {}
  };

  // Active sub-panels per exam: 'MATRIX' | 'CYCLES' | 'STAGES' | 'MATERIALS' | 'NONE'
  const [expandedExamSections, setExpandedExamSections] = useState<Record<string, 'MATRIX' | 'CYCLES' | 'STAGES' | 'MATERIALS' | 'NONE'>>({});

  const toggleExamSection = (examId: string, section: 'MATRIX' | 'CYCLES' | 'STAGES' | 'MATERIALS') => {
    setExpandedExamSections(prev => ({
      ...prev,
      [examId]: prev[examId] === section ? 'NONE' : section
    }));
  };

  const handleSwitchCycle = async (examId: string, cycle: string) => {
    try {
      const res = await fetch(`/api/exams/${examId}/switch-cycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_cycle: cycle })
      });
      if (!res.ok) throw new Error('Failed to switch cycle');
      if (onRefreshExams) onRefreshExams();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCycleVersion = async (examId: string, versionData: Partial<ExamPatternVersion>) => {
    try {
      const res = await fetch(`/api/exams/${examId}/pattern-versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(versionData)
      });
      if (!res.ok) throw new Error('Failed to add pattern version');
      if (onRefreshExams) onRefreshExams();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFactSignoffSuccess = (updatedExam: ExamRecord) => {
    setVerifyingExam(null);
    setTargetFact(null);
    if (onRefreshExams) onRefreshExams();
  };

  const [presetNotice, setPresetNotice] = useState<{
    type: 'VERIFIED' | 'SHORTCUT';
    message: string;
    examTitle: string;
  } | null>(null);

  const [formData, setFormData] = useState<ExamIntakeInput>({
    title: '',
    commission: '',
    state_or_central: 'Telangana',
    post: '',
    stage: 'Written Examination',
    paper: 'Paper-I',
    recruitment_cycle: '2024-2025 Cycle',
    total_questions: 150,
    duration_minutes: 150,
    marks_per_question: 1,
    negative_marking_rate: 0.25,
    sections: ['General Studies', 'General Abilities'],
    syllabus_topics: ['Indian Polity', 'State History', 'General Science', 'Economy'],
    mediums: ['English', 'Telugu'],
    target_date: '',
    notes: '',
    pattern_status: 'UNVERIFIED',
    exam_profile_status: 'RESEARCH_REQUIRED'
  });

  const [rawSections, setRawSections] = useState(formData.sections.join('\n'));
  const [rawTopics, setRawTopics] = useState(formData.syllabus_topics.join('\n'));
  const [rawMediums, setRawMediums] = useState(formData.mediums.join(', '));

  // PRESET SAFETY LOGIC:
  // Presets act only as identification shortcuts.
  // Check if a verified ExamRecord already exists in the database.
  // If yes: load verified record.
  // If no: mark PATTERN_STATUS = UNVERIFIED and prompt to Research Engine.
  const handleSelectPreset = (preset: PresetItem) => {
    setShowForm(true);

    // Check if verified ExamRecord already exists
    const existingVerified = exams.find(e => {
      const titleMatch = e.title.toLowerCase().includes(preset.label.toLowerCase()) ||
        preset.data.title.toLowerCase().includes(e.title.toLowerCase()) ||
        (e.commission.toLowerCase().includes(preset.data.commission.toLowerCase().split('(')[0].trim()) &&
         e.paper.toLowerCase().includes(preset.data.paper.toLowerCase().split(':')[0].trim()));
      return titleMatch && e.pattern_status === 'VERIFIED' && e.exam_profile_status === 'VERIFIED';
    });

    if (existingVerified) {
      // Load verified record
      setFormData({
        title: existingVerified.title,
        commission: existingVerified.commission,
        state_or_central: existingVerified.state_or_central,
        post: existingVerified.post,
        stage: existingVerified.stage,
        paper: existingVerified.paper,
        recruitment_cycle: existingVerified.recruitment_cycle,
        total_questions: existingVerified.pattern.total_questions,
        duration_minutes: existingVerified.pattern.duration_minutes,
        marks_per_question: existingVerified.pattern.marks_per_question,
        negative_marking_rate: existingVerified.pattern.negative_marking_rate,
        sections: existingVerified.pattern.sections,
        syllabus_topics: existingVerified.syllabus_topics,
        mediums: existingVerified.pattern.mediums,
        target_date: existingVerified.target_date,
        notes: `Verified record loaded from database. Confidence: ${existingVerified.source_confidence_score}%`,
        pattern_status: 'VERIFIED',
        exam_profile_status: 'VERIFIED'
      });
      setRawSections(existingVerified.pattern.sections.join('\n'));
      setRawTopics(existingVerified.syllabus_topics.join('\n'));
      setRawMediums(existingVerified.pattern.mediums.join(', '));

      setPresetNotice({
        type: 'VERIFIED',
        message: `Verified exam profile loaded from database for "${existingVerified.title}". Blueprint and pattern are officially confirmed.`,
        examTitle: existingVerified.title
      });
      if (isCentralExam(existingVerified)) {
        setFormJurisdictionType('CENTRAL');
      } else {
        setFormJurisdictionType('STATE');
        const st = getExamState(existingVerified);
        if (st) setFormSelectedState(st);
      }
    } else {
      // Shortcut only: Mark PATTERN_STATUS = UNVERIFIED
      setFormData({
        ...preset.data,
        pattern_status: 'UNVERIFIED',
        exam_profile_status: 'RESEARCH_REQUIRED',
        notes: 'Preset applied as identification shortcut. Official pattern and syllabus require verification via Research Engine.'
      });
      setRawSections(preset.data.sections.join('\n'));
      setRawTopics(preset.data.syllabus_topics.join('\n'));
      setRawMediums(preset.data.mediums.join(', '));

      setPresetNotice({
        type: 'SHORTCUT',
        message: `Preset loaded as identification shortcut only. PATTERN_STATUS is marked UNVERIFIED. Official syllabus and negative marking must be verified via the Research Engine before generating mock tests.`,
        examTitle: preset.data.title
      });
    // Auto-detect stages for preset
    void (async () => {
      try {
        const res = await fetch('/api/research/exam-structure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: preset.data.title })
        });
        if (res.ok) {
          const d = await res.json();
          if (d.structure?.stages) {
            setFormStages(d.structure.stages);
          }
        }
      } catch (err) {}
    })();
      if (preset.tier === 'CENTRAL') {
        setFormJurisdictionType('CENTRAL');
      } else {
        setFormJurisdictionType('STATE');
        if (preset.state) setFormSelectedState(preset.state);
      }
    }
  };

  const handleOpenVerifyModal = (exam: ExamRecord, fact?: { key: CriticalFactName; label: string; currentValue: any }) => {
    setVerifyingExam(exam);
    setTargetFact(fact || null);
  };


  // Official Document Syllabus Extraction State
  const [showDocExtractor, setShowDocExtractor] = useState<boolean>(false);
  const [showYoutubeExtractor, setShowYoutubeExtractor] = useState<boolean>(false);
  const [docText, setDocText] = useState<string>('');
  const [docName, setDocName] = useState<string>('');
  const [isExtractingDoc, setIsExtractingDoc] = useState<boolean>(false);
  const [docExtractError, setDocExtractError] = useState<string | null>(null);
  const [docExtractSuccess, setDocExtractSuccess] = useState<string | null>(null);

  const handleExtractFromDocument = async (customText?: string, base64?: string, filename?: string) => {
    setIsExtractingDoc(true);
    setDocExtractError(null);
    setDocExtractSuccess(null);
    try {
      const textToUse = customText !== undefined ? customText : docText;
      const nameToUse = filename || docName || 'Official Notification Document';
      const payload: any = {
        document_text: textToUse,
        document_name: nameToUse,
        exam_query: formData.title || ''
      };
      if (base64) payload.pdf_base64 = base64;

      const res = await fetch('/api/research/extract-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract from document');
      }

      if (data.extracted) {
        const ext = data.extracted;
        setFormData(prev => ({
          ...prev,
          title: ext.exam_name || prev.title,
          commission: ext.authority || prev.commission,
          recruitment_cycle: ext.recruitment_cycle || prev.recruitment_cycle,
          stage: ext.primary_stage_name || prev.stage,
          paper: ext.primary_paper_name || prev.paper,
          total_questions: ext.pattern.total_questions || prev.total_questions,
          duration_minutes: ext.pattern.duration_minutes || prev.duration_minutes,
          marks_per_question: ext.pattern.marks_per_question || prev.marks_per_question,
          negative_marking_rate: ext.pattern.negative_marking_rate ?? prev.negative_marking_rate,
          sections: ext.pattern.sections.length > 0 ? ext.pattern.sections : prev.sections,
          syllabus_topics: ext.syllabus_topics.length > 0 ? ext.syllabus_topics : prev.syllabus_topics,
          mediums: ext.pattern.mediums.length > 0 ? ext.pattern.mediums : prev.mediums,
          notes: `Official notification extracted: ${data.document_name} (${ext.syllabus_topics.length} syllabus topics). Confidence: ${ext.confidence}%`,
          structure_scheme: {
            query: ext.exam_name,
            exam_name: ext.exam_name,
            commission: ext.authority,
            state_or_central: prev.state_or_central,
            recruitment_cycle: ext.recruitment_cycle,
            total_stages: ext.stages.length,
            selection_summary: `Selection comprising ${ext.stages.length} stages extracted from official notification.`,
            source_status: ext.is_official_gazette ? 'VERIFIED_OFFICIAL_CATALOG' : 'LIVE_AI_RETRIEVED',
            stages: ext.stages
          }
        }));

        if (ext.stages && ext.stages.length > 0) {
          setFormStages(ext.stages);
        }
        if (ext.pattern.sections.length > 0) {
          setRawSections(ext.pattern.sections.join('\n'));
        }
        if (ext.syllabus_topics.length > 0) {
          setRawTopics(ext.syllabus_topics.join('\n'));
        }
        if (ext.pattern.mediums.length > 0) {
          setRawMediums(ext.pattern.mediums.join(', '));
        }

        setDocExtractSuccess(`Extracted ${ext.syllabus_topics.length} syllabus topics and ${ext.stages.length} stages from ${data.document_name || 'document'}!`);
      }
    } catch (err: any) {
      setDocExtractError(err.message || 'Failed to extract syllabus from document');
    } finally {
      setIsExtractingDoc(false);
    }
  };

  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocName(file.name);
    setDocExtractError(null);
    setDocExtractSuccess(null);

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setIsExtractingDoc(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        if (arrayBuffer) {
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          await handleExtractFromDocument('', base64, file.name);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        setDocText(text || '');
        await handleExtractFromDocument(text || '', undefined, file.name);
      };
      reader.readAsText(file);
    }
  };

  // Multi-Stage & Multi-Paper Hierarchy State
  const [formStages, setFormStages] = useState<ExamStage[]>([]);
  const [isAutoDetecting, setIsAutoDetecting] = useState<boolean>(false);
  const [activeFocusedPaperId, setActiveFocusedPaperId] = useState<string>('');

  const handleAutoDetectStructure = async () => {
    const q = (formData.title || `${formData.commission} ${formData.post}`).trim();
    if (!q) {
      alert('Please enter Examination Title or Commission first to auto-detect its stages and papers.');
      return;
    }
    setIsAutoDetecting(true);
    try {
      const res = await fetch('/api/research/exam-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.structure && Array.isArray(data.structure.stages)) {
          setFormStages(data.structure.stages);
          setFormData(prev => ({
            ...prev,
            structure_scheme: data.structure,
            recruitment_cycle: data.structure.recruitment_cycle || prev.recruitment_cycle
          }));

          const firstStage = data.structure.stages[0];
          const firstPaper = firstStage?.papers?.[0];
          if (firstStage && firstPaper) {
            handleFocusPaper(firstPaper, firstStage);
          }
        }
      }
    } catch (err) {
      console.error('Failed to auto-detect structure in intake:', err);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleFocusPaper = (paper: ExamStagePaper, stage: ExamStage) => {
    setActiveFocusedPaperId(paper.paper_id);
    setFormData(prev => ({
      ...prev,
      stage: stage.stage_name,
      paper: `${paper.paper_number}: ${paper.title}`,
      total_questions: paper.total_questions || prev.total_questions || 100,
      duration_minutes: paper.duration_minutes || prev.duration_minutes || 120,
      marks_per_question: (paper.total_marks && paper.total_questions) ? Number((paper.total_marks / paper.total_questions).toFixed(2)) : 1,
      negative_marking_rate: paper.negative_marking_rate ?? prev.negative_marking_rate ?? 0.25,
      sections: paper.sections && paper.sections.length > 0 ? paper.sections : prev.sections,
      syllabus_topics: paper.syllabus_highlights && paper.syllabus_highlights.length > 0 ? paper.syllabus_highlights : prev.syllabus_topics
    }));
    if (paper.sections && paper.sections.length > 0) {
      setRawSections(paper.sections.join('\n'));
    }
    if (paper.syllabus_highlights && paper.syllabus_highlights.length > 0) {
      setRawTopics(paper.syllabus_highlights.join('\n'));
    }
    if (paper.language_mediums && paper.language_mediums.length > 0) {
      setRawMediums(paper.language_mediums.join(', '));
    }
  };

  const handleAddStage = () => {
    const stageNum = formStages.length + 1;
    const newStage: ExamStage = {
      stage_id: `stage_${Date.now().toString(36)}_${stageNum}`,
      stage_number: stageNum,
      stage_name: `Stage ${stageNum}: ${stageNum === 1 ? 'Preliminary Test' : stageNum === 2 ? 'Mains Written Examination' : 'Interview / Physical Test'}`,
      stage_type: stageNum === 1 ? 'PRELIMINARY' : stageNum === 2 ? 'MAINS' : 'INTERVIEW',
      is_qualifying_only: stageNum === 1,
      total_papers: 1,
      papers: [
        {
          paper_id: `paper_${Date.now().toString(36)}_1`,
          paper_number: 'Paper-I',
          title: 'General Studies & Abilities',
          type: 'OBJECTIVE',
          total_questions: 150,
          total_marks: 150,
          duration_minutes: 150,
          negative_marking_rate: 0.25,
          is_qualifying: false,
          sections: ['General Studies', 'General Ability', 'Basic Science & Current Affairs']
        }
      ]
    };
    setFormStages(prev => [...prev, newStage]);
  };

  const handleRemoveStage = (stageId: string) => {
    setFormStages(prev => prev.filter(s => s.stage_id !== stageId));
  };

  const handleAddPaper = (stageId: string) => {
    setFormStages(prev => prev.map(s => {
      if (s.stage_id !== stageId) return s;
      const papers = s.papers || [];
      const pNum = papers.length + 1;
      const newPaper: ExamStagePaper = {
        paper_id: `paper_${Date.now().toString(36)}_${pNum}`,
        paper_number: `Paper-${pNum}`,
        title: `Paper ${pNum}: Subject Domain`,
        type: s.stage_type === 'MAINS' ? 'DESCRIPTIVE' : 'OBJECTIVE',
        total_questions: 150,
        total_marks: 150,
        duration_minutes: 150,
        negative_marking_rate: 0.25,
        is_qualifying: false,
        sections: ['General Studies', 'Domain Subject']
      };
      return {
        ...s,
        total_papers: papers.length + 1,
        papers: [...papers, newPaper]
      };
    }));
  };

  const handleRemovePaper = (stageId: string, paperId: string) => {
    setFormStages(prev => prev.map(s => {
      if (s.stage_id !== stageId) return s;
      const papers = s.papers || [];
      return {
        ...s,
        total_papers: Math.max(0, papers.length - 1),
        papers: papers.filter(p => p.paper_id !== paperId)
      };
    }));
  };

  const handleUpdatePaper = (stageId: string, paperId: string, patch: Partial<ExamStagePaper>) => {
    setFormStages(prev => prev.map(s => {
      if (s.stage_id !== stageId) return s;
      const papers = s.papers || [];
      return {
        ...s,
        papers: papers.map(p => p.paper_id === paperId ? { ...p, ...patch } : p)
      };
    }));
  };

  const handleUpdateStage = (stageId: string, patch: Partial<ExamStage>) => {
    setFormStages(prev => prev.map(s => s.stage_id === stageId ? { ...s, ...patch } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.commission?.trim()) {
      alert('Please provide both Examination Title and Recruiting Commission.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ExamIntakeInput = {
        ...formData,
        title: formData.title.trim(),
        commission: formData.commission.trim(),
        post: formData.post?.trim() || formData.title.trim(),
        paper: formData.paper?.trim() || 'Paper-I',
        recruitment_cycle: formData.recruitment_cycle?.trim() || 'Current Notification',
        sections: rawSections.split('\n').map(s => s.trim()).filter(Boolean),
        syllabus_topics: rawTopics.split('\n').map(s => s.trim()).filter(Boolean),
        mediums: rawMediums.split(',').map(s => s.trim()).filter(Boolean),
        stages: formStages.length > 0 ? formStages : undefined,
      };

      const res = await fetch('/api/intake/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({} as any));
        throw new Error(errData.error || `Failed to register exam intake (HTTP ${res.status})`);
      }
      const data = await res.json();
      onIntakeCreated(data.exam);
      setShowForm(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to register exam intake.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>EXAM INTAKE WORKFLOW</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Government Examination Intake Pipeline</h1>
          <p className="text-sm text-slate-600 mt-1">
            Formalize candidate examination specifications, commission rules, negative marking scheme, and syllabus domains before launching research.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => setShowYoutubeExtractor(!showYoutubeExtractor)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm cursor-pointer whitespace-nowrap border ${
              showYoutubeExtractor
                ? 'bg-red-600 text-white border-red-600 ring-2 ring-red-200'
                : 'bg-white text-slate-800 border-red-200 hover:bg-red-50/70 hover:border-red-300'
            }`}
          >
            <Youtube className={`w-4 h-4 ${showYoutubeExtractor ? 'text-white' : 'text-red-600'}`} />
            <span>{showYoutubeExtractor ? 'Close Video Extractor' : '🎥 Read YouTube Video'}</span>
          </button>

          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{showForm ? 'Close Intake Form' : 'Register New Exam Intake'}</span>
          </button>
        </div>
      </div>

      {/* Top-Level YouTube Video Intelligence Extractor Drawer */}
      {showYoutubeExtractor && (
        <div className="animate-in fade-in duration-200">
          <YoutubeMaterialExtractor
            exams={exams}
            selectedExamId={expandedExamId || undefined}
            onMaterialSaved={handleUpdateExamRecord}
          />
        </div>
      )}

      {/* Hierarchical 3-Step Intake Wizard Drawer */}
      {showForm && (
        <HierarchicalIntakeWizard
          onIntakeCreated={(created) => {
            onIntakeCreated(created);
            setShowForm(false);
            if (onRefreshExams) onRefreshExams();
          }}
          onCancel={() => setShowForm(false)}
          existingExams={exams}
        />
      )}

      {/* Existing Registered Exams Table */}
      {(() => {
        const activeExams = exams.filter(e => !deletedExamIds.includes(e.exam_id));
        const { central: centralExams, states: stateGroups, stateNames } = groupExamsByJurisdiction(activeExams);
        const baseFilteredExams = filterExamsByJurisdiction(activeExams, registryFilterTier, registrySelectedState);

        // Find available boards for current jurisdiction context
        const contextBoards = (registryFilterTier === 'CENTRAL'
          ? getCentralBoards()
          : registryFilterTier === 'STATE' && registrySelectedState !== 'ALL_STATES'
          ? getBoardsForState(registrySelectedState)
          : []).filter(board => !hiddenBoardIds.includes(board.id));

        const displayedExams = registrySelectedBoard === 'ALL_BOARDS'
          ? baseFilteredExams
          : baseFilteredExams.filter(exam => {
              const b = getBoardForExam(exam);
              return b?.id === registrySelectedBoard;
            });

        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-900">Intake Registry & Active Examinations</h2>
                <p className="text-xs text-slate-500">Exams grouped and organized by conducting board authorities and commissions.</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full">
                {displayedExams.length} / {exams.length} Exams Shown
              </span>
            </div>

            {/* Jurisdiction Filter Bar */}
            <div className="p-3.5 bg-slate-100/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-600 mr-1">Filter Jurisdiction:</span>
                <button
                  type="button"
                  onClick={() => { setRegistryFilterTier('ALL'); setRegistrySelectedState('ALL_STATES'); setRegistrySelectedBoard('ALL_BOARDS'); }}
                  className={`px-3 py-1.5 rounded-lg font-medium border transition-all cursor-pointer ${
                    registryFilterTier === 'ALL'
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All ({exams.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setRegistryFilterTier('CENTRAL'); setRegistrySelectedState('ALL_STATES'); setRegistrySelectedBoard('ALL_BOARDS'); }}
                  className={`px-3 py-1.5 rounded-lg font-medium border transition-all cursor-pointer ${
                    registryFilterTier === 'CENTRAL'
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🏛️ Central ({centralExams.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setRegistryFilterTier('STATE'); setRegistrySelectedBoard('ALL_BOARDS'); }}
                  className={`px-3 py-1.5 rounded-lg font-medium border transition-all cursor-pointer ${
                    registryFilterTier === 'STATE'
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🗺️ State-Wise ({exams.length - centralExams.length})
                </button>
              </div>

              {/* If State-Wise, render sub-state filter chips */}
              {registryFilterTier === 'STATE' && (
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">State:</span>
                  <button
                    type="button"
                    onClick={() => { setRegistrySelectedState('ALL_STATES'); setRegistrySelectedBoard('ALL_BOARDS'); }}
                    className={`text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                      registrySelectedState === 'ALL_STATES'
                        ? 'bg-purple-600 text-white border-purple-600 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    All States
                  </button>
                  {stateNames.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => { setRegistrySelectedState(st); setRegistrySelectedBoard('ALL_BOARDS'); }}
                      className={`text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                        registrySelectedState === st
                          ? 'bg-purple-600 text-white border-purple-600 font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st} ({stateGroups[st]?.length || 0})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Conducting Board Branch Sub-Filter */}
            {/* Conducting Board Branch Sub-Filter with Board Deletion */}
            {contextBoards.length > 0 && (
              <>
                <div className="px-4 py-2.5 bg-amber-50/70 border-b border-amber-200 flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="font-bold text-amber-900 mr-1 flex items-center gap-1">
                    <span>🏢</span>
                    <span>Conducting Board Branch:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setRegistrySelectedBoard('ALL_BOARDS')}
                    className={`px-2.5 py-1 rounded-md border text-xs transition-all cursor-pointer ${
                      registrySelectedBoard === 'ALL_BOARDS'
                        ? 'bg-amber-700 text-white border-amber-700 font-bold shadow-xs'
                        : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    All Boards ({baseFilteredExams.length})
                  </button>
                  {contextBoards.map(board => {
                    const count = baseFilteredExams.filter(e => getBoardForExam(e)?.id === board.id).length;
                    const isSelected = registrySelectedBoard === board.id;
                    return (
                      <div
                        key={board.id}
                        className={`inline-flex items-center rounded-md border text-xs transition-all overflow-hidden shadow-2xs ${
                          isSelected
                            ? 'bg-amber-700 text-white border-amber-700 font-bold'
                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setRegistrySelectedBoard(board.id)}
                          className="px-2.5 py-1 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{board.icon}</span>
                          <span className="font-medium">{board.shortName}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isSelected ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {count}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBoard(board);
                          }}
                          className={`px-1.5 py-1 text-xs transition-colors hover:bg-rose-600 hover:text-white cursor-pointer ${
                            isSelected ? 'text-amber-200 border-l border-amber-600' : 'text-slate-400 hover:text-white border-l border-amber-200'
                          }`}
                          title={`Delete board "${board.shortName}" ${count > 0 ? `(${count} exams)` : ''}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}

                  {hiddenBoardIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleRestoreBoards}
                      className="text-[11px] text-amber-900 underline hover:text-amber-700 ml-2 cursor-pointer font-medium"
                    >
                      Restore All Boards ({hiddenBoardIds.length})
                    </button>
                  )}
                </div>

                {/* Selected Board Actions Banner */}
                {registrySelectedBoard !== 'ALL_BOARDS' && (() => {
                  const selectedBoardInfo = contextBoards.find(b => b.id === registrySelectedBoard);
                  if (!selectedBoardInfo) return null;
                  const count = baseFilteredExams.filter(e => getBoardForExam(e)?.id === selectedBoardInfo.id).length;
                  return (
                    <div className="px-4 py-2 bg-amber-100/70 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-950 flex items-center gap-1">
                          <span>{selectedBoardInfo.icon}</span>
                          <span>{selectedBoardInfo.name}</span>
                        </span>
                        <span className="text-amber-800 font-medium">({count} Registered Exams)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteBoard(selectedBoardInfo)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold border border-rose-300 transition-colors shadow-2xs cursor-pointer text-xs"
                          title={`Delete board "${selectedBoardInfo.shortName}" and all registered exams under it`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Delete Board ({selectedBoardInfo.shortName})</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            <div className="divide-y divide-slate-200">
              {displayedExams.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No registered examinations match the selected jurisdiction or board filter.
                </div>
              ) : (
              displayedExams.map((exam) => {
                const isExpanded = expandedExamId === exam.exam_id;
                const stageCount = exam.stages?.length || exam.structure_scheme?.stages?.length || 1;
                const paperCount = exam.stages?.reduce((acc, s) => acc + (s.papers?.length || 0), 0) || 1;

                return (
                  <div key={exam.exam_id} className={`p-5 transition-all ${isExpanded ? 'bg-slate-50/90 border-l-4 border-l-indigo-600' : 'hover:bg-slate-50/70'}`}>
                    {/* Header Row: Badges & Quick Action Buttons */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Distinctive Jurisdiction Badge */}
                        <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${
                          isCentralExam(exam)
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-purple-50 text-purple-800 border-purple-300'
                        }`}>
                          {isCentralExam(exam) ? '🏛️ Central (National)' : `🗺️ State: ${getExamState(exam) || exam.state_or_central}`}
                        </span>

                        {/* Conducting Board Badge */}
                        {(() => {
                          const board = getBoardForExam(exam);
                          if (!board) return null;
                          return (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                              <span>{board.icon}</span>
                              <span>{board.shortName}</span>
                            </span>
                          );
                        })()}

                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {exam.commission}
                        </span>
                  
                        {/* Pattern Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          exam.pattern_status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : exam.pattern_status === 'CONFLICT'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          Pattern: {exam.pattern_status || 'UNVERIFIED'}
                        </span>

                        {/* Profile Status Badge */}
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          exam.exam_profile_status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : exam.exam_profile_status === 'STALE'
                            ? 'bg-orange-50 text-orange-800 border-orange-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          Profile: {exam.exam_profile_status || 'RESEARCH_REQUIRED'}
                        </span>
                      </div>

                      {/* Standardized Card Action Buttons (Identical for all exam cards) */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onNavigateToMocks(exam.exam_id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                          title="Open mock tests and blueprint studio"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Mocks</span>
                        </button>

                        {exam.exam_profile_status === 'VERIFIED' ? (
                          <button
                            type="button"
                            onClick={() => onLaunchResearch(exam.title, 'HYBRID', exam.exam_id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition-colors shadow-2xs cursor-pointer"
                            title="Re-verify official syllabus & facts"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Re-Verify</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenVerifyModal(exam)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors shadow-2xs cursor-pointer"
                              title="Sign-off facts"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Sign-Off</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onLaunchResearch(exam.title, 'HYBRID', exam.exam_id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                              title="Launch research to verify exam"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                              <span>Verify</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setAuditLogsExam(exam)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-2xs cursor-pointer"
                          title="View system audit trail"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-600" />
                          <span>Audit</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (expandedExamId !== exam.exam_id) {
                              setExpandedExamId(exam.exam_id);
                            }
                            toggleExamSection(exam.exam_id, 'MATERIALS');
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors shadow-2xs cursor-pointer ${
                            (exam.study_materials?.length || 0) > 0
                              ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                          title="Read YouTube videos & view study material notes for this exam"
                        >
                          <Youtube className="w-3.5 h-3.5 text-red-600" />
                          <span>Notes {exam.study_materials && exam.study_materials.length > 0 ? `(${exam.study_materials.length})` : ''}</span>
                        </button>

                        {/* Standardized Delete Option on Every Card */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete "${exam.title}"? This cannot be undone.`)) {
                              handleDeleteExam(exam.exam_id);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-bold border border-rose-200 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                          title={`Delete examination "${exam.title}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Clickable Exam Title Row (Clicking Exam Name Expands Hierarchy) */}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => toggleExamExpanded(exam.exam_id)}
                        className="w-full text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-indigo-50/60 transition-colors group cursor-pointer focus:outline-none"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <div className={`p-1.5 rounded-md transition-colors ${
                            isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white'
                          }`}>
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 shrink-0" />
                            ) : (
                              <ChevronRight className="w-5 h-5 shrink-0" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {exam.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {isExpanded ? (
                                <span className="text-indigo-600 font-semibold">Click to collapse examination hierarchy</span>
                              ) : (
                                <span>Click to view selection pattern, stages, papers & subjects</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
                          <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                            {stageCount} {stageCount === 1 ? 'Stage' : 'Stages'} • {paperCount} {paperCount === 1 ? 'Paper' : 'Papers'}
                          </span>
                          <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                            {exam.pattern.total_questions} Qs • {exam.pattern.duration_minutes} Mins
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                            {(exam.languages || exam.pattern.languages || exam.pattern.mediums || ['English']).join(' / ')}
                          </span>
                          {((exam.exceptions || exam.pattern.exceptions || []).length > 0) && (
                            <span
                              className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full border border-amber-200"
                              title={(exam.exceptions || exam.pattern.exceptions || []).map(e => `${e.subject}: ${e.language}`).join(', ')}
                            >
                              {(exam.exceptions || exam.pattern.exceptions || []).length} Exception{((exam.exceptions || exam.pattern.exceptions || []).length > 1 ? 's' : '')}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Progressive Disclosure: Revealed ONLY when Exam Title is clicked */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-4 animate-in fade-in duration-150">
                        {/* 4-Level Drilldown: Pattern -> Stages -> Papers -> Subjects with Full Editing & Deletion */}
                        <ExamHierarchyDrilldown
                          exam={exam}
                          onUpdateExam={handleUpdateExamRecord}
                          onDeleteExam={handleDeleteExam}
                          onRefreshExams={onRefreshExams}
                        />

                        {/* Auxiliary Verification Matrix & Cycle Manager Tabs */}
                        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleExamSection(exam.exam_id, 'CYCLES')}
                              className={`px-3 py-1.5 rounded-lg font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                expandedExamSections[exam.exam_id] === 'CYCLES'
                                  ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <History className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Cycle Versions ({exam.pattern_versions?.length || 1})</span>
                              {expandedExamSections[exam.exam_id] === 'CYCLES' ? (
                                <ChevronUp className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleExamSection(exam.exam_id, 'MATERIALS')}
                              className={`px-3 py-1.5 rounded-lg font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                                expandedExamSections[exam.exam_id] === 'MATERIALS'
                                  ? 'bg-red-700 text-white border-red-700 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <Youtube className="w-3.5 h-3.5 text-red-500" />
                              <span>Study Material Notes ({exam.study_materials?.length || 0})</span>
                              {expandedExamSections[exam.exam_id] === 'MATERIALS' ? (
                                <ChevronUp className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                              )}
                            </button>
                          </div>

                          <div className="text-[11px] text-slate-500">
                            Active Cycle: <strong className="text-slate-800">{exam.active_cycle || exam.recruitment_cycle}</strong>
                          </div>
                        </div>

                        {/* Sub-Panel: Recruitment Cycle Manager */}
                        {expandedExamSections[exam.exam_id] === 'CYCLES' && (
                          <div className="mt-3 animate-in fade-in">
                            <RecruitmentCycleManager
                              exam={exam}
                              onSwitchCycle={(cycle) => handleSwitchCycle(exam.exam_id, cycle)}
                              onAddCycleVersion={(ver) => handleAddCycleVersion(exam.exam_id, ver)}
                            />
                          </div>
                        )}

                        {/* Sub-Panel: YouTube Study Material Notes */}
                        {expandedExamSections[exam.exam_id] === 'MATERIALS' && (
                          <div className="mt-3 animate-in fade-in">
                            <YoutubeMaterialExtractor
                              exams={exams}
                              selectedExamId={exam.exam_id}
                              onMaterialSaved={handleUpdateExamRecord}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
        )}
      </div>
    </div>
  );
})()}

      {/* Auditor Verification Modal */}
      {verifyingExam && (
        <AuditorSignoffModal
          exam={verifyingExam}
          targetFact={targetFact}
          onClose={() => {
            setVerifyingExam(null);
            setTargetFact(null);
          }}
          onSignoffSuccess={handleFactSignoffSuccess}
        />
      )}

      {/* System Audit Logs Modal */}
      {auditLogsExam && (
        <SystemAuditLogsModal
          examId={auditLogsExam.exam_id}
          examTitle={auditLogsExam.title}
          onClose={() => setAuditLogsExam(null)}
        />
      )}
    </div>
  );
};
