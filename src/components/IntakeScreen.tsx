import React, { useState } from 'react';
import {
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
  ChevronUp
} from 'lucide-react';
import { ExamIntakeInput, ExamRecord, ResearchMode, CriticalFactName, ExamPatternVersion } from '../types';
import { FieldVerificationMatrix } from './FieldVerificationMatrix';
import { RecruitmentCycleManager } from './RecruitmentCycleManager';
import { AuditorSignoffModal } from './AuditorSignoffModal';
import { SystemAuditLogsModal } from './SystemAuditLogsModal';

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
  data: ExamIntakeInput;
}

const PRESET_TEMPLATES: PresetItem[] = [
  {
    id: 'tgpsc_g2',
    label: 'TGPSC Group 2',
    shortTag: 'Telangana',
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

  // Auditor Sign-off Modal state
  const [verifyingExam, setVerifyingExam] = useState<ExamRecord | null>(null);
  const [targetFact, setTargetFact] = useState<{
    key: CriticalFactName;
    label: string;
    currentValue: any;
  } | null>(null);

  // System Audit Logs modal state
  const [auditLogsExam, setAuditLogsExam] = useState<ExamRecord | null>(null);

  // Active sub-panels per exam: 'MATRIX' | 'CYCLES' | 'NONE'
  const [expandedExamSections, setExpandedExamSections] = useState<Record<string, 'MATRIX' | 'CYCLES' | 'NONE'>>({
    tgpsc_group_2_paper_1: 'MATRIX',
    appsc_group_2_screening: 'MATRIX',
  });

  const toggleExamSection = (examId: string, section: 'MATRIX' | 'CYCLES') => {
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
    }
  };

  const handleOpenVerifyModal = (exam: ExamRecord, fact?: { key: CriticalFactName; label: string; currentValue: any }) => {
    setVerifyingExam(exam);
    setTargetFact(fact || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.commission) return;

    setIsSubmitting(true);
    try {
      const payload: ExamIntakeInput = {
        ...formData,
        sections: rawSections.split('\n').map(s => s.trim()).filter(Boolean),
        syllabus_topics: rawTopics.split('\n').map(s => s.trim()).filter(Boolean),
        mediums: rawMediums.split(',').map(s => s.trim()).filter(Boolean),
      };

      const res = await fetch('/api/intake/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Intake submission failed');
      const data = await res.json();
      onIntakeCreated(data.exam);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      alert('Failed to register exam intake.');
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

        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer whitespace-nowrap"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showForm ? 'Close Intake Form' : 'Register New Exam Intake'}</span>
        </button>
      </div>

      {/* Intake Form Drawer / Modal */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-indigo-200 shadow-md p-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">New Examination Intake Specifications</h2>
              <p className="text-xs text-slate-500">Provide official commission details or select a standardized preset template below.</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600 mr-1">Presets:</span>
              {PRESET_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleSelectPreset(tpl)}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-medium border border-slate-200 transition-colors inline-flex items-center gap-1"
                >
                  <span>{tpl.label}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({tpl.shortTag})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preset Safety Notice Banner */}
          {presetNotice && (
            <div className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              presetNotice.type === 'VERIFIED'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <div className="flex items-start gap-2.5">
                {presetNotice.type === 'VERIFIED' ? (
                  <FileCheck2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-sm">
                    {presetNotice.type === 'VERIFIED'
                      ? 'Verified Database Profile Loaded'
                      : 'Identification Shortcut Applied (Pattern Unverified)'}
                  </div>
                  <div className="mt-0.5 leading-relaxed text-slate-700">
                    {presetNotice.message}
                  </div>
                </div>
              </div>

              {presetNotice.type === 'SHORTCUT' && (
                <button
                  type="button"
                  onClick={() => onLaunchResearch(formData.title || presetNotice.examTitle, 'HYBRID')}
                  className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Verify via Research Engine</span>
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Title */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Examination Formal Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. TGPSC Group-II Services: Paper I (General Studies & General Abilities)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Commission */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Recruiting Commission / Authority *
              </label>
              <input
                type="text"
                required
                value={formData.commission}
                onChange={e => setFormData({ ...formData, commission: e.target.value })}
                placeholder="e.g. Telangana Public Service Commission (TGPSC)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* State or Central */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                State / Central Jurisdiction
              </label>
              <input
                type="text"
                value={formData.state_or_central}
                onChange={e => setFormData({ ...formData, state_or_central: e.target.value })}
                placeholder="e.g. Telangana, Andhra Pradesh, Central"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Post Cadres */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Post Cadres
              </label>
              <input
                type="text"
                value={formData.post}
                onChange={e => setFormData({ ...formData, post: e.target.value })}
                placeholder="e.g. Municipal Commissioner, Sub-Registrar, ACTO"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Cycle */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Notification / Recruitment Cycle
              </label>
              <input
                type="text"
                value={formData.recruitment_cycle}
                onChange={e => setFormData({ ...formData, recruitment_cycle: e.target.value })}
                placeholder="e.g. Notification 28/2022 (2024 Cycle)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Stage */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Examination Stage
              </label>
              <input
                type="text"
                value={formData.stage}
                onChange={e => setFormData({ ...formData, stage: e.target.value })}
                placeholder="e.g. Written Examination (Objective)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Paper */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Specific Paper Specification
              </label>
              <input
                type="text"
                value={formData.paper}
                onChange={e => setFormData({ ...formData, paper: e.target.value })}
                placeholder="e.g. Paper-I: General Studies & Abilities"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Target Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Tentative / Scheduled Date
              </label>
              <input
                type="date"
                value={formData.target_date || ''}
                onChange={e => setFormData({ ...formData, target_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Exam Pattern Blueprint Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Blueprint & Evaluation Matrix</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Total Questions</label>
                <input
                  type="number"
                  value={formData.total_questions}
                  onChange={e => setFormData({ ...formData, total_questions: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Marks per Question</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.marks_per_question}
                  onChange={e => setFormData({ ...formData, marks_per_question: parseFloat(e.target.value) || 1 })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Negative Marking Fraction</label>
                <select
                  value={formData.negative_marking_rate}
                  onChange={e => setFormData({ ...formData, negative_marking_rate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm bg-white"
                >
                  <option value={0}>0 (No negative marks)</option>
                  <option value={0.25}>1/4th (0.25 penalty) - TGPSC Standard</option>
                  <option value={0.33}>1/3rd (0.33 penalty) - APPSC / UPSC</option>
                  <option value={0.50}>1/2 (0.50 penalty) - SSC CGL Tier 1</option>
                </select>
              </div>
            </div>
          </div>

          {/* Syllabus & Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Sections in Examination (One per line)
              </label>
              <textarea
                rows={4}
                value={rawSections}
                onChange={e => setRawSections(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="e.g.&#10;History and Cultural Heritage&#10;Indian Constitution & Polity&#10;Telangana Economy"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Syllabus Topics & Key High-Yield Areas (One per line)
              </label>
              <textarea
                rows={4}
                value={rawTopics}
                onChange={e => setRawTopics(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="e.g.&#10;Constitutional Articles 371D and 263&#10;Telangana Socio-Economic Outlook&#10;Kakatiya Dynasty Inscriptions"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering Intake...' : 'Save & Register Intake'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Existing Registered Exams Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Intake Registry & Active Examinations</h2>
            <p className="text-xs text-slate-500">Exams currently tracked in the system database with official patterns and syllabus mappings.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full">
            {exams.length} Exams Managed
          </span>
        </div>

        <div className="divide-y divide-slate-200">
          {exams.map((exam) => (
            <div key={exam.exam_id} className="p-6 hover:bg-slate-50/70 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      {exam.commission}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {exam.state_or_central}
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

                  <h3 className="text-lg font-bold text-slate-900">{exam.title}</h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600 pt-1">
                    <div>
                      <span className="text-slate-400 block">Paper / Stage:</span>
                      <span className="font-medium text-slate-800">{exam.paper}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Evaluation Scheme:</span>
                      <span className="font-medium text-slate-800">
                        {exam.pattern.total_questions} Qs | {exam.pattern.duration_minutes} Mins | -{exam.pattern.negative_marking_rate} Neg
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Recruitment Cycle:</span>
                      <span className="font-medium text-slate-800">{exam.recruitment_cycle}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Syllabus Scope:</span>
                      <span className="font-medium text-slate-800">{exam.syllabus_topics.length} Key Domains</span>
                    </div>
                  </div>

                  {/* Topic pills */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {exam.syllabus_topics.slice(0, 4).map((topic, tidx) => (
                      <span key={tidx} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">
                        {topic}
                      </span>
                    ))}
                    {exam.syllabus_topics.length > 4 && (
                      <span className="text-[11px] px-1.5 py-0.5 text-slate-400">
                        +{exam.syllabus_topics.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions and Readiness Gate */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                  {exam.exam_profile_status === 'VERIFIED' ? (
                    <>
                      <button
                        onClick={() => onNavigateToMocks(exam.exam_id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>View / Generate Mocks</span>
                      </button>
                      <button
                        onClick={() => setAuditLogsExam(exam)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Audit Trail</span>
                      </button>
                      <button
                        onClick={() => onLaunchResearch(exam.title, 'HYBRID', exam.exam_id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Re-Verify Research</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleOpenVerifyModal(exam)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Auditor Sign-Off</span>
                      </button>
                      <button
                        onClick={() => onLaunchResearch(exam.title, 'HYBRID', exam.exam_id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                        <span>Verify via Research Engine</span>
                      </button>
                      <button
                        onClick={() => onNavigateToMocks(exam.exam_id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-medium border border-amber-200 transition-colors"
                        title="Readiness Gate Warning: Mock generation blocked until all 12 facts verified"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Gate: Incomplete Facts</span>
                      </button>
                      <button
                        onClick={() => setAuditLogsExam(exam)}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Audit Logs</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Toggles for Matrix & Cycle Versions */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExamSection(exam.exam_id, 'MATRIX')}
                    className={`px-3 py-1.5 rounded-lg font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      expandedExamSections[exam.exam_id] === 'MATRIX'
                        ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Field-Level Matrix (12 Facts)</span>
                    {expandedExamSections[exam.exam_id] === 'MATRIX' ? (
                      <ChevronUp className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                    )}
                  </button>

                  <button
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
                </div>

                <div className="text-[11px] text-slate-500">
                  Active Recruitment Cycle: <strong className="text-slate-800">{exam.active_cycle || exam.recruitment_cycle}</strong>
                </div>
              </div>

              {/* Sub-Panel: Field Verification Matrix */}
              {expandedExamSections[exam.exam_id] === 'MATRIX' && (
                <div className="mt-4 animate-in fade-in">
                  <FieldVerificationMatrix
                    exam={exam}
                    onVerifyFact={(factName, label, val) =>
                      handleOpenVerifyModal(exam, { key: factName, label, currentValue: val })
                    }
                    onOpenFullSignoff={() => handleOpenVerifyModal(exam)}
                    onLaunchResearch={() => onLaunchResearch(exam.title, 'HYBRID', exam.exam_id)}
                  />
                </div>
              )}

              {/* Sub-Panel: Recruitment Cycle Manager */}
              {expandedExamSections[exam.exam_id] === 'CYCLES' && (
                <div className="mt-4 animate-in fade-in">
                  <RecruitmentCycleManager
                    exam={exam}
                    onSwitchCycle={(cycle) => handleSwitchCycle(exam.exam_id, cycle)}
                    onAddCycleVersion={(ver) => handleAddCycleVersion(exam.exam_id, ver)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

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
