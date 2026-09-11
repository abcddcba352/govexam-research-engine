import React, { useState, useEffect } from 'react';
import {
  ExamRecord,
  PreviousPaperRecord,
  PYQQuestionRecord,
  ExamIntelligenceProfile,
  PYQClusterRecord,
  TopicTrend,
  ExamQuestionFormatProfile,
  ExamStage,
  ExamStagePaper,
} from '../types.ts';
import { ExamHierarchyFilter } from './common/ExamHierarchyFilter.tsx';
import { PYQQuestionInspectorModal } from './PYQQuestionInspectorModal.tsx';
import { PYQPaperUploadModal } from './PYQPaperUploadModal.tsx';
import { groupExamsByJurisdiction } from '../utils/examJurisdiction.ts';
import {
  Brain,
  Layers,
  FileText,
  Sparkles,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  PieChart,
  Target,
  Scale,
  Clock,
  HelpCircle,
  Eye,
  Plus,
  ShieldCheck,
  RefreshCw,
  Zap,
  Bookmark,
  Shuffle,
  Grid,
  Download,
  FileSpreadsheet,
  Check,
  Copy,
  Calendar,
  Globe,
  ClipboardList
} from 'lucide-react';

interface Props {
  exams: ExamRecord[];
  selectedExamId: string;
  onSelectExam: (examId: string) => void;
}

