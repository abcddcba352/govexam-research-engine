import React, { useState } from 'react';
import {
  Youtube,
  Sparkles,
  Loader2,
  BookOpen,
  FileText,
  Link,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Plus
} from 'lucide-react';
import { ExamRecord, StudyMaterialItem } from '../types';

interface YoutubeMaterialExtractorProps {
  exams: ExamRecord[];
  selectedExamId?: string;
  onMaterialSaved?: (updatedExam: ExamRecord) => void;
}

export const YoutubeMaterialExtractor: React.FC<YoutubeMaterialExtractorProps> = ({
  exams,
  selectedExamId,
  onMaterialSaved
}) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [targetExamId, setTargetExamId] = useState<string>(selectedExamId || exams[0]?.exam_id || '');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [extractedMaterial, setExtractedMaterial] = useState<StudyMaterialItem | null>(null);
  const [copiedNotes, setCopiedNotes] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);

  // Active target exam object
  const activeExam = exams.find(e => e.exam_id === targetExamId);

  const handleExtract = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = videoUrl.trim();
    if (!cleanUrl) {
      setErrorMessage('Please enter a YouTube video URL.');
      return;
    }

    setIsExtracting(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);
    setExtractedMaterial(null);

    try {
      const res = await fetch('/api/research/extract-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          exam_query: activeExam?.title
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to read YouTube video.');
      }

      const data = await res.json();
      if (data.material) {
        setExtractedMaterial(data.material);
      } else {
        throw new Error('No video intelligence could be extracted.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error reading YouTube video.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveToExam = async () => {
    if (!extractedMaterial || !targetExamId) return;

    setIsSavingMaterial(true);
    setSaveSuccessMsg(null);
    setErrorMessage(null);

    try {
      const materialWithExam: StudyMaterialItem = {
        ...extractedMaterial,
        exam_id: targetExamId
      };

      const res = await fetch(`/api/exams/${targetExamId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material: materialWithExam })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save material to exam.');
      }

      const data = await res.json();
      if (data.exam && onMaterialSaved) {
        onMaterialSaved(data.exam);
      }
      setSaveSuccessMsg(`Saved as study material for "${activeExam?.title || 'Selected Exam'}"!`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving study material.');
    } finally {
      setIsSavingMaterial(false);
    }
  };

  const handleDeleteSavedMaterial = async (examId: string, materialId: string) => {
    if (!window.confirm('Delete this study material note?')) return;
    try {
      const res = await fetch(`/api/exams/${examId}/materials/${materialId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.exam && onMaterialSaved) {
          onMaterialSaved(data.exam);
        }
      }
    } catch (err) {
      console.error('Failed to delete material', err);
    }
  };

  const handleCopyNotes = () => {
    if (!extractedMaterial?.notes_markdown) return;
    navigator.clipboard.writeText(extractedMaterial.notes_markdown);
    setCopiedNotes(true);
    setTimeout(() => setCopiedNotes(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-red-200/90 shadow-sm overflow-hidden space-y-4 p-5 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-100 shadow-2xs">
            <Youtube className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Read YouTube Video & Extract Study Material Notes</span>
              <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-800 rounded-full font-semibold">
                AI Video Ingestion
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste coaching classes, syllabus reviews, or topic videos to extract syllabus domains, timestamps, Drive materials, and study notes.
            </p>
          </div>
        </div>

        {/* Target Exam Selector */}
        {exams.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-slate-500 font-medium">Attach to Exam:</span>
            <select
              value={targetExamId}
              onChange={(e) => setTargetExamId(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-1 focus:ring-red-500 cursor-pointer max-w-xs truncate"
            >
              {exams.map(e => (
                <option key={e.exam_id} value={e.exam_id}>
                  {e.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleExtract} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Youtube className="w-4 h-4 text-red-500 absolute left-3 top-3" />
            <input
              type="url"
              placeholder="Paste YouTube Video URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isExtracting || !videoUrl.trim()}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Reading & Analyzing Video Content...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Read Video & Extract Notes</span>
              </>
            )}
          </button>
        </div>

        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {saveSuccessMsg && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </form>

      {/* Extracted Video Result Card */}
      {extractedMaterial && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in">
          {/* Top Video Preview Header */}
          <div className="flex flex-col sm:flex-row gap-4">
            {extractedMaterial.thumbnail_url && (
              <div className="relative w-full sm:w-48 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-slate-200">
                <img
                  src={extractedMaterial.thumbnail_url}
                  alt={extractedMaterial.title}
                  className="w-full h-full object-cover"
                />
                {extractedMaterial.duration_seconds ? (
                  <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono font-bold flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    <span>
                      {Math.floor(extractedMaterial.duration_seconds / 60)}:
                      {String(extractedMaterial.duration_seconds % 60).padStart(2, '0')}
                    </span>
                  </span>
                ) : null}
              </div>
            )}

            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2 py-0.5 bg-red-100 text-red-800 rounded">
                  {extractedMaterial.author_or_channel}
                </span>
                {extractedMaterial.transcript_available && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded flex items-center gap-1">
                    <span>✨ Inside Video Intelligence Analyzed</span>
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                {extractedMaterial.title}
              </h4>

              <div className="flex items-center gap-2 pt-1 text-xs">
                <a
                  href={extractedMaterial.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-red-600 hover:text-red-700 font-semibold inline-flex items-center gap-1 hover:underline"
                >
                  <span>Watch on YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Extracted Syllabus Topics */}
          {extractedMaterial.extracted_topics.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-700 block mb-1.5">
                Extracted Syllabus Topics ({extractedMaterial.extracted_topics.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {extractedMaterial.extracted_topics.map((topic, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 bg-white border border-indigo-200 text-indigo-800 rounded-md font-medium"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Drive / Material Links */}
          {extractedMaterial.material_links.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-700 block mb-1">
                📥 Shared Material & Drive Links ({extractedMaterial.material_links.length}):
              </span>
              <div className="space-y-1">
                {extractedMaterial.material_links.map((link, i) => (
                  <a
                    key={i}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-mono text-blue-600 hover:underline block truncate"
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Formatted Markdown Notes Preview */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700">
                Generated Study Material Notes:
              </span>
              <button
                type="button"
                onClick={handleCopyNotes}
                className="px-2 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedNotes ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                <span>{copiedNotes ? 'Copied!' : 'Copy Notes'}</span>
              </button>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200 max-h-56 overflow-y-auto font-mono text-[11px] text-slate-800 whitespace-pre-wrap">
              {extractedMaterial.notes_markdown}
            </div>
          </div>

          {/* Action Bar: Keep as Material */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-600">
              Attach to exam: <strong className="text-slate-900">{activeExam?.title || 'Selected Exam'}</strong>
            </div>

            <button
              type="button"
              onClick={handleSaveToExam}
              disabled={isSavingMaterial}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSavingMaterial ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to Exam...</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>💾 Keep as Study Material Notes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Currently Saved Study Materials for Selected Exam */}
      {activeExam?.study_materials && activeExam.study_materials.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Saved Study Materials for {activeExam.title} ({activeExam.study_materials.length})</span>
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeExam.study_materials.map((mat) => {
              const isExpanded = expandedMaterialId === mat.material_id;
              return (
                <div
                  key={mat.material_id}
                  className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between"
                >
                  <div className="flex items-start gap-2.5">
                    {mat.thumbnail_url ? (
                      <img
                        src={mat.thumbnail_url}
                        alt={mat.title}
                        className="w-16 h-12 rounded object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-12 rounded bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                        {mat.author_or_channel || 'YouTube'}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900 truncate mt-0.5" title={mat.title}>
                        {mat.title}
                      </h5>
                      <span className="text-[10px] text-slate-400 block">
                        {mat.extracted_topics?.length || 0} Topics • {new Date(mat.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in">
                      <div className="p-2 bg-slate-50 rounded border border-slate-200 font-mono text-[10px] text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {mat.notes_markdown}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedMaterialId(isExpanded ? null : mat.material_id)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Notes' : 'Read Notes'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <div className="flex items-center gap-2">
                      <a
                        href={mat.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded cursor-pointer"
                        title="Watch Video on YouTube"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedMaterial(activeExam.exam_id, mat.material_id)}
                        className="text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-50 rounded cursor-pointer"
                        title="Delete this material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
