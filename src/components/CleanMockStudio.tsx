import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Download,
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  BookOpen,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Zap,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import type { ExamRecord, MockTestRecord, MockQuestion } from '../types.ts';
import { getCleanExamTitle } from '../utils/examJurisdiction.ts';

interface CleanMockStudioProps {
  exams: ExamRecord[];
  initialExamId?: string;
  onNavigateToAdvanced?: () => void;
}

export const CleanMockStudio: React.FC<CleanMockStudioProps> = ({
  exams,
  initialExamId,
  onNavigateToAdvanced,
}) => {
  const defaultExamId = useMemo(() => {
    if (initialExamId) return initialExamId;
    // Prefer exams with ready content so the studio lands on an active test
    const preferred = exams.find(e => e.exam_id === 'appsc_group_2_screening' || e.exam_id.includes('group_2') || e.exam_id.includes('cgl'));
    return preferred ? preferred.exam_id : (exams.length > 0 ? exams[0].exam_id : '');
  }, [exams, initialExamId]);

  // Selection State
  const [selectedExamId, setSelectedExamId] = useState<string>(defaultExamId);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState<number>(25);
  const [customQuestionCount, setCustomQuestionCount] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'Standard' | 'Hard' | 'Previous Year Pattern'>('Standard');

  // Mocks State
  const [mocks, setMocks] = useState<MockTestRecord[]>([]);
  const [activeMock, setActiveMock] = useState<MockTestRecord | null>(null);
  const [isLoadingMocks, setIsLoadingMocks] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('ALL');

  const selectedExam = useMemo(
    () => exams.find(e => e.exam_id === selectedExamId) || exams[0],
    [exams, selectedExamId]
  );

  useEffect(() => {
    if (initialExamId && exams.some(e => e.exam_id === initialExamId)) {
      setSelectedExamId(initialExamId);
    } else if (exams.length > 0 && (!selectedExamId || !exams.some(e => e.exam_id === selectedExamId))) {
      setSelectedExamId(defaultExamId);
    }
  }, [initialExamId, exams, defaultExamId, selectedExamId]);

  // Fetch Mocks for Selected Exam
  const fetchMocks = async (examId: string, targetMockNum?: number) => {
    if (!examId) return;
    setIsLoadingMocks(true);
    try {
      const res = await fetch(`/api/mocks?exam_id=${examId}`);
      if (res.ok) {
        const data: MockTestRecord[] = await res.json();
        setMocks(data);
        if (data.length > 0) {
          if (targetMockNum) {
            const matched = data.find(m => m.mock_number === targetMockNum);
            setActiveMock(matched || data[0]);
          } else {
            // Default to the mock test with the most questions (e.g. 25 Qs / 50 Qs), or latest
            const sortedByRichness = [...data].sort((a, b) => 
              (b.total_questions || 0) - (a.total_questions || 0) || 
              new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            );
            setActiveMock(sortedByRichness[0]);
          }
        } else {
          setActiveMock(null);
        }
      }
    } catch (err) {
      console.error('Failed to load mocks:', err);
    } finally {
      setIsLoadingMocks(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      fetchMocks(selectedExamId);
    }
  }, [selectedExamId]);

  // Handle Question Count Preset
  const handlePresetSelect = (count: number) => {
    setSelectedQuestionCount(count);
    setCustomQuestionCount('');
  };

  const handleCustomCountChange = (val: string) => {
    setCustomQuestionCount(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setSelectedQuestionCount(num);
    }
  };

  // Generate Mock Test
  const handleGenerate = async () => {
    if (!selectedExamId) return;
    setIsGenerating(true);
    setGenerationProgress(`Connecting to Gemini 3.6 Flash for ${selectedExam?.title || selectedExamId}...`);

    try {
      const count = selectedQuestionCount || 25;
      const res = await fetch('/api/mocks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: selectedExamId,
          question_count: count,
          difficulty: selectedDifficulty,
          provider: 'gemini',
          preparation_mode: selectedExam?.preparation_mode || 'PRE_NOTIFICATION_PREPARATION'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Mock generation failed');
      }

      const data = await res.json();
      const newMock: MockTestRecord = data.mock;
      setMocks(prev => [newMock, ...prev]);
      setActiveMock(newMock);
      setGenerationProgress('');
    } catch (err: any) {
      alert(`Generation notice: ${err.message || 'Error occurred'}`);
    } finally {
      setIsGenerating(false);
      setGenerationProgress('');
    }
  };

  // Flatten active mock questions
  const allQuestions: MockQuestion[] = useMemo(() => {
    return activeMock ? activeMock.sections.flatMap(s => s.questions) : [];
  }, [activeMock]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter(q => {
      const matchesSearch = !searchQuery ||
        q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.options.some(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSection = activeSectionFilter === 'ALL' || q.section_name === activeSectionFilter;

      return matchesSearch && matchesSection;
    });
  }, [allQuestions, searchQuery, activeSectionFilter]);

  // Sections in active mock
  const activeSections = useMemo(() => {
    const set = new Set<string>();
    allQuestions.forEach(q => set.add(q.section_name));
    return Array.from(set);
  }, [allQuestions]);

  // Export to Varadhi (Clean JSON)
  const handleExportVaradhiJSON = async () => {
    if (!activeMock) return;
    try {
      const res = await fetch(`/api/mocks/${activeMock.mock_id}/varadhi-export`);
      let exportData: any;
      if (res.ok) {
        exportData = await res.json();
      } else {
        exportData = {
          export_version: '1.0',
          target_platform: 'varadhi',
          mock_id: activeMock.mock_id,
          title: activeMock.title,
          exam_id: activeMock.exam_id,
          total_questions: activeMock.total_questions,
          total_marks: activeMock.total_marks,
          duration_minutes: activeMock.duration_minutes,
          negative_marking_rate: activeMock.negative_marking_rate,
          questions: allQuestions.map((q, idx) => ({
            number: idx + 1,
            section: q.section_name,
            topic: q.topic,
            difficulty: q.difficulty,
            question: q.question_text,
            options: q.options,
            correct_option_index: q.correct_option_index,
            correct_option_letter: ['A', 'B', 'C', 'D'][q.correct_option_index] || 'A',
            explanation: q.explanation,
            source_reference: q.source_reference
          }))
        };
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeMock.exam_id}_mock_${activeMock.mock_number}_varadhi.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!activeMock || allQuestions.length === 0) return;
    const headers = ['Q#', 'Subject', 'Topic', 'Difficulty', 'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Key', 'Explanation', 'Statutory Source'];
    const rows = allQuestions.map((q, i) => [
      i + 1,
      `"${(q.section_name || '').replace(/"/g, '""')}"`,
      `"${(q.topic || '').replace(/"/g, '""')}"`,
      q.difficulty,
      `"${(q.question_text || '').replace(/"/g, '""')}"`,
      `"${(q.options[0] || '').replace(/"/g, '""')}"`,
      `"${(q.options[1] || '').replace(/"/g, '""')}"`,
      `"${(q.options[2] || '').replace(/"/g, '""')}"`,
      `"${(q.options[3] || '').replace(/"/g, '""')}"`,
      ['A', 'B', 'C', 'D'][q.correct_option_index] || '',
      `"${(q.explanation || '').replace(/"/g, '""')}"`,
      `"${(q.source_reference || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeMock.exam_id}_mock_${activeMock.mock_number}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy all questions to clipboard
  const handleCopyAll = () => {
    if (allQuestions.length === 0) return;
    const text = allQuestions.map((q, i) => {
      const key = ['A', 'B', 'C', 'D'][q.correct_option_index] || '';
      return `Q${i + 1}. [${q.section_name} • ${q.topic}]\n${q.question_text}\n(A) ${q.options[0]}\n(B) ${q.options[1]}\n(C) ${q.options[2]}\n(D) ${q.options[3]}\nAnswer: Option ${key}\nExplanation: ${q.explanation}\n`;
    }).join('\n---\n\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2000);
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Clean Studio Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-2">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>GEMINI 3.6 FLASH ACTIVE • VARADHI CONTENT ENGINE</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Mock Test Generator Studio
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Generate authentic, syllabus-governed question papers and export them directly to your Varadhi platform.
          </p>
        </div>

        {onNavigateToAdvanced && (
          <button
            type="button"
            onClick={onNavigateToAdvanced}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors self-start md:self-auto cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Open Advanced Audit Tools</span>
          </button>
        )}
      </div>

      {/* 3-Step Quick Generator Card */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md space-y-5 border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Quick Test Generator</span>
          </h2>
          <span className="text-xs text-slate-400">
            Official syllabus topics • Deduplication ledger • Verified keys
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1: Select Exam */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              1. Target Examination
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
            >
              {exams.map(ex => (
                <option key={ex.exam_id} value={ex.exam_id}>
                  {getCleanExamTitle(ex)} ({ex.commission})
                </option>
              ))}
            </select>
            {selectedExam && (
              <p className="text-[11px] text-slate-400 truncate">
                {selectedExam.paper} • {selectedExam.pattern.total_questions} Qs official • -{selectedExam.pattern.negative_marking_rate} penalty
              </p>
            )}
          </div>

          {/* Step 2: Choose Question Count */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              2. Test Size (Questions)
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { count: 10, label: '10 Qs' },
                { count: 25, label: '25 Qs' },
                { count: 50, label: '50 Qs' },
                { count: selectedExam?.pattern.total_questions || 150, label: `Full (${selectedExam?.pattern.total_questions || 150})` }
              ].map(p => (
                <button
                  key={p.count}
                  type="button"
                  onClick={() => handlePresetSelect(p.count)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                    selectedQuestionCount === p.count && !customQuestionCount
                      ? 'bg-emerald-500 text-slate-950 shadow-xs font-black'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400">Or custom count:</span>
              <input
                type="number"
                min="5"
                max="200"
                placeholder="e.g. 30"
                value={customQuestionCount}
                onChange={e => handleCustomCountChange(e.target.value)}
                className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Step 3: Difficulty & Generate Action */}
          <div className="space-y-2 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                3. Difficulty Profile
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value as any)}
                className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="Standard">Standard (Official Difficulty Mix)</option>
                <option value="Hard">Hard (In-Depth Analytical & Case Based)</option>
                <option value="Previous Year Pattern">Previous Year Pattern Calibrated</option>
              </select>
            </div>

            <button
              type="button"
              disabled={isGenerating || !selectedExamId}
              onClick={handleGenerate}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed mt-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating {selectedQuestionCount} Questions...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-slate-950 fill-current" />
                  <span>Generate {selectedQuestionCount} Questions</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live generation progress banner */}
        {isGenerating && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3 animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
            <span>{generationProgress || 'Gemini 3.6 Flash is composing questions against syllabus topics and verifying answer keys...'}</span>
          </div>
        )}
      </div>

      {/* Main Studio View: Active Paper & Questions */}
      {isLoadingMocks ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Loading generated papers...
        </div>
      ) : activeMock ? (
        <div className="space-y-4">
          {/* Active Paper Specs & Varadhi Export Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold">
                  Paper #{activeMock.mock_number}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                  {activeMock.total_questions} Questions
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                  {activeMock.duration_minutes} Mins
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
                  -{activeMock.negative_marking_rate} Neg
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Verified
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-2">
                {activeMock.title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeMock.exam_title} • Generated via {activeMock.generation_model_id || 'Gemini 3.6 Flash'}
              </p>
            </div>

            {/* Export Actions (VARADHI READY) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportVaradhiJSON}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Download clean structured JSON formatted for Varadhi platform"
              >
                <Download className="w-4 h-4 text-indigo-200" />
                <span>Export for Varadhi (JSON)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Export as CSV spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>CSV</span>
              </button>

              <button
                type="button"
                onClick={handleCopyAll}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Copy all questions to clipboard"
              >
                {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                <span>{copiedSuccess ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Print or export to PDF"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Questions Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1">Section:</span>
              <button
                type="button"
                onClick={() => setActiveSectionFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeSectionFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All Sections ({allQuestions.length})
              </button>
              {activeSections.map(sec => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setActiveSectionFilter(sec)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeSectionFilter === sec
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Filter questions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
                No questions match your current filter.
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const optLetters = ['A', 'B', 'C', 'D'];
                return (
                  <div
                    key={q.question_id || idx}
                    className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4 transition-all hover:border-slate-300"
                  >
                    {/* Question Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center font-mono">
                          Q{idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {q.section_name}
                        </span>
                        {q.topic && (
                          <span className="text-xs text-slate-400">
                            • {q.topic}
                          </span>
                        )}
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        q.difficulty === 'EASY'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : q.difficulty === 'HARD'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>

                    {/* Question Stem */}
                    <p className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed whitespace-pre-line">
                      {q.question_text}
                    </p>

                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((optText, oIdx) => {
                        const isCorrect = q.correct_option_index === oIdx;
                        return (
                          <div
                            key={oIdx}
                            className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 transition-all ${
                              isCorrect
                                ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium ring-1 ring-emerald-500'
                                : 'border-slate-200 bg-slate-50/50 text-slate-700'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              {optLetters[oIdx]}
                            </span>
                            <span className="flex-1 leading-snug">{optText}</span>
                            {isCorrect && (
                              <span className="shrink-0 px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>Approved Key</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2 font-bold text-slate-800">
                          <span>Statutory Explanation & Solution:</span>
                          {q.source_reference && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Ref: {q.source_reference}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 leading-relaxed pl-2 border-l-2 border-indigo-500">
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Mock Tests Generated Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Choose your question count above and click "Generate Questions" to create your first test using Gemini 3.6 Flash.
          </p>
        </div>
      )}

      {/* Past Generated Papers Tray */}
      {mocks.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Previously Generated Papers for {selectedExam?.title} ({mocks.length} Total)
            </h3>
            <span className="text-xs text-slate-400">Click any paper to switch view</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {mocks.map(m => (
              <button
                key={m.mock_id}
                type="button"
                onClick={() => setActiveMock(m)}
                className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                  activeMock?.mock_id === m.mock_id
                    ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500 font-semibold'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Mock #{m.mock_number}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono">
                    {m.total_questions} Qs
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-1">{m.title}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
