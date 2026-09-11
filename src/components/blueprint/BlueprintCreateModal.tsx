import React, { useState, useEffect } from 'react';
import {
  ExamRecord,
  TestMode,
  CreateBlueprintInput
} from '../../types.ts';
import {
  X,
  Sparkles,
  Layers,
  BookOpen,
  Calendar,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  FileText
} from 'lucide-react';

import { ExamStage, ExamStagePaper } from '../../types.ts';

interface BlueprintCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamRecord;
  selectedStage?: ExamStage | null;
  selectedPaper?: ExamStagePaper | null;
  onCreate: (input: CreateBlueprintInput) => Promise<void>;
  isSubmitting: boolean;
}

export function BlueprintCreateModal({
  isOpen,
  onClose,
  exam,
  selectedStage,
  selectedPaper,
  onCreate,
  isSubmitting
}: BlueprintCreateModalProps) {
  const [testMode, setTestMode] = useState<TestMode>('FULL_LENGTH');
  const [questionCount, setQuestionCount] = useState<number>(exam.pattern?.total_questions || 150);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [language, setLanguage] = useState<string>(
    exam.pattern?.mediums && exam.pattern.mediums.length > 1
      ? exam.pattern.mediums.join(' & ')
      : 'English & Regional Medium'
  );
  const [caCutoff, setCaCutoff] = useState<string>('2025-11-15');
  const [caMonths, setCaMonths] = useState<number>(12);
  const [allowCrossModeReuse, setAllowCrossModeReuse] = useState<boolean>(true);

  // Series preview
  const [seriesSummary, setSeriesSummary] = useState<{
    next_mock_number: number;
    existing_final_mocks: number;
    questions_used: number;
    uniqueness_pressure: string;
    pressure_details: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Set default question counts based on mode
    if (testMode === 'FULL_LENGTH') {
      setQuestionCount(selectedPaper?.total_questions || exam.pattern?.total_questions || 150);
    } else if (testMode === 'SUBJECT_WISE') {
      setQuestionCount(50);
    } else if (testMode === 'TOPIC_WISE') {
      setQuestionCount(25);
    }

    // Fetch series preview
    fetch(`/api/blueprints/series-summary/${exam.exam_id}?test_mode=${testMode}`)
      .then(r => r.json())
      .then(data => {
        if (data && data.summary) {
          setSeriesSummary({
            next_mock_number: data.next_mock_number,
            existing_final_mocks: data.summary.existing_final_mocks,
            questions_used: data.summary.questions_used,
            uniqueness_pressure: data.summary.uniqueness_pressure,
            pressure_details: data.summary.pressure_details
          });
        }
      })
      .catch(() => {});
  }, [isOpen, testMode, exam.exam_id, selectedPaper]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input: CreateBlueprintInput = {
      exam_id: exam.exam_id,
      test_mode: testMode,
      subject_id: testMode === 'SUBJECT_WISE' ? selectedSubject : undefined,
      topic_id: testMode === 'TOPIC_WISE' ? selectedTopic : undefined,
      custom_params: {
        question_count: questionCount,
        language,
        current_affairs_cutoff: caCutoff,
        current_affairs_months: caMonths,
        stage_id: selectedStage?.stage_id,
        paper_id: selectedPaper?.paper_id,
        paper_title: selectedPaper?.title,
        topics: (selectedPaper?.syllabus_topics && selectedPaper.syllabus_topics.length > 0)
          ? selectedPaper.syllabus_topics
          : (exam.syllabus_topics && exam.syllabus_topics.length > 0)
          ? exam.syllabus_topics
          : undefined
      },
      allow_cross_mode_reuse: allowCrossModeReuse
    };
    await onCreate(input);
  };

  const sampleSubjects = [
    'Indian Constitution and Polity',
    'History and Cultural Heritage',
    'Economy and Development',
    'Geography of India and State',
    'General Science and Environment',
    'General Abilities and Mental Aptitude'
  ];

  const sampleTopics = (selectedPaper?.syllabus_topics && selectedPaper.syllabus_topics.length > 0)
    ? selectedPaper.syllabus_topics
    : exam.syllabus_topics && exam.syllabus_topics.length > 0
    ? exam.syllabus_topics
    : [
        'Constitutional Law & Governance',
        'Socio-Economic Development & Schemes',
        'Physical and Regional Geography',
        'Science & Technological Discoveries'
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/80 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Generate Evidence-Based Blueprint
              </h2>
              <p className="text-xs text-indigo-200">
                10-Stage Deterministic Allocation Engine for {exam.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Series Ledger Preview Banner */}
          {seriesSummary && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-start gap-3 text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-indigo-950 flex items-center gap-2">
                  <span>Targeting Series: <strong>Mock #{seriesSummary.next_mock_number}</strong></span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                    {seriesSummary.existing_final_mocks} Prior Final Mocks
                  </span>
                </div>
                <p className="text-indigo-800 text-[11px] leading-relaxed">
                  {seriesSummary.pressure_details} ({seriesSummary.questions_used} facts registered). Zero question copy or direct duplicate facts allowed.
                </p>
              </div>
            </div>
          )}

          {/* Target Stage & Paper Information Badge */}
          {selectedPaper && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-indigo-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  Target Paper & Selection Stage:
                </span>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">
                  {selectedPaper.title}
                </p>
                {selectedStage && (
                  <p className="text-[11px] text-purple-700 font-semibold">
                    {selectedStage.stage_name}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-2xs inline-block">
                  {selectedPaper.total_questions || exam.pattern?.total_questions || 150} Questions
                </span>
                <span className="block text-[10px] text-slate-500 mt-0.5">
                  Official Specification
                </span>
              </div>
            </div>
          )}

          {/* Test Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              1. Select Test Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'FULL_LENGTH', label: 'Full-Length', desc: 'Exact exam simulation' },
                { id: 'SUBJECT_WISE', label: 'Subject-Wise', desc: 'Deep sectional mock' },
                { id: 'TOPIC_WISE', label: 'Topic-Wise', desc: 'Syllabus mastery test' },
                { id: 'CUSTOM', label: 'Custom', desc: 'Customizable count' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTestMode(m.id as TestMode)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    testMode === m.id
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 ring-2 ring-indigo-500/20 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">{m.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Subject or Topic selection if needed */}
          {testMode === 'SUBJECT_WISE' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Target Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
              >
                <option value="">-- Auto-select from highest syllabus weightage --</option>
                {sampleSubjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {testMode === 'TOPIC_WISE' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Target Syllabus Topic
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
              >
                <option value="">-- Auto-select from core syllabus --</option>
                {sampleTopics.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}

          {/* Question Count & Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Question Count
              </label>
              <input
                type="number"
                min={5}
                max={250}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 10)}
                disabled={testMode === 'FULL_LENGTH'}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 disabled:bg-slate-100 disabled:text-slate-500 font-semibold"
              />
              <span className="text-[10px] text-slate-500">
                {testMode === 'FULL_LENGTH' ? 'Official gazetted count enforced.' : 'Target number of question slots.'}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Exam Language Medium
              </label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-semibold"
                placeholder="e.g. English & Telugu"
              />
              <span className="text-[10px] text-slate-500">
                Language rules applied to slots.
              </span>
            </div>
          </div>

          {/* Current Affairs Window Cutoff */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Current Affairs Event Cutoff</span>
              </label>
              <input
                type="date"
                value={caCutoff}
                onChange={(e) => setCaCutoff(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-mono"
              />
              <span className="text-[10px] text-slate-500">
                Events beyond this date are strictly excluded.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Window Span (Months Prior)
              </label>
              <select
                value={caMonths}
                onChange={(e) => setCaMonths(parseInt(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-semibold"
              >
                <option value={6}>6 Months (High recency)</option>
                <option value={12}>12 Months (Standard standard)</option>
                <option value={18}>18 Months (Extended flagship schemes)</option>
              </select>
              <span className="text-[10px] text-slate-500">
                Determines acceptable historical window.
              </span>
            </div>
          </div>

          {/* Cross-Mode Reuse Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Allow Cross-Mode Reuse</span>
              <span className="text-[11px] text-slate-500">
                Permits non-repeat facts between full-length and topic-wise test modes
              </span>
            </div>
            <input
              type="checkbox"
              checked={allowCrossModeReuse}
              onChange={(e) => setAllowCrossModeReuse(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Allocating 10-Stage Slots...' : 'Execute Blueprint Allocation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
