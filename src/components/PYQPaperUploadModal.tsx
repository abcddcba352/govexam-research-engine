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
import { groupExamsByJurisdiction, INDIAN_STATES, CENTRAL_CONDUCTING_BOARDS, STATE_CONDUCTING_BOARDS, getExamState, isCentralExam } from '../utils/examJurisdiction.ts';

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

  // Hierarchy Selection States
  const [selectedState, setSelectedState] = useState<string>(() => {
    const initExam = exams.find(e => e.exam_id === selectedExamId) || exams[0];
    if (!initExam) return 'Telangana';
    return isCentralExam(initExam) ? 'CENTRAL' : (getExamState(initExam) || 'Telangana');
  });

  const [selectedBoard, setSelectedBoard] = useState<string>(() => {
    const initExam = exams.find(e => e.exam_id === selectedExamId) || exams[0];
    return initExam?.commission || 'ALL_BOARDS';
  });

  const [stageName, setStageName] = useState<string>('Preliminary / Objective Examination');
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

  // Real-time detection of question count (accurate multi-format & multi-section matching)
  const detectedQuestionCount = useMemo(() => {
    if (!pastedText.trim()) return 0;
    const lines = pastedText.split('\n');
    let count = 0;
    let lastQNum = 0;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l) continue;

      // Reset sequence on section headers
      if (/^(?:SECTION|PART|PAPER|MODULE|GROUP|SUBJECT|GENERAL\s+STUDIES|ARITHMETIC|REASONING)\b/i.test(l)) {
        lastQNum = 0;
        continue;
      }

      // 1. Explicit Question prefix: Q1, Q.1, Q-1, Q.No. 1, Question 1, Question No. 1, Sl.No. 1, Item 1, ప్రశ్న 1
      const qPrefixMatch = l.match(/^(?:Q(?:uestion)?\.?\s*(?:No\.?)?|Sl\.?\s*No\.?|Item|ప్రశ్న\.?)\s*[\.\:\-–—]?\s*(\d{1,3})[\.\:\)\-–—\s]*/i);
      if (qPrefixMatch) {
        const num = parseInt(qPrefixMatch[1], 10);
        if (num >= 1 && num <= 350) {
          count++;
          lastQNum = num;
          continue;
        }
      }

      // Explicitly reject option lines: (A)-(D), [A]-[D], A)-D), (1)-(4), [1]-[4]
      if (/^(?:\([A-Da-d1-4]\)|\[[A-Da-d1-4]\]|[A-Da-d]\))[ \t]+/.test(l)) {
        continue;
      }

      // 2. Numbered lines: 1., 1 ., 1:, 1 :, 1-, 1 -, 1–, 1—, 1/, 1 /
      const numDotMatch = l.match(/^(\d{1,3})\s*(?:\.|\:|\/|[–—-]|-(?!\d))\s*/);
      if (numDotMatch) {
        const num = parseInt(numDotMatch[1], 10);
        if (num >= 1 && num <= 350) {
          if (num <= 4 && lastQNum > 4) {
            continue;
          }
          count++;
          lastQNum = num;
          continue;
        }
      }

      // 3. Number with closing paren: 1), 2), ..., 200)
      const numParenMatch = l.match(/^(\d{1,3})\)[ \t]*/);
      if (numParenMatch) {
        const num = parseInt(numParenMatch[1], 10);
        if (num >= 5 && num <= 350) {
          count++;
          lastQNum = num;
          continue;
        } else if (num >= 1 && num <= 4 && lastQNum <= 4 && (lastQNum === 0 || num === lastQNum + 1)) {
          count++;
          lastQNum = num;
          continue;
        }
      }

      // 4. Parenthesized numbers for 5+: (5) to (350) or [5] to [350]
      const parenNumMatch = l.match(/^(?:\((\d{1,3})\)|\[(\d{1,3})\])[ \t]*/);
      if (parenNumMatch) {
        const num = parseInt(parenNumMatch[1] || parenNumMatch[2], 10);
        if (num >= 5 && num <= 350) {
          count++;
          lastQNum = num;
          continue;
        }
      }

      // 5. Standalone number line (1 to 350 on its own line followed by question text on next line)
      const standaloneMatch = l.match(/^(\d{1,3})$/);
      if (standaloneMatch && i + 1 < lines.length) {
        const num = parseInt(standaloneMatch[1], 10);
        if (num >= 1 && num <= 350) {
          if (lastQNum > 4 && num <= 4) {
            continue;
          }
          const nextLine = lines[i + 1].trim();
          if (nextLine.length > 5 && !/^[A-Da-d1-4][\.\)]/.test(nextLine)) {
            count++;
            lastQNum = num;
            continue;
          }
        }
      }

      // 6. Number 5..350 directly followed by space and text (e.g. "170 Which of the following...")
      const numWordMatch = l.match(/^(\d{1,3})\s+([A-Za-z\u0900-\u0D7F].*)/);
      if (numWordMatch) {
        const num = parseInt(numWordMatch[1], 10);
        if (num >= 5 && num <= 350) {
          count++;
          lastQNum = num;
          continue;
        }
      }
    }

    return count;
  }, [pastedText]);

  // Current active exam object
  const activeExam = useMemo(() => exams.find(e => e.exam_id === examId) || exams[0], [exams, examId]);

  // Boards available for currently selected State / Central
  const availableBoards = useMemo(() => {
    if (selectedState === 'CENTRAL') {
      const centralBoards = CENTRAL_CONDUCTING_BOARDS.map(b => b.shortName);
      const examCommissions = exams.filter(e => isCentralExam(e)).map(e => e.commission);
      return Array.from(new Set([...centralBoards, ...examCommissions])).filter(Boolean).sort();
    }
    const stateBoards = (STATE_CONDUCTING_BOARDS[selectedState] || []).map(b => b.shortName);
    const examCommissions = exams.filter(e => getExamState(e) === selectedState).map(e => e.commission);
    return Array.from(new Set([...stateBoards, ...examCommissions])).filter(Boolean).sort();
  }, [selectedState, exams]);

  // Exams filtered by selected State and selected Board
  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      const matchState = selectedState === 'CENTRAL' ? isCentralExam(e) : getExamState(e) === selectedState;
      if (!matchState) return false;
      if (!selectedBoard || selectedBoard === 'ALL_BOARDS') return true;
      return (e.commission || '').toLowerCase().includes(selectedBoard.toLowerCase()) ||
             selectedBoard.toLowerCase().includes((e.commission || '').toLowerCase());
    });
  }, [exams, selectedState, selectedBoard]);

  // Available stages from the active exam
  const availableStages = useMemo(() => {
    if (activeExam?.stages && activeExam.stages.length > 0) {
      return activeExam.stages.map(s => s.stage_name);
    }
    if (activeExam?.structure_scheme?.stages && activeExam.structure_scheme.stages.length > 0) {
      return activeExam.structure_scheme.stages.map(s => s.stage_name);
    }
    if (activeExam?.stage) {
      return [activeExam.stage];
    }
    return ['Preliminary Written Test', 'Mains Examination', 'Interview'];
  }, [activeExam]);

  // Available papers from the active exam under the selected stage
  const availablePapers = useMemo(() => {
    const allStages = activeExam?.stages || activeExam?.structure_scheme?.stages || [];
    const matchedStage = allStages.find(s => s.stage_name.toLowerCase() === stageName.toLowerCase()) || allStages[0];
    if (matchedStage?.papers && matchedStage.papers.length > 0) {
      return matchedStage.papers.map(p => p.title);
    }
    if (activeExam?.paper) {
      return [activeExam.paper];
    }
    return ['Paper-I: General Studies and General Abilities', 'Paper-II: Domain Specific'];
  }, [activeExam, stageName]);

  // Handle State Change
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    setSelectedBoard('ALL_BOARDS');
    const match = exams.find(e => newState === 'CENTRAL' ? isCentralExam(e) : getExamState(e) === newState);
    if (match) {
      setExamId(match.exam_id);
      syncExamStagesAndPapers(match);
    }
  };

  // Handle Board Change
  const handleBoardChange = (newBoard: string) => {
    setSelectedBoard(newBoard);
    if (newBoard !== 'ALL_BOARDS') {
      const match = exams.find(e => {
        const matchState = selectedState === 'CENTRAL' ? isCentralExam(e) : getExamState(e) === selectedState;
        return matchState && ((e.commission || '').toLowerCase().includes(newBoard.toLowerCase()) ||
                              newBoard.toLowerCase().includes((e.commission || '').toLowerCase()));
      });
      if (match) {
        setExamId(match.exam_id);
        syncExamStagesAndPapers(match);
      }
    }
  };

  // Sync stage and paper whenever exam changes
  const syncExamStagesAndPapers = (targetExam: ExamRecord) => {
    const stgs = targetExam.stages || targetExam.structure_scheme?.stages || [];
    if (stgs.length > 0) {
      setStageName(stgs[0].stage_name);
      if (stgs[0].papers && stgs[0].papers.length > 0) {
        setPaperName(stgs[0].papers[0].title);
      }
    } else if (targetExam.stage) {
      setStageName(targetExam.stage);
      if (targetExam.paper) setPaperName(targetExam.paper);
    }
  };

  const handleExamChange = (newExamId: string) => {
    setExamId(newExamId);
    const matched = exams.find(e => e.exam_id === newExamId);
    if (matched) {
      syncExamStagesAndPapers(matched);
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
          exam_stage: useCustomExam ? customExamStage.trim() : stageName,
          paper_name: paperName,
          exam_date: examDate,
          year: Number(year),
          shift,
          booklet_code: bookletCode,
          raw_text: pastedText,
          format: 'RAW_TEXT',
          custom_subjects: undefined,
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

          {/* 1. TARGET EXAMINATION HIERARCHY (STATE -> BOARD -> EXAM -> STAGE -> PAPER) */}
          <div className="space-y-3.5 p-4 rounded-xl bg-slate-50/90 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                <span className="font-bold text-slate-800 text-xs sm:text-sm">Target Examination Hierarchy</span>
              </div>
              <button
                type="button"
                onClick={() => setUseCustomExam(!useCustomExam)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs hover:bg-indigo-50 transition-colors"
              >
                <Edit3 className="w-3 h-3" />
                <span>{useCustomExam ? '← Choose Existing Exam' : '+ Enter Custom Hierarchy'}</span>
              </button>
            </div>

            {useCustomExam ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">1. State / Jurisdiction *</label>
                  <input
                    type="text"
                    value={selectedState}
                    onChange={e => setSelectedState(e.target.value)}
                    placeholder="e.g. Telangana, Andhra Pradesh, Central"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">2. Board / Commission *</label>
                  <input
                    type="text"
                    value={customExamBoard}
                    onChange={e => setCustomExamBoard(e.target.value)}
                    placeholder="e.g. TGPSC, APPSC, SSC, UPSC"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">3. Exam Name *</label>
                  <input
                    type="text"
                    value={customExamTitle}
                    onChange={e => setCustomExamTitle(e.target.value)}
                    placeholder="e.g. Group-I Services, CGL"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">4. Exam Stage *</label>
                  <input
                    type="text"
                    value={customExamStage}
                    onChange={e => setCustomExamStage(e.target.value)}
                    placeholder="e.g. Preliminary Written Test, Mains"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">5. Paper Name *</label>
                  <input
                    type="text"
                    value={paperName}
                    onChange={e => setPaperName(e.target.value)}
                    placeholder="e.g. Paper-I: General Studies and General Abilities"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 5 HIERARCHY SELECTORS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* FIELD 1: STATE */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>1. State / Jurisdiction</span>
                      <span className="text-[10px] text-blue-600 font-normal">Level 1</span>
                    </label>
                    <select
                      value={selectedState}
                      onChange={e => handleStateChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs cursor-pointer shadow-2xs"
                    >
                      <option value="CENTRAL">🏛️ Central / All-India (SSC, RRB, UPSC, Banking)</option>
                      {INDIAN_STATES.map(st => (
                        <option key={st.code} value={st.name}>
                          🗺️ {st.name} ({st.shortCommission})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* FIELD 2: BOARD */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>2. Board / Commission</span>
                      <span className="text-[10px] text-blue-600 font-normal">Level 2</span>
                    </label>
                    <select
                      value={selectedBoard}
                      onChange={e => handleBoardChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs cursor-pointer shadow-2xs"
                    >
                      <option value="ALL_BOARDS">All Boards in {selectedState}</option>
                      {availableBoards.map(board => (
                        <option key={board} value={board}>
                          {board}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* FIELD 3: EXAM */}
                  <div className="sm:col-span-2 md:col-span-1">
                    <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>3. Examination</span>
                      <span className="text-[10px] text-blue-600 font-normal">Level 3</span>
                    </label>
                    <select
                      value={examId}
                      onChange={e => handleExamChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs cursor-pointer shadow-2xs"
                    >
                      {filteredExams.length > 0 ? (
                        filteredExams.map(e => (
                          <option key={e.exam_id} value={e.exam_id}>
                            {e.title} ({e.commission})
                          </option>
                        ))
                      ) : (
                        exams.map(e => (
                          <option key={e.exam_id} value={e.exam_id}>
                            {e.title} ({e.commission})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* FIELD 4: STAGE */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>4. Exam Stage</span>
                      <span className="text-[10px] text-blue-600 font-normal">Level 4</span>
                    </label>
                    <div className="relative">
                      <select
                        value={stageName}
                        onChange={e => {
                          setStageName(e.target.value);
                          const allStages = activeExam?.stages || activeExam?.structure_scheme?.stages || [];
                          const matchedStage = allStages.find(s => s.stage_name.toLowerCase() === e.target.value.toLowerCase());
                          if (matchedStage?.papers && matchedStage.papers.length > 0) {
                            setPaperName(matchedStage.papers[0].title);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs cursor-pointer shadow-2xs"
                      >
                        {availableStages.map(stg => (
                          <option key={stg} value={stg}>
                            {stg}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* FIELD 5: PAPER */}
                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>5. Paper Name</span>
                      <span className="text-[10px] text-blue-600 font-normal">Level 5</span>
                    </label>
                    <div className="flex gap-2">
                      {availablePapers.length > 1 && (
                        <select
                          value={availablePapers.includes(paperName) ? paperName : 'custom'}
                          onChange={e => {
                            if (e.target.value !== 'custom') setPaperName(e.target.value);
                          }}
                          className="w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs cursor-pointer shadow-2xs"
                        >
                          {availablePapers.map(p => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                          <option value="custom">✎ Enter Custom Paper Name</option>
                        </select>
                      )}
                      <input
                        type="text"
                        value={paperName}
                        onChange={e => setPaperName(e.target.value)}
                        placeholder="e.g. Paper-I: General Studies and General Abilities"
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800 text-xs shadow-2xs"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shift, Year & AI Auto-Categorize Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-200/80">
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

              <div>
                <label className="font-bold text-slate-700 block mb-1">Session / Shift</label>
                <input
                  type="text"
                  value={shift}
                  onChange={e => setShift(e.target.value)}
                  placeholder="e.g. Forenoon (10:00 AM - 12:30 PM)"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Booklet Series / Code</label>
                <input
                  type="text"
                  value={bookletCode}
                  onChange={e => setBookletCode(e.target.value)}
                  placeholder="e.g. Series-A, Code-1"
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 text-slate-800 text-xs"
                />
              </div>
            </div>

            {/* AI Auto Classification Info */}
            <div className="pt-1 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={aiMatchSubjects}
                  onChange={e => setAiMatchSubjects(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Auto-classify questions using syllabus topics derived from official exam structure
                </span>
              </label>
            </div>
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
