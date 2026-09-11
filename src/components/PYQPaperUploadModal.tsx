import React, { useState, useMemo } from 'react';
import {
  PreviousPaperRecord,
  ExamRecord,
  PYQQuestionRecord,
  PreviousPaperOfficialStatus,
  PaperWeightageAnalysis
} from '../types.ts';
import {
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clipboard,
  UploadCloud,
  Sparkles,
  Calendar,
  Layers,
  Plus,
  Trash2,
  Tag,
  BarChart3,
  TrendingUp,
  Brain,
  Check,
  Edit3
} from 'lucide-react';
import { groupExamsByJurisdiction } from '../utils/examJurisdiction.ts';

const COMMON_SUBJECT_PRESETS = [
  'Indian Polity & Constitution',
  'Indian Economy & Development',
  'History & Culture',
  'Geography & Environment',
  'General Science & Technology',
  'Current Affairs & Events',
  'Arithmetic & Reasoning',
  'English Comprehension'
];

interface Props {
  exams: ExamRecord[];
  selectedExamId: string;
  onClose: () => void;
  onPaperCreated?: (paper: PreviousPaperRecord) => void;
  onQuestionsImported?: (questions: PYQQuestionRecord[]) => void;
}

export const PYQPaperUploadModal: React.FC<Props> = ({
  exams,
  selectedExamId,
  onClose,
  onPaperCreated,
  onQuestionsImported,
}) => {
  const [activeTab, setActiveTab] = useState<'PASTE' | 'FILE' | 'META'>('PASTE');

  // Exam Selection Mode: Existing or Custom
  const [useCustomExam, setUseCustomExam] = useState(false);
  const [examId, setExamId] = useState(selectedExamId || (exams[0]?.exam_id || ''));
  const [customExamTitle, setCustomExamTitle] = useState('');
  const [customExamBoard, setCustomExamBoard] = useState('');
  const [customExamStage, setCustomExamStage] = useState('Preliminary / Objective Examination');

  // Custom Subjects
  const [customSubjects, setCustomSubjects] = useState<string[]>([
    'Indian Polity & Constitution',
    'Indian Economy & Development',
    'History & Culture',
    'Geography & Environment',
    'General Science & Technology',
    'Arithmetic & Reasoning'
  ]);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [aiMatchSubjects, setAiMatchSubjects] = useState(true);

  // Paper details
  const [year, setYear] = useState<number>(2024);
  const [examDate, setExamDate] = useState<string>('2024-02-25');
  const [paperName, setPaperName] = useState('Paper-I: General Studies and General Abilities');
  const [shift, setShift] = useState('Forenoon Session (10:00 AM - 12:30 PM)');
  const [bookletCode, setBookletCode] = useState('Series-A');
  const [language, setLanguage] = useState('English');
  const [officialStatus, setOfficialStatus] = useState<PreviousPaperOfficialStatus>('OFFICIAL');

  // Pasted text / file content
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Result Weightage Analysis view
  const [weightageResult, setWeightageResult] = useState<PaperWeightageAnalysis | null>(null);

  const groupedExams = useMemo(() => groupExamsByJurisdiction(exams), [exams]);

  // Real-time detection of question count
  const detectedQuestionCount = useMemo(() => {
    if (!pastedText.trim()) return 0;
    const matches = pastedText.match(/(?:^|\n)(?=(?:Q(?:\.|\s*|uestion\s*)|\(?\d+\)?[\.\:\)]))\s*/gi);
    return matches ? matches.length : 0;
  }, [pastedText]);

  // Handle subject add / remove
  const handleAddSubject = () => {
    const trimmed = newSubjectInput.trim();
    if (!trimmed) return;
    if (!customSubjects.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setCustomSubjects(prev => [...prev, trimmed]);
    }
    setNewSubjectInput('');
  };

  const handleRemoveSubject = (index: number) => {
    setCustomSubjects(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuickAddPreset = (preset: string) => {
    if (!customSubjects.some(s => s.toLowerCase() === preset.toLowerCase())) {
      setCustomSubjects(prev => [...prev, preset]);
    }
  };

  // Populate subjects if user selects an existing exam that has syllabus topics
  const handleExamChange = (newExamId: string) => {
    setExamId(newExamId);
    const matched = exams.find(e => e.exam_id === newExamId);
    if (matched && matched.syllabus_topics && matched.syllabus_topics.length > 0) {
      setCustomSubjects(matched.syllabus_topics);
    }
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPastedText(content);
        if (file.name.toLowerCase().endsWith('.json')) {
          try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              setSuccessMsg(`Loaded JSON file with ${parsed.length} structured questions.`);
            }
          } catch (err) {}
        }
      }
    };
    reader.readAsText(file);
  };

  const handlePasteSample = () => {
    const sample = `Q1. Under Article 371-D of the Constitution of India, which of the following provisions was specifically created for the State of Andhra Pradesh (and subsequently applicable to Telangana)?
(A) Creation of a Special Administrative Tribunal for Civil Services & equitable opportunities in education and public employment across local cadres
(B) Exclusive reservation of 80% seats in all central universities located in the state
(C) Direct administration of the capital district by the Union Home Ministry
(D) Complete exemption from the National Judicial Appointments Commission guidelines
Answer: Option A
Explanation: Article 371-D and Presidential Orders govern public employment and educational quotas for local cadres in AP and Telangana.

Q2. Who among the following Kakatiya rulers constructed the historic Ramappa (Rudreswara) Temple in Palampet?
(A) Prataparudra I
(B) Ganapati Deva
(C) Recharla Rudra (General of Ganapati Deva)
(D) Rani Rudrama Devi
Answer: Option C
Explanation: The Ramappa Temple was commissioned in 1213 CE by Recharla Rudra, a general under Kakatiya king Ganapati Deva, and is recognized as a UNESCO World Heritage Site.

Q3. In which year was the Gentlemen's Agreement signed between the leaders of Andhra and Telangana regions?
(A) 1953
(B) 1956
(C) 1969
(D) 1972
Answer: Option B
Explanation: The Gentlemen's Agreement was signed on 20 February 1956 at Hyderabad House in New Delhi prior to the formation of Andhra Pradesh on 1 November 1956.

Q4. Which of the following monetary policy tools is categorized as a quantitative credit control measure by the Reserve Bank of India?
(A) Moral Suasion
(B) Margin Requirements
(C) Cash Reserve Ratio (CRR)
(D) Credit Rationing
Answer: Option C
Explanation: CRR, SLR, and Repo rate are quantitative credit control instruments used by the RBI to regulate total money supply.

Q5. Which Indian state shares international boundaries with three sovereign foreign countries (Nepal, Bhutan, and China)?
(A) Sikkim
(B) Arunachal Pradesh
(C) West Bengal
(D) Uttarakhand
Answer: Option A
Explanation: Sikkim is bounded by Tibet (China) to the north, Bhutan to the east, and Nepal to the west.`;
    setPastedText(sample);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (activeTab === 'PASTE' || activeTab === 'FILE') {
        if (!pastedText.trim()) {
          throw new Error('Please paste question paper text or upload a question file.');
        }

        const payload = {
          exam_id: useCustomExam ? 'new' : examId,
          exam_title: useCustomExam ? customExamTitle.trim() : undefined,
          exam_board: useCustomExam ? customExamBoard.trim() : undefined,
          exam_stage: useCustomExam ? customExamStage.trim() : undefined,
          paper_name: paperName,
          exam_date: examDate,
          year: Number(year),
          shift,
          booklet_code: bookletCode,
          raw_text: pastedText,
          format: 'RAW_TEXT',
          custom_subjects: customSubjects,
          ai_match_subjects: aiMatchSubjects
        };

        const res = await fetch('/api/pyq/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to parse and ingest paper');
        }

        const result = await res.json();
        setSuccessMsg(`Successfully ingested ${result.count} questions from "${result.paper.paper_name}"!`);

        if (onPaperCreated) onPaperCreated(result.paper);
        if (onQuestionsImported) onQuestionsImported(result.questions);

        // If weightage analysis was produced, display the results screen
        if (result.weightage_analysis) {
          setWeightageResult(result.weightage_analysis);
        } else {
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } else {
        // Metadata only
        const selectedExam = exams.find(ex => ex.exam_id === examId);
        const res = await fetch('/api/pyq/papers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            exam_id: examId,
            recruitment_cycle: selectedExam?.active_cycle || `${year} Cycle`,
            year,
            exam_date: examDate,
            paper_name: paperName,
            shift,
            booklet_code: bookletCode,
            language,
            official_status: officialStatus,
            question_count: 150,
            marks: 150,
            duration_minutes: 150,
            extraction_status: 'EXTRACTED',
            analysis_status: 'COMPLETED',
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to register paper record');
        }

        const created = await res.json();
        if (onPaperCreated) onPaperCreated(created);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Error ingesting question paper');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // RESULT VIEW: WEIGHTAGE ANALYSIS BREAKDOWN
  // -------------------------------------------------------------------------
  if (weightageResult) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold tracking-tight">Syllabus Weightage Analysis</h2>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {weightageResult.analyzed_by_gemini ? 'Gemini AI Verified' : 'Rule-Based Classified'}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {weightageResult.paper_name} • Total Questions: {weightageResult.total_questions}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Strategic Summary Box */}
            <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200">
              <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 mb-1.5">
                <Brain className="w-4 h-4 text-indigo-600" />
                <span>Strategic Syllabus Insights</span>
              </div>
              <p className="text-xs text-indigo-950 leading-relaxed">
                {weightageResult.strategic_summary}
              </p>
            </div>

            {/* Subject Distribution Bars */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>Subject Weightage Breakdown</span>
                <span className="text-[11px] font-normal text-slate-500">
                  {weightageResult.subjects.length} Canonical Subjects
                </span>
              </h3>

              <div className="space-y-3">
                {weightageResult.subjects.map((item, idx) => (
                  <div
                    key={item.subject}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{item.subject}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-800">{item.question_count} Qs</span>
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2.5">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }}
                      />
                    </div>

                    {/* Meta / Details */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-600">Difficulty:</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[10px]">
                          Easy: {item.difficulty_breakdown?.EASY || 0}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200 text-[10px]">
                          Mod: {item.difficulty_breakdown?.MODERATE || 0}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200 text-[10px]">
                          Diff: {item.difficulty_breakdown?.DIFFICULT || 0}
                        </span>
                      </div>

                      {item.topics && item.topics.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-500">Top topic:</span>
                          <span className="font-semibold text-slate-700 truncate max-w-xs">
                            {item.topics[0].topic} ({item.topics[0].count} Qs)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* High-Yield Topics Cloud */}
            {weightageResult.high_yield_topics && weightageResult.high_yield_topics.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  <span>High-Yield Recurring Focus Areas</span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {weightageResult.high_yield_topics.map((t, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1"
                    >
                      <span>{t.topic}</span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-white px-1.5 py-0.2 rounded">
                        {t.count} Qs
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Questions are permanently registered in the Question Bank and linked to this syllabus blueprint.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Done & Return to Papers</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // UPLOAD FORM VIEW
  // -------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Import Previous Year Question Paper
              </h2>
              <p className="text-xs text-slate-500">
                Enter exam details, specify subjects, and let Gemini AI match questions & compute weightage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 px-4 pt-2 text-xs font-semibold bg-slate-50/40 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('PASTE')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PASTE'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Paste Question Text</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FILE')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'FILE'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Upload File (TXT / JSON / PDF)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('META')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'META'
                ? 'border-blue-600 text-blue-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Metadata Only</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. TARGET EXAMINATION DETAILS */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Target Examination</span>
              <button
                type="button"
                onClick={() => setUseCustomExam(!useCustomExam)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>{useCustomExam ? '← Choose Existing Exam' : '+ Enter New Exam Details'}</span>
              </button>
            </div>

            {useCustomExam ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Exam Title *</label>
                  <input
                    type="text"
                    value={customExamTitle}
                    onChange={e => setCustomExamTitle(e.target.value)}
                    placeholder="e.g. TGPSC Group 1 Prelims, SSC CGL"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Commission / Board</label>
                  <input
                    type="text"
                    value={customExamBoard}
                    onChange={e => setCustomExamBoard(e.target.value)}
                    placeholder="e.g. TGPSC, APPSC, UPSC, SSC"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs"
                  />
                </div>
              </div>
            ) : (
              <div>
                <select
                  value={examId}
                  onChange={e => handleExamChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs cursor-pointer"
                >
                  {groupedExams.central.length > 0 && (
                    <optgroup label="🏛️ Central / National (All-India)">
                      {groupedExams.central.map(e => (
                        <option key={e.exam_id} value={e.exam_id}>
                          {e.title} ({e.commission})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {groupedExams.stateNames.map(stateName => (
                    <optgroup key={stateName} label={`🗺️ State: ${stateName}`}>
                      {groupedExams.states[stateName].map(e => (
                        <option key={e.exam_id} value={e.exam_id}>
                          {e.title} ({e.commission})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Exam Year</span>
                </label>
                <input
                  type="number"
                  min="2000"
                  max="2030"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 text-slate-800 text-xs font-semibold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Paper Title</label>
                <input
                  type="text"
                  value={paperName}
                  onChange={e => setPaperName(e.target.value)}
                  placeholder="e.g. Paper-I: General Studies"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 text-slate-800 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 2. CUSTOM SUBJECT NAMES MANAGER */}
          <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  Canonical Subjects for Weightage Matching ({customSubjects.length})
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Questions will be strictly classified into these subjects using Gemini AI.
                </p>
              </div>
            </div>

            {/* Input to add subject */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubjectInput}
                onChange={e => setNewSubjectInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubject();
                  }
                }}
                placeholder="Type a subject name (e.g. Indian Polity, Telangana History) and press Add"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-indigo-600"
              />
              <button
                type="button"
                onClick={handleAddSubject}
                disabled={!newSubjectInput.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Subject Chips */}
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
              {customSubjects.map((subj, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-indigo-900 text-xs font-semibold shadow-2xs group"
                >
                  <span>{subj}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(index)}
                    className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                    title="Remove subject"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 pt-1">
              <span className="font-semibold text-slate-600">Quick add:</span>
              {COMMON_SUBJECT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuickAddPreset(preset)}
                  className="px-2 py-0.5 rounded bg-white hover:bg-indigo-100 border border-slate-200 text-slate-700 hover:text-indigo-800 transition-colors cursor-pointer text-[10px]"
                >
                  + {preset}
                </button>
              ))}
            </div>

            {/* AI Matching Toggle */}
            <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aiMatchSubjects}
                onChange={e => setAiMatchSubjects(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Auto-classify questions & compute syllabus weightage using Gemini AI
              </span>
            </label>
          </div>

          {/* TAB 1: PASTE QUESTION TEXT */}
          {activeTab === 'PASTE' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 block">
                  Paste Question Paper Text (English / Bilingual)
                </label>
                <button
                  type="button"
                  onClick={handlePasteSample}
                  className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Insert Sample 5-Question Paper</span>
                </button>
              </div>

              <textarea
                rows={9}
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Paste the questions here...

Example format:
Q1. Which constitutional article provides for...
(A) Article 370
(B) Article 371-D
(C) Article 356
(D) Article 32
Answer: Option B
Explanation: Article 371-D..."
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-blue-600 focus:bg-white transition-colors"
                required
              />
            </div>
          )}

          {/* TAB 2: UPLOAD FILE */}
          {activeTab === 'FILE' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center bg-slate-50 hover:bg-blue-50/40 transition-colors">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <label className="block text-xs font-bold text-slate-700 cursor-pointer">
                  <span>Click to select question paper file (.txt, .json, .pdf)</span>
                  <input
                    type="file"
                    accept=".txt,.json,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">
                  Text files and structured JSON arrays are automatically parsed and previewed.
                </p>
                {fileName && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-100 text-blue-800 font-mono text-[11px]">
                    <span>File: {fileName}</span>
                  </div>
                )}
              </div>

              {pastedText && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Extracted File Content Preview</label>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 3: METADATA ONLY */}
          {activeTab === 'META' && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="text-xs text-slate-600">
                This registers an official examination cycle index without immediately importing question text. Questions can be linked subsequently via booklet linking.
              </p>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              {activeTab !== 'META' && detectedQuestionCount > 0
                ? `${detectedQuestionCount} questions ready to parse`
                : 'Official question bank ingestion'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{aiMatchSubjects ? 'Matching with Gemini AI...' : 'Parsing Questions...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{activeTab === 'META' ? 'Register Paper' : 'Match & Ingest Questions'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