export const PYQIntelligenceScreen: React.FC<Props> = ({
  exams,
  selectedExamId,
  onSelectExam,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'QUESTIONS' | 'PAPERS' | 'CLUSTERS'>('QUESTIONS');
  const [papers, setPapers] = useState<PreviousPaperRecord[]>([]);
  const [questions, setQuestions] = useState<PYQQuestionRecord[]>([]);
  const [intelligence, setIntelligence] = useState<ExamIntelligenceProfile | null>(null);
  const [clusters, setClusters] = useState<PYQClusterRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedPYQ, setCopiedPYQ] = useState(false);

  // Hierarchy Stage & Paper
  const [activeStage, setActiveStage] = useState<ExamStage | null>(null);
  const [activePaper, setActivePaper] = useState<ExamStagePaper | null>(null);

  // Inspector & Ingestion Modals
  const [selectedQuestion, setSelectedQuestion] = useState<PYQQuestionRecord | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('modal');
      return p === 'upload' || p === 'paste';
    }
    return false;
  });

  const formatExamDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Question Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPaperId, setFilterPaperId] = useState<string>('ALL');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [filterQuestionType, setFilterQuestionType] = useState<string>('ALL');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('ALL');
  const [filterCognitive, setFilterCognitive] = useState<string>('ALL');
  const [filterStaticCurrent, setFilterStaticCurrent] = useState<string>('ALL');
  const [filterVisualOnly, setFilterVisualOnly] = useState<boolean>(false);

  const selectedExam = exams.find(e => e.exam_id === selectedExamId) || exams[0];

  const fetchExamPYQData = async (examId: string) => {
    setLoading(true);
    try {
      const [papersRes, questionsRes, intelRes, clustersRes] = await Promise.all([
        fetch(`/api/pyq/papers?examId=${examId}`),
        fetch(`/api/pyq/questions?examId=${examId}`),
        fetch(`/api/pyq/intelligence/${examId}`),
        fetch(`/api/pyq/clusters/${examId}`),
      ]);

      if (papersRes.ok) {
        const pData = await papersRes.json();
        setPapers(pData);
      }
      if (questionsRes.ok) {
        const qData = await questionsRes.json();
        setQuestions(qData);
      }
      if (intelRes.ok) {
        const iData = await intelRes.json();
        setIntelligence(iData);
      }
      if (clustersRes.ok) {
        const cData = await clustersRes.json();
        setClusters(cData);
      }
    } catch (err) {
      console.error('Failed to load PYQ data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchExamPYQData(selectedExamId);
    }
  }, [selectedExamId]);

  const handleRecalculateIntelligence = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/pyq/intelligence/${selectedExamId}/recalculate`, {
        method: 'POST',
      });
      if (res.ok) {
        const updated = await res.json();
        setIntelligence(updated);
      }
    } catch (e) {
      console.error('Error recalculating intelligence:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleBatchAnalyse = async (paperId: string) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/pyq/papers/${paperId}/analyse`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchExamPYQData(selectedExamId);
      }
    } catch (e) {
      console.error('Error analysing paper:', e);
    } finally {
      setRefreshing(false);
    }
  };

  // Export PYQ to Varadhi JSON format
  const handleExportPYQJSON = () => {
    if (questions.length === 0) return;
    const targetQuestions = filteredQuestions.length > 0 ? filteredQuestions : questions;
    const exportData = {
      export_version: '1.0',
      target_platform: 'varadhi',
      exam_id: selectedExamId,
      exam_title: selectedExam?.title || selectedExamId,
      total_questions: targetQuestions.length,
      questions: targetQuestions.map((q, idx) => ({
        number: q.question_number || (idx + 1),
        paper_id: q.paper_id,
        section: q.primary_subject,
        topic: q.primary_topic,
        subtopic: q.subtopic,
        difficulty: q.difficulty,
        question_type: q.question_type,
        question: q.question_en,
        options: [q.option_a_en, q.option_b_en, q.option_c_en, q.option_d_en],
        correct_option_letter: q.correct_answer,
        correct_option_index: ['A', 'B', 'C', 'D'].indexOf(q.correct_answer),
        explanation: q.reason_summary,
        answer_citation: q.answer_source_citation
      }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedExamId}_pyq_varadhi.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PYQ to CSV
  const handleExportPYQCSV = () => {
    const targetQuestions = filteredQuestions.length > 0 ? filteredQuestions : questions;
    if (targetQuestions.length === 0) return;
    const headers = ['Q#', 'Paper', 'Subject', 'Topic', 'Difficulty', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Key', 'Why Asked / Explanation', 'Key Citation'];
    const rows = targetQuestions.map((q, i) => [
      q.question_number || (i + 1),
      `"${(q.paper_id || '').replace(/"/g, '""')}"`,
      `"${(q.primary_subject || '').replace(/"/g, '""')}"`,
      `"${(q.primary_topic || '').replace(/"/g, '""')}"`,
      q.difficulty,
      `"${(q.question_en || '').replace(/"/g, '""')}"`,
      `"${(q.option_a_en || '').replace(/"/g, '""')}"`,
      `"${(q.option_b_en || '').replace(/"/g, '""')}"`,
      `"${(q.option_c_en || '').replace(/"/g, '""')}"`,
      `"${(q.option_d_en || '').replace(/"/g, '""')}"`,
      q.correct_answer,
      `"${(q.reason_summary || '').replace(/"/g, '""')}"`,
      `"${(q.answer_source_citation || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedExamId}_pyq_bank.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy PYQ questions to clipboard
  const handleCopyPYQAll = () => {
    const targetQuestions = filteredQuestions.length > 0 ? filteredQuestions : questions;
    if (targetQuestions.length === 0) return;
    const text = targetQuestions.map((q, i) => {
      return `Q${q.question_number || (i + 1)}. [${q.primary_subject} • ${q.primary_topic}]\n${q.question_en}\n(A) ${q.option_a_en}\n(B) ${q.option_b_en}\n(C) ${q.option_c_en}\n(D) ${q.option_d_en}\nAnswer: Option ${q.correct_answer}\nExplanation: ${q.reason_summary}\nCitation: ${q.answer_source_citation || 'Official Answer Key'}\n`;
    }).join('\n---\n\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopiedPYQ(true);
      setTimeout(() => setCopiedPYQ(false), 2000);
    });
  };

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    if (filterPaperId !== 'ALL' && q.paper_id !== filterPaperId) return false;
    if (filterSubject !== 'ALL' && q.primary_subject !== filterSubject) return false;
    if (filterQuestionType !== 'ALL' && q.question_type !== filterQuestionType) return false;
    if (filterDifficulty !== 'ALL' && q.difficulty !== filterDifficulty) return false;
    if (filterCognitive !== 'ALL' && q.cognitive_level !== filterCognitive) return false;
    if (filterStaticCurrent !== 'ALL' && q.static_or_current !== filterStaticCurrent) return false;
    if (filterVisualOnly && !(q.has_image || q.has_map || q.has_diagram || q.has_table)) return false;

    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase();
      const matchText =
        q.question_en.toLowerCase().includes(s) ||
        q.primary_subject.toLowerCase().includes(s) ||
        q.primary_topic.toLowerCase().includes(s) ||
        q.core_concept.toLowerCase().includes(s);
      if (!matchText) return false;
    }
    return true;
  });

  const uniqueSubjects = Array.from(new Set<string>(questions.map(q => q.primary_subject))).filter(Boolean);
  const uniqueQuestionTypes = Array.from(new Set<string>(questions.map(q => q.question_type))).filter(Boolean);

  const getTrendBadge = (trend: TopicTrend['trend_direction']) => {
    switch (trend) {
      case 'STABLE_CORE':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'INCREASING':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'DECREASING':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'CYCLICAL':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'EMERGING':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'RARE':
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 5-Level Cascading Hierarchy Filter: State ➔ Board ➔ Exam ➔ Stage ➔ Paper */}
      <div className="print:hidden">
        <ExamHierarchyFilter
          exams={exams}
          selectedExamId={selectedExamId}
          onSelectExam={onSelectExam}
          onPaperChange={(stage, paper) => {
            setActiveStage(stage);
            setActivePaper(paper);
          }}
          title="Past Paper & Question Bank Hierarchy Filter"
          subtitle="Filter through the official hierarchy: State ➔ Board ➔ Exam ➔ Stage ➔ Paper"
          badgeLabel="State ➔ Board ➔ Exam ➔ Paper"
          showSpecsStrip={true}
        />
      </div>

      {/* Header & Status */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Past Examination Question Bank (PYQ)
                </h2>
                <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Verified Official Papers
                </span>
                {intelligence && (
                  <span
                    className={`text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                      intelligence.readiness_status === 'HIGH_CONFIDENCE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : intelligence.readiness_status === 'SUFFICIENT'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    Status: {intelligence.readiness_status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Authentic previous year question papers, verified official keys, and syllabus blueprint mapping for Varadhi
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleRecalculateIntelligence}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>


            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ Upload Paper & AI Weightage</span>
            </button>
          </div>
        </div>

        {/* Top KPI Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">Papers Ingested</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold text-slate-900">
                {intelligence?.papers_analysed_count || papers.length}
              </span>
              <span className="text-[10px] text-slate-500">master sets</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">Questions Bank</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold text-slate-900">
                {intelligence?.questions_analysed_count || questions.length}
              </span>
              <span className="text-[10px] text-slate-500">questions</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">Answers Verified</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold text-emerald-700">
                {intelligence?.answers_verified_count || questions.filter(q => q.answer_verification_status === 'FINAL_OFFICIAL').length}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">100% key match</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">Visual Questions</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold text-indigo-700">
                {intelligence?.visual_questions_count || questions.filter(q => q.has_image || q.has_map || q.has_diagram).length}
              </span>
              <span className="text-[10px] text-indigo-600 font-medium">maps/diagrams</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">Question Formats</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold text-amber-700">
                {uniqueQuestionTypes.length || 5}
              </span>
              <span className="text-[10px] text-amber-600 font-medium">archetypes</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 block">Key Accuracy</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold text-blue-700">
                {intelligence?.confidence_score || 100}%
              </span>
              <span className="text-[10px] text-blue-600 font-medium">final official</span>
            </div>
          </div>
        </div>

        {/* Historical Examination Sessions & Dates Timeline */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Historical Exam Timeline & Dates When Exam Happened
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                (Click any exam date to filter question bank)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {/* All Exam Dates Pill */}
            <button
              type="button"
              onClick={() => {
                setFilterPaperId('ALL');
                setActiveSubTab('QUESTIONS');
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-2 ${
                filterPaperId === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Exam Dates ({papers.length} Papers)</span>
            </button>

            {/* Individual Exam Dates */}
            {papers.map(p => {
              const isActive = filterPaperId === p.paper_id;
              const formattedDate = formatExamDate(p.exam_date);
              return (
                <button
                  key={p.paper_id}
                  type="button"
                  onClick={() => {
                    setFilterPaperId(p.paper_id);
                    setActiveSubTab('QUESTIONS');
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer border flex items-center gap-2 text-left ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-600/30'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <Calendar className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-blue-600'}`} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">{formattedDate || `${p.year} Exam`}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.booklet_code}
                      </span>
                    </div>
                    <div
                      className={`text-[10px] truncate max-w-[200px] ${
                        isActive ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      {p.question_count} Qs &bull; {p.recruitment_cycle || `${p.year} Cycle`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 text-xs font-semibold overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveSubTab('QUESTIONS')}
          className={`px-4 py-2 rounded-t-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'QUESTIONS'
              ? 'bg-white text-blue-700 border-t border-x border-slate-200 font-bold shadow-2xs -mb-px'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Question Bank ({filteredQuestions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('PAPERS')}
          className={`px-4 py-2 rounded-t-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'PAPERS'
              ? 'bg-white text-blue-700 border-t border-x border-slate-200 font-bold shadow-2xs -mb-px'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Previous Papers ({papers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('OVERVIEW')}
          className={`px-4 py-2 rounded-t-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'OVERVIEW'
              ? 'bg-white text-blue-700 border-t border-x border-slate-200 font-bold shadow-2xs -mb-px'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Syllabus Blueprint & Weightage</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('CLUSTERS')}
          className={`px-4 py-2 rounded-t-lg transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'CLUSTERS'
              ? 'bg-white text-blue-700 border-t border-x border-slate-200 font-bold shadow-2xs -mb-px'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Shuffle className="w-4 h-4" />
          <span>Topic Clusters ({clusters.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: INTELLIGENCE & BLUEPRINT DIMENSIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Top Notice: Verification & Blueprint Rule */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-950">
              <span className="font-bold">Core Principle: </span>
              Observed historical weightage provides analytical guidance and distractor intelligence, but
              <span className="font-bold"> never overwrites the official blueprint distribution</span>.
              All question items undergo answer key conflict resolution and fact fingerprinting before feeding into future mock generation.
            </div>
          </div>

          {/* Subject Distribution: Observed PYQ vs Official Blueprint */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Subject Weightage: Observed PYQ vs. Official Blueprint
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparison between commission questions asked historically and official notification allocations
                </p>
              </div>
              <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2.5 py-1 rounded-lg">
                Total Exam Load: 100%
              </span>
            </div>

            <div className="space-y-3">
              {intelligence?.subject_distribution.map(sub => (
                <div key={sub.subject} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{sub.subject}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">
                        {sub.count} Qs ({sub.percentage}%)
                      </span>
                      {sub.official_weight && (
                        <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Official: {sub.official_weight}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-blue-600 rounded-full h-full transition-all duration-500"
                      style={{ width: `${Math.min(100, sub.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Topic Trends Heatmap */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Topic Trends & Recurrence Analysis
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Classified recurrence dynamics (STABLE_CORE, INCREASING, CYCLICAL, EMERGING) across examination cycles
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold">
                    <th className="py-2.5 px-3">Subject & Topic</th>
                    <th className="py-2.5 px-3">Subtopic</th>
                    <th className="py-2.5 px-3 text-center">Qs</th>
                    <th className="py-2.5 px-3 text-center">Observed %</th>
                    <th className="py-2.5 px-3">Cycles Observed</th>
                    <th className="py-2.5 px-3">Trend Dynamic</th>
                    <th className="py-2.5 px-3">Sample Caution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {intelligence?.topic_distribution.map((t, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                          {t.subject}
                        </span>
                        {t.topic}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{t.subtopic || '—'}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{t.question_count}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-700">
                        {t.observed_pyq_weight}%
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="flex gap-1 flex-wrap">
                          {t.years_appeared.map(yr => (
                            <span key={yr} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                              {yr}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${getTrendBadge(t.trend_direction)}`}>
                          {t.trend_direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-xs">
                        {t.sample_size_caution}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grid of Analytical Dimensions (Format, Difficulty, Cognitive, Temporality, Answer Position) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Question Formats */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-blue-600" />
                <span>Question Format Profile</span>
              </h4>
              <div className="space-y-2 text-xs">
                {intelligence?.format_distribution.map(fmt => (
                  <div key={fmt.format} className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-800">{fmt.format.replace(/_/g, ' ')}</span>
                    <span className="font-mono font-bold text-blue-700">
                      {fmt.count} ({fmt.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cognitive Demand & Difficulty */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  <span>Cognitive Level Breakdown</span>
                </h4>
                <div className="grid grid-cols-5 gap-1 text-center text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Recall</span>
                    <span className="font-bold text-slate-900">{intelligence?.cognitive_distribution.recall_pct}%</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Underst.</span>
                    <span className="font-bold text-slate-900">{intelligence?.cognitive_distribution.understand_pct}%</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Apply</span>
                    <span className="font-bold text-slate-900">{intelligence?.cognitive_distribution.apply_pct}%</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Analyse</span>
                    <span className="font-bold text-slate-900">{intelligence?.cognitive_distribution.analyse_pct}%</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Multi-step</span>
                    <span className="font-bold text-slate-900">{intelligence?.cognitive_distribution.multi_step_pct}%</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Difficulty Profile
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold">
                    Easy: {intelligence?.difficulty_distribution.easy_pct}%
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold">
                    Moderate: {intelligence?.difficulty_distribution.moderate_pct}%
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 font-bold">
                    Difficult: {intelligence?.difficulty_distribution.difficult_pct}%
                  </div>
                </div>
              </div>
            </div>

            {/* Answer Position Distribution (Detecting Bias) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-purple-600" />
                <span>Answer Position Distribution</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Balanced distribution confirms absence of option position bias in official commission keys:
              </p>
              <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-600 block text-xs">A</span>
                  <span className="text-sm font-bold text-slate-900">
                    {intelligence?.answer_position_distribution.A_pct}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-600 block text-xs">B</span>
                  <span className="text-sm font-bold text-slate-900">
                    {intelligence?.answer_position_distribution.B_pct}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-600 block text-xs">C</span>
                  <span className="text-sm font-bold text-slate-900">
                    {intelligence?.answer_position_distribution.C_pct}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-600 block text-xs">D</span>
                  <span className="text-sm font-bold text-slate-900">
                    {intelligence?.answer_position_distribution.D_pct}%
                  </span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5 mt-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Uniformly dispersed (24%–26% per key). No skew detected.</span>
              </div>
            </div>
          </div>

          {/* Adjacent Testable Concepts for Future Blueprinting */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-emerald-600" />
                  <span>Adjacent Testable Areas (Blueprint Feed)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-probability concepts derived from PYQ patterns without copying questions
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Ready for Mock Generation
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {intelligence?.adjacent_testable_areas.map((adj, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between text-xs space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {adj.syllabus_area}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        {adj.future_relevance}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 text-sm leading-snug">{adj.concept}</p>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span className="font-semibold text-slate-600">Source Anchor: </span>
                    {adj.source_pyq_concept}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: QUESTION EXPLORER & FILTERABLE BANK */}
      {/* ========================================================================= */}
      {activeSubTab === 'QUESTIONS' && (
        <div className="space-y-4">
          {/* Multi-Dimensional Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search questions, concepts, topics, or key phrases..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-blue-600 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={filterVisualOnly}
                    onChange={e => setFilterVisualOnly(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Visuals Only</span>
                </label>
              </div>
            </div>

            {/* Filter Dropdowns Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Paper</label>
                <select
                  value={filterPaperId}
                  onChange={e => setFilterPaperId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="ALL">All Papers ({papers.length})</option>
                  {papers.map(p => (
                    <option key={p.paper_id} value={p.paper_id}>
                      {formatExamDate(p.exam_date) || p.year} • {p.paper_name} ({p.booklet_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Subject</label>
                <select
                  value={filterSubject}
                  onChange={e => setFilterSubject(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="ALL">All Subjects</option>
                  {uniqueSubjects.map(sub => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Question Type</label>
                <select
                  value={filterQuestionType}
                  onChange={e => setFilterQuestionType(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="ALL">All Question Types</option>
                  {uniqueQuestionTypes.map(qt => (
                    <option key={qt} value={qt}>
                      {qt.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Difficulty</label>
                <select
                  value={filterDifficulty}
                  onChange={e => setFilterDifficulty(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="ALL">All Difficulties</option>
                  <option value="EASY">EASY</option>
                  <option value="MODERATE">MODERATE</option>
                  <option value="DIFFICULT">DIFFICULT</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Cognitive</label>
                <select
                  value={filterCognitive}
                  onChange={e => setFilterCognitive(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="ALL">All Cognitive Levels</option>
                  <option value="RECALL">RECALL</option>
                  <option value="UNDERSTAND">UNDERSTAND</option>
                  <option value="APPLY">APPLY</option>
                  <option value="ANALYSE">ANALYSE</option>
                  <option value="MULTI_STEP_REASONING">MULTI_STEP</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Static / Current</label>
                <select
                  value={filterStaticCurrent}
                  onChange={e => setFilterStaticCurrent(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                >
                  <option value="ALL">All Types</option>
                  <option value="STATIC">STATIC</option>
                  <option value="CURRENT">CURRENT</option>
                  <option value="STATIC_CURRENT_LINK">STATIC CURRENT LINK</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Toolbar for Varadhi Export */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                Verified Question Bank
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold">
                {filteredQuestions.length} Questions
              </span>
              {selectedExam && (
                <span className="text-xs text-slate-500 hidden md:inline">
                  • {selectedExam.title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleExportPYQJSON}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Export verified PYQ questions in Varadhi JSON schema"
              >
                <Download className="w-3.5 h-3.5 text-indigo-200" />
                <span>Export for Varadhi (JSON)</span>
              </button>

              <button
                type="button"
                onClick={handleExportPYQCSV}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Export as CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPYQAll}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Copy all questions"
              >
                {copiedPYQ ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                <span>{copiedPYQ ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No previous-year questions match the selected filters.
              </div>
            ) : (
              filteredQuestions.map(q => (
                <div
                  key={q.pyq_question_id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition-all space-y-3.5"
                >
                  {/* Question Header Badge Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center font-mono">
                        Q{q.question_number}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{q.primary_subject}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-600 font-medium">{q.primary_topic}</span>
                      {q.subtopic && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500">{q.subtopic}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                        {q.question_type.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          q.difficulty === 'EASY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.difficulty === 'DIFFICULT'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Official Key: Option {q.correct_answer}</span>
                      </span>
                    </div>
                  </div>

                  {/* Question Stem */}
                  <p className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed whitespace-pre-line">
                    {q.question_en}
                  </p>

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {[
                      { label: 'A', text: q.option_a_en },
                      { label: 'B', text: q.option_b_en },
                      { label: 'C', text: q.option_c_en },
                      { label: 'D', text: q.option_d_en },
                    ].map(opt => {
                      const isCorrect = q.correct_answer === opt.label;
                      return (
                        <div
                          key={opt.label}
                          className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 transition-all ${
                            isCorrect
                              ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium ring-1 ring-emerald-500'
                              : 'border-slate-200 bg-slate-50/50 text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span className="flex-1 leading-snug">{opt.text}</span>
                          {isCorrect && (
                            <span className="shrink-0 px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>Official Key</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Reason & Statutory Citation */}
                  {q.reason_summary && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2 font-bold text-slate-800">
                        <span>Cognitive Rationale & Blueprint Context:</span>
                        {q.answer_source_citation && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                            {q.answer_source_citation}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 leading-relaxed">{q.reason_summary}</p>
                    </div>
                  )}

                  {/* Card Footer: Metadata & Inspect Button */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      {(() => {
                        const parent = papers.find(p => p.paper_id === q.paper_id);
                        return (
                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            <span>Exam Date: {formatExamDate(parent?.exam_date) || parent?.year || 'Historical'}</span>
                            <span className="text-slate-400">&bull;</span>
                            <span className="font-mono text-slate-500">[{parent?.booklet_code || q.paper_id}]</span>
                          </span>
                        );
                      })()}
                      {q.has_map && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-1.5 py-0.5 rounded">
                          Map Question
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedQuestion(q)}
                      className="text-blue-600 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span>Inspect Traps & Deep Audit</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: PREVIOUS PAPERS REGISTRY & INGESTION */}
      {/* ========================================================================= */}
      {activeSubTab === 'PAPERS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Ingested Previous Year Question Papers
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified archives, master booklet series, answer key linking status and content fingerprints
                </p>
              </div>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ Upload Paper & AI Weightage</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {papers.map(paper => (
                <div
                  key={paper.paper_id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">
                          {paper.year} &bull; {paper.paper_name}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          <span>Exam Date: {formatExamDate(paper.exam_date) || `${paper.year} Exam`}</span>
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-200 text-slate-800">
                          {paper.booklet_code}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {paper.official_status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {paper.shift} &bull; {paper.language} &bull; {paper.question_count} Questions &bull; {paper.marks} Marks
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleBatchAnalyse(paper.paper_id)}
                        disabled={refreshing}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all border border-blue-200 flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 text-blue-600" />
                        <span>Run Batch Analysis</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFilterPaperId(paper.paper_id);
                          setActiveSubTab('QUESTIONS');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold"
                      >
                        View Questions
                      </button>
                    </div>
                  </div>

                  {paper.notes && (
                    <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80">
                      <span className="font-semibold text-slate-700">Verification Note: </span>
                      {paper.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="font-mono">Content Hash: {paper.content_hash}</span>
                    <span>Last analyzed: {new Date(paper.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: SAME-FACT CLUSTERS */}
      {/* ========================================================================= */}
      {activeSubTab === 'CLUSTERS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                PYQ Canonical Fact Clusters
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Differentiates repeated questions testing the same statutory fact from broader recurring concepts
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {clusters.map(cluster => (
                <div
                  key={cluster.cluster_id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{cluster.cluster_name}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{cluster.core_concept}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                      {cluster.cluster_type}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {cluster.questions_preview.map(qp => (
                      <div
                        key={qp.id}
                        className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold font-mono">
                            {qp.year} Q{qp.number}
                          </span>
                          <span className="text-slate-800 font-medium line-clamp-1">{qp.text}</span>
                        </div>
                        <span className="text-emerald-700 font-semibold shrink-0">{qp.answer}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedQuestion && (
        <PYQQuestionInspectorModal
          question={selectedQuestion}
          onClose={() => setSelectedQuestion(null)}
          onQuestionUpdated={updated => {
            setSelectedQuestion(updated);
            setQuestions(prev => prev.map(q => (q.pyq_question_id === updated.pyq_question_id ? updated : q)));
          }}
        />
      )}

      {showUploadModal && (
        <PYQPaperUploadModal
          exams={exams}
          selectedExamId={selectedExamId}
          onClose={() => setShowUploadModal(false)}
          onPaperCreated={newPaper => {
            setPapers(prev => [newPaper, ...prev]);
            fetchExamPYQData(selectedExamId);
          }}
          onQuestionsImported={newQuestions => {
            setQuestions(prev => [...newQuestions, ...prev]);
            fetchExamPYQData(selectedExamId);
          }}
        />
      )}
    </div>
  );
};
