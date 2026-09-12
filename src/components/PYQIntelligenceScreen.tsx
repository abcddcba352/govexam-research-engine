import React, { useState, useMemo } from 'react';
import type {
  ExamRecord,
  PreviousPaperRecord,
  PYQQuestionRecord,
  PaperWeightageAnalysis,
} from '../types.ts';
import {
  Brain,
  FileText,
  Sparkles,
  Search,
  UploadCloud,
  Clipboard,
  X,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Calendar,
  Check,
  Loader2,
  ChevronRight,
  Eye,
  Download,
  Copy,
  Lightbulb,
  ShieldAlert,
  Target,
  Compass,
  BookOpen,
} from 'lucide-react';
import {
  isCentralExam,
  getExamState,
} from '../utils/examJurisdiction.ts';
import { extractPdfTextInBrowser, extractScannedPdfWithVisionOcr } from '../utils/clientPdfExtractor.ts';

/* ─────────────────────────────────────────────────────────────────────────
   PYQ Intelligence Screen — Clean rewrite
   
   Simple flow:
   1. Pick exam from dropdown filters (State → Exam)
   2. Paste or upload question paper text
   3. Submit → AI analyses the paper (pattern recognition, weightage, design insights)
   4. Results stored & displayed
   ───────────────────────────────────────────────────────────────────────── */

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
  // ── Filter state ──
  const [selectedState, setSelectedState] = useState<string>(() => {
    const exam = exams.find(e => e.exam_id === selectedExamId) || exams[0];
    if (!exam) return 'ALL';
    return isCentralExam(exam) ? 'CENTRAL' : (getExamState(exam) || 'ALL');
  });

  // ── Upload state ──
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  const [year, setYear] = useState<number>(2024);
  const [paperName, setPaperName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Results state ──
  const [analysisResult, setAnalysisResult] = useState<PaperWeightageAnalysis | null>(null);
  const [importedQuestions, setImportedQuestions] = useState<PYQQuestionRecord[]>([]);
  const [importedPaper, setImportedPaper] = useState<PreviousPaperRecord | null>(null);

  // ── Past papers list ──
  const [papers, setPapers] = useState<PreviousPaperRecord[]>([]);
  const [questions, setQuestions] = useState<PYQQuestionRecord[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);

  // ── Derived: available states ──
  const availableStates = useMemo(() => {
    const statesSet = new Set<string>();
    let hasCentral = false;
    for (const e of exams) {
      if (isCentralExam(e)) hasCentral = true;
      else statesSet.add(getExamState(e) || 'Other');
    }
    const states: { id: string; label: string }[] = [
      { id: 'ALL', label: '🔍 All Exams' },
    ];
    if (hasCentral) states.push({ id: 'CENTRAL', label: '🏛️ Central / All-India' });
    Array.from(statesSet).sort().forEach(s => {
      states.push({ id: s, label: `🗺️ ${s}` });
    });
    return states;
  }, [exams]);

  // ── Derived: filtered exams ──
  const filteredExams = useMemo(() => {
    if (selectedState === 'ALL') return exams;
    if (selectedState === 'CENTRAL') return exams.filter(isCentralExam);
    return exams.filter(e => !isCentralExam(e) && getExamState(e) === selectedState);
  }, [exams, selectedState]);

  const activeExam = exams.find(e => e.exam_id === selectedExamId) || filteredExams[0] || exams[0];

  // ── Question count (safe line-by-line) ──
  const detectedQuestionCount = useMemo(() => {
    if (!pastedText.trim()) return 0;
    return pastedText.split('\n').filter(l =>
      /^\s*(?:Q(?:uestion)?\s*\d+[\.\:\)]?|\bQ\d+\b|\d+[\.\:][ \t])/i.test(l)
    ).length;
  }, [pastedText]);

  // ── Handlers ──
  const handleStateChange = (newState: string) => {
    setSelectedState(newState);
    let match = exams[0];
    if (newState === 'CENTRAL') {
      match = exams.find(isCentralExam) || exams[0];
    } else if (newState !== 'ALL') {
      match = exams.find(e => !isCentralExam(e) && getExamState(e) === newState) || exams[0];
    }
    if (match) onSelectExam(match.exam_id);
  };

  const handleExamChange = (newId: string) => {
    onSelectExam(newId);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    setSuccessMsg(null);

    // Auto-fill paper name from file name if empty
    if (!paperName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_\-+]/g, ' ');
      setPaperName(cleanName);
    }

    // 1. PDF File Upload
    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      setIsExtractingPdf(true);
      setPdfStatus('Reading PDF document...');
      setError(null);
      (async () => {
        try {
          if (file.size > 50 * 1024 * 1024) {
            throw new Error(`The PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB, which exceeds the 50 MB upload limit. Please select a smaller PDF or copy and paste the question text directly.`);
          }

          // A. Attempt client-side in-browser text extraction first (instantaneous, 0 network payload, 0 timeout risk)
          let extracted: any = null;
          try {
            extracted = await extractPdfTextInBrowser(file, (msg) => setPdfStatus(msg));
          } catch (clientErr: any) {
            console.warn('[PDF Extract] Client-side extraction notice:', clientErr?.message);
          }

          if (extracted && extracted.text && !extracted.isScannedOrIntegerOnly) {
            setPastedText(extracted.text);
            setSuccessMsg(`Extracted question paper text from "${file.name}" (${extracted.page_count} pages)! Review the text below and click "Analyse Paper".`);
            return;
          }

          // B. If PDF text layer is missing or contains only integers/page numbers, use HTML5 Canvas AI Vision OCR
          if (extracted?.isScannedOrIntegerOnly || !extracted?.text) {
            const pagesToScan = Math.min(extracted?.page_count || 6, 8);
            setPdfStatus(`Scanned/image PDF detected. Extracting questions using AI Vision OCR (Page 1 of ${pagesToScan})...`);

            try {
              const ocrResult = await extractScannedPdfWithVisionOcr(file, 8, (msg) => setPdfStatus(msg));
              if (ocrResult && ocrResult.text && ocrResult.text.length > 50) {
                setPastedText(ocrResult.text);
                const qMsg = ocrResult.question_count > 0 ? ` (${ocrResult.question_count} questions detected)` : '';
                setSuccessMsg(`AI Vision OCR successfully extracted questions from scanned paper "${file.name}"${qMsg}! Review below and click "Analyse Paper".`);
                return;
              }
            } catch (ocrErr: any) {
              console.warn('[Vision OCR Notice]', ocrErr?.message);
            }
          }

          // C. Server fallback with timeout if client could not parse complex streams and file is < 8MB
          if (file.size <= 8 * 1024 * 1024) {
            setPdfStatus('Processing with cloud assistance...');
            const arrayBuf = await file.arrayBuffer();
            const uint8 = new Uint8Array(arrayBuf);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < uint8.length; i += chunkSize) {
              const chunk = uint8.subarray(i, i + chunkSize);
              binary += String.fromCharCode.apply(null, chunk as any);
            }
            const base64 = btoa(binary);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            try {
              const res = await fetch('/api/pyq/extract-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64, filename: file.name }),
                signal: controller.signal
              });
              clearTimeout(timeoutId);

              const contentType = res.headers.get('content-type') || '';
              if (contentType.includes('application/json')) {
                const data = await res.json().catch(() => ({}));
                if (res.ok && data.success && data.text) {
                  setPastedText(data.text);
                  setSuccessMsg(`Extracted question paper text from "${file.name}" (${data.page_count || 1} pages)! Review the text below and click "Analyse Paper".`);
                  return;
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              }
            } catch (serverErr: any) {
              clearTimeout(timeoutId);
              console.warn('[PDF Extract] Server fallback notice:', serverErr?.message);
            }
          }

          // D. If text could not be extracted (e.g. illegible photocopy or unsupported layout)
          throw new Error(`Could not automatically extract readable questions from "${file.name}". The document appears to be a photocopied or scanned image without an OCR text layer. Please open the PDF, copy the questions, and paste them directly into the text box below.`);
        } catch (err: any) {
          setError(err.message || 'Error processing PDF file. You can also open the PDF, copy all text, and paste it directly into the text box below.');
        } finally {
          setIsExtractingPdf(false);
          setPdfStatus('');
        }
      })();
      return;
    }

    // 2. Plain Text or JSON File Upload
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        if (content.slice(0, 10).includes('\0') || content.startsWith('%PDF')) {
          setError('This file contains binary data. Please upload a PDF (.pdf) or plain text (.txt / .json) file.');
          return;
        }
        setPastedText(content);
        setSuccessMsg(`Loaded text file "${file.name}"!`);
      }
    };
    reader.onerror = () => {
      setError('Error reading text file.');
    };
    reader.readAsText(file);
  };

  const loadPastPapers = async (examId: string) => {
    setLoadingPapers(true);
    try {
      const [papersRes, questionsRes] = await Promise.all([
        fetch(`/api/pyq/papers?examId=${examId}`),
        fetch(`/api/pyq/questions?examId=${examId}`),
      ]);
      if (papersRes.ok) setPapers(await papersRes.json());
      if (questionsRes.ok) setQuestions(await questionsRes.json());
    } catch (err) {
      console.error('Failed to load papers:', err);
    } finally {
      setLoadingPapers(false);
    }
  };

  const handleSubmit = async () => {
    if (!pastedText.trim()) {
      setError('Please paste question paper text or upload a file.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    setAnalysisResult(null);

    try {
      const payload = {
        exam_id: activeExam?.exam_id || selectedExamId,
        paper_name: paperName || `${activeExam?.title || 'Exam'} - ${year} Paper`,
        year,
        exam_date: `${year}-01-01`,
        raw_text: pastedText,
        format: 'RAW_TEXT',
        ai_match_subjects: true,
      };

      const res = await fetch('/api/pyq/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      let result: any = {};
      if (contentType.includes('application/json')) {
        result = await res.json().catch(() => ({}));
      } else {
        const txt = await res.text().catch(() => '');
        result = { error: `Server returned ${res.status}: ${txt.slice(0, 150) || res.statusText}` };
      }

      if (!res.ok) {
        throw new Error(result.error || 'Failed to parse and analyse paper');
      }
      setSuccessMsg(`✅ Successfully analysed ${result.count} questions!`);
      setImportedQuestions(result.questions || []);
      setImportedPaper(result.paper || null);

      if (result.weightage_analysis) {
        setAnalysisResult(result.weightage_analysis);
      }
    } catch (err: any) {
      setError(err.message || 'Error analysing paper');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasteSample = () => {
    setPastedText(`Q1. Under Article 371-D of the Constitution of India, which of the following provisions was specifically created for the State of Andhra Pradesh?
(A) Creation of a Special Administrative Tribunal for Civil Services
(B) Exclusive reservation of 80% seats in all central universities
(C) Direct administration by the Union Home Ministry
(D) Complete exemption from NJAC guidelines
Answer: Option A
Explanation: Article 371-D governs public employment and educational quotas for local cadres.

Q2. Who among the following Kakatiya rulers constructed the Ramappa Temple?
(A) Prataparudra I
(B) Ganapati Deva
(C) Recharla Rudra
(D) Rani Rudrama Devi
Answer: Option C
Explanation: Commissioned in 1213 CE by Recharla Rudra, a general under Kakatiya king Ganapati Deva.

Q3. In which year was the Gentlemen's Agreement signed between leaders of Andhra and Telangana regions?
(A) 1953
(B) 1956
(C) 1969
(D) 1972
Answer: Option B
Explanation: Signed on 20 February 1956 prior to the formation of Andhra Pradesh.

Q4. Which monetary policy tool is a quantitative credit control measure by RBI?
(A) Moral Suasion
(B) Margin Requirements
(C) Cash Reserve Ratio (CRR)
(D) Credit Rationing
Answer: Option C
Explanation: CRR, SLR, and Repo rate are quantitative instruments used by the RBI.

Q5. Which Indian state shares borders with Nepal, Bhutan, and China?
(A) Sikkim
(B) Arunachal Pradesh
(C) West Bengal
(D) Uttarakhand
Answer: Option A
Explanation: Sikkim is bounded by Tibet (China), Bhutan, and Nepal.`);
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5 pb-16">
      {/* ── HEADER ── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Previous Year Paper Analysis (PYQ)
              </h2>
              <p className="text-xs text-slate-500">
                Upload a question paper → AI analyses patterns, weightage & design strategy
              </p>
            </div>
          </div>

          {activeExam && (
            <button
              type="button"
              onClick={() => {
                setShowQuestionBank(!showQuestionBank);
                if (!showQuestionBank) loadPastPapers(activeExam.exam_id);
              }}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>{showQuestionBank ? 'Hide' : 'View'} Question Bank</span>
            </button>
          )}
        </div>
      </div>

      {/* ── EXAM FILTER (simple dropdowns, NO ExamHierarchyFilter) ── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
          <span className="font-bold text-slate-800 text-sm">Select Exam</span>
          {activeExam && (
            <span className="ml-auto text-xs text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg font-medium">
              {activeExam.commission} • {activeExam.title}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* State / Category Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
              Category / State
            </label>
            <select
              value={selectedState}
              onChange={e => handleStateChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-blue-600 font-medium text-slate-800 text-xs cursor-pointer shadow-2xs"
            >
              {availableStates.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Exam Dropdown */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1 uppercase tracking-wider">
              Examination
            </label>
            <select
              value={selectedExamId}
              onChange={e => handleExamChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-blue-600 font-medium text-slate-800 text-xs cursor-pointer shadow-2xs"
            >
              {filteredExams.map(e => (
                <option key={e.exam_id} value={e.exam_id}>
                  [{e.commission}] {e.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── UPLOAD & ANALYSE SECTION ── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <UploadCloud className="w-4.5 h-4.5 text-indigo-600" />
          <span className="font-bold text-slate-800 text-sm">Upload Question Paper for AI Analysis</span>
        </div>

        {/* Error / Success Messages */}
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

        {/* Paper Details Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Paper Name (optional)</label>
            <input
              type="text"
              value={paperName}
              onChange={e => setPaperName(e.target.value)}
              placeholder={`e.g. ${activeExam?.title || 'Paper'} - Prelims`}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 text-slate-800 text-xs"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Year</label>
            <input
              type="number"
              min={2000}
              max={2030}
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 text-slate-800 text-xs font-semibold"
            />
          </div>
          <div className="flex items-end">
            <label className={`w-full border-2 border-dashed rounded-lg px-3 py-2 text-center cursor-pointer transition-colors flex items-center gap-2 justify-center ${
              isExtractingPdf
                ? 'border-indigo-400 bg-indigo-50/50 cursor-wait'
                : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/40'
            }`}>
              {isExtractingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span className="text-xs font-bold text-indigo-700 truncate max-w-[220px]">
                    {pdfStatus || 'Extracting PDF text...'}
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">
                    {fileName || 'Upload PDF / Text (.pdf, .txt)'}
                  </span>
                </>
              )}
              <input
                type="file"
                accept=".txt,.json,.pdf,application/pdf,text/plain"
                onChange={handleFileUpload}
                disabled={isExtractingPdf}
                className="hidden"
              />
            </label>
            <p className="text-[10px] text-slate-400 mt-1">
              Supports searchable PDFs, bilingual papers, and scanned photocopies (via AI Vision OCR).
            </p>
          </div>
        </div>

        {/* Text Area */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-600">
              Paste Question Paper Text
            </label>
            <div className="flex items-center gap-3">
              {detectedQuestionCount > 0 && (
                <span className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {detectedQuestionCount} questions detected
                </span>
              )}
              <button
                type="button"
                onClick={handlePasteSample}
                className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Insert Sample</span>
              </button>
            </div>
          </div>
          <textarea
            rows={8}
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            placeholder={`Paste the question paper here...

Example:
Q1. Which constitutional article provides for...
(A) Article 370
(B) Article 371-D
(C) Article 356
(D) Article 32
Answer: Option B
Explanation: Article 371-D...`}
            className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-blue-600 focus:bg-white transition-colors"
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-500">
            <Sparkles className="w-3 h-3 inline text-indigo-500 mr-1" />
            {isExtractingPdf ? (
              <span className="text-indigo-600 font-semibold animate-pulse">Extracting text from PDF, please wait...</span>
            ) : (
              'AI will analyse patterns, subject weightage, question design & strategy insights'
            )}
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isExtractingPdf || !pastedText.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analysing with AI...</span>
              </>
            ) : isExtractingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting PDF...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyse Paper</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── AI ANALYSIS RESULTS ── */}
      {analysisResult && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Results Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold tracking-tight">Paper Analysis & Pattern Intelligence</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {analysisResult.analyzed_by_gemini
                      ? `Gemini AI (${analysisResult.model_used || 'Active'})`
                      : 'Domain NLP Engine'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {analysisResult.paper_name} • {analysisResult.total_questions} Questions Analysed
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 1. Commission Design Strategy & Philosophy */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/90 via-blue-50/50 to-slate-50 border border-indigo-200/80 shadow-2xs">
              <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 mb-2">
                <Compass className="w-4 h-4 text-indigo-600" />
                <span className="uppercase tracking-wider">Commission Design Strategy & Paper Architecture</span>
              </div>
              <p className="text-xs text-indigo-950 leading-relaxed whitespace-pre-line font-normal">
                {analysisResult.pattern_insights?.exam_design_philosophy || analysisResult.strategic_summary}
              </p>
            </div>

            {/* 2. Cognitive & Nature Metrics Grid */}
            {analysisResult.pattern_insights && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Cognitive Distribution */}
                {analysisResult.pattern_insights.cognitive_breakdown && (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 uppercase tracking-wider">
                      <Brain className="w-3.5 h-3.5 text-indigo-600" />
                      Cognitive Depth
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Factual Recall</span>
                        <span className="font-bold text-slate-800">{analysisResult.pattern_insights.cognitive_breakdown.recall_pct}%</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Comprehension</span>
                        <span className="font-bold text-slate-800">{analysisResult.pattern_insights.cognitive_breakdown.understand_pct}%</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Application</span>
                        <span className="font-bold text-slate-800">{analysisResult.pattern_insights.cognitive_breakdown.application_pct}%</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Analytical</span>
                        <span className="font-bold text-slate-800">{analysisResult.pattern_insights.cognitive_breakdown.analytical_pct}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Static vs Current Balance */}
                {analysisResult.pattern_insights.nature_breakdown && (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 uppercase tracking-wider">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      Domain Balance
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] text-slate-600">Static Foundation</span>
                        <span className="font-bold text-blue-600">{analysisResult.pattern_insights.nature_breakdown.static_pct}%</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] text-slate-600">Current Affairs</span>
                        <span className="font-bold text-emerald-600">{analysisResult.pattern_insights.nature_breakdown.current_affairs_pct}%</span>
                      </div>
                      {analysisResult.pattern_insights.nature_breakdown.hybrid_pct > 0 && (
                        <div className="bg-white p-2 rounded-lg border border-slate-200 flex justify-between items-center">
                          <span className="text-[10px] text-slate-600">Hybrid Linkage</span>
                          <span className="font-bold text-purple-600">{analysisResult.pattern_insights.nature_breakdown.hybrid_pct}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Difficulty Mix */}
                {analysisResult.pattern_insights.difficulty_mix && (
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 uppercase tracking-wider">
                      <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                      Difficulty Tier
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] text-emerald-700 font-medium">Easy Questions</span>
                        <span className="font-bold text-emerald-600">{analysisResult.pattern_insights.difficulty_mix.easy_pct}%</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] text-amber-700 font-medium">Moderate Questions</span>
                        <span className="font-bold text-amber-600">{analysisResult.pattern_insights.difficulty_mix.moderate_pct}%</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200 flex justify-between items-center">
                        <span className="text-[10px] text-rose-700 font-medium">Difficult Questions</span>
                        <span className="font-bold text-rose-600">{analysisResult.pattern_insights.difficulty_mix.difficult_pct}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Trap & Distractor Patterns */}
            {analysisResult.pattern_insights?.trap_and_distractor_patterns &&
              analysisResult.pattern_insights.trap_and_distractor_patterns.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span className="uppercase tracking-wider">Examiner Pitfalls & Distractor Traps Detected</span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-amber-950">
                    {analysisResult.pattern_insights.trap_and_distractor_patterns.map((trap, i) => (
                      <li key={i} className="flex items-start gap-1.5 bg-white/80 p-2.5 rounded-lg border border-amber-200">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{trap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* 4. Strategic Preparation Roadmap */}
            {analysisResult.pattern_insights?.strategic_preparation_roadmap && (
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span className="uppercase tracking-wider">High-Yield Preparation Strategy</span>
                </div>
                <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                  {analysisResult.pattern_insights.strategic_preparation_roadmap}
                </p>
              </div>
            )}

            {/* 5. Subject Weightage Distribution */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Subject Weightage Distribution ({analysisResult.subjects.filter(s => s.question_count > 0).length} Tested Subjects)</span>
                <span className="text-[10px] text-slate-500 lowercase font-normal">ranked by question share</span>
              </h4>
              <div className="space-y-2.5">
                {analysisResult.subjects.filter(item => item.question_count > 0).map((item, idx) => (
                  <div
                    key={item.subject}
                    className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold">
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
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, item.percentage))}%` }}
                      />
                    </div>
                    {item.difficulty_breakdown && (
                      <div className="flex items-center gap-2 mt-2 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                          Easy: {item.difficulty_breakdown.EASY || 0}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                          Moderate: {item.difficulty_breakdown.MODERATE || 0}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                          Difficult: {item.difficulty_breakdown.DIFFICULT || 0}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 6. High-Yield Focus Areas */}
            {analysisResult.high_yield_topics && analysisResult.high_yield_topics.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                  <span>High-Yield Recurring Focus Areas</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {analysisResult.high_yield_topics.map((t, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5"
                    >
                      <span className="text-[10px] text-slate-400 font-semibold">{t.subject.split('&')[0].trim()}:</span>
                      <span className="font-semibold text-slate-900">{t.topic}</span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-white px-1.5 py-0.5 rounded">
                        {t.count} Qs
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── IMPORTED QUESTIONS PREVIEW ── */}
      {importedQuestions.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Questions Analysed & Saved to Question Bank ({importedQuestions.length})</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">Click each card to review examiner design strategy</span>
          </div>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {importedQuestions.slice(0, 30).map((q, i) => (
              <div
                key={q.pyq_question_id || i}
                className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-2 hover:border-indigo-300 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Q{q.question_number || (i + 1)}
                  </span>
                  {q.primary_subject && (
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200 text-[10px]">
                      {q.primary_subject}
                    </span>
                  )}
                  {q.primary_topic && (
                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200 text-[10px]">
                      {q.primary_topic}
                    </span>
                  )}
                  {q.question_archetype && (
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200 text-[10px]">
                      {q.question_archetype.replace(/_/g, ' ')}
                    </span>
                  )}
                  {q.difficulty && (
                    <span
                      className={`px-2 py-0.5 rounded font-semibold border text-[10px] ${
                        q.difficulty === 'EASY'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : q.difficulty === 'DIFFICULT'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  )}
                  {q.state_specificity === 'STATE_SPECIFIC' && (
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200 text-[10px]">
                      State-Specific
                    </span>
                  )}
                </div>

                <p className="text-slate-800 font-medium leading-relaxed pt-1">
                  {q.question_en}
                </p>

                {q.correct_answer && (
                  <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-2">
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Official Answer: Option {q.correct_answer}
                    </span>
                  </div>
                )}

                {/* Why Asked / Examiner Strategy callout */}
                {(q.why_asked_reason || q.reason_summary) && (
                  <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                      <span>Why This Question Was Asked (Examiner Strategy):</span>
                    </div>
                    <p className="text-amber-950 leading-relaxed">
                      {q.why_asked_reason || q.reason_summary}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {importedQuestions.length > 30 && (
              <p className="text-xs text-slate-500 text-center py-2">
                ... and {importedQuestions.length - 30} more questions saved to database
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── EXISTING QUESTION BANK ── */}
      {showQuestionBank && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Question Bank for {activeExam?.title || 'Selected Exam'}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{papers.length} Papers</span>
              <span>•</span>
              <span>{questions.length} Questions</span>
            </div>
          </div>

          {loadingPapers ? (
            <div className="flex items-center justify-center py-8 text-slate-500 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading question bank...
            </div>
          ) : papers.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No papers uploaded yet for this exam. Upload a paper above to get started.
            </div>
          ) : (
            <>
              {/* Papers List */}
              <div className="space-y-2">
                {papers.map(p => (
                  <div key={p.paper_id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{p.paper_name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{p.year}</span>
                        <span>•</span>
                        <span>{p.question_count || 0} Questions</span>
                        {p.booklet_code && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{p.booklet_code}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      p.analysis_status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {p.analysis_status || 'PENDING'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Questions Preview */}
              {questions.length > 0 && (
                <div className="space-y-2 mt-3 max-h-[300px] overflow-y-auto">
                  {questions.slice(0, 10).map((q, i) => (
                    <div key={q.pyq_question_id || i} className="p-3 rounded-lg bg-white border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800">Q{q.question_number || (i + 1)}.</span>
                        {q.primary_subject && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200 text-[10px]">
                            {q.primary_subject}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700">{q.question_en}</p>
                    </div>
                  ))}
                  {questions.length > 10 && (
                    <p className="text-xs text-slate-500 text-center py-1">
                      + {questions.length - 10} more questions in bank
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
