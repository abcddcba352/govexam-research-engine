import React, { useState } from 'react';
import { PreviousPaperRecord, ExamRecord, PreviousPaperOfficialStatus } from '../types.ts';
import { X, FileText, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';

interface Props {
  exams: ExamRecord[];
  selectedExamId: string;
  onClose: () => void;
  onPaperCreated: (paper: PreviousPaperRecord) => void;
}

export const PYQPaperUploadModal: React.FC<Props> = ({
  exams,
  selectedExamId,
  onClose,
  onPaperCreated,
}) => {
  const [examId, setExamId] = useState(selectedExamId);
  const [year, setYear] = useState<number>(2023);
  const [paperName, setPaperName] = useState('Paper-I: General Studies and General Abilities');
  const [shift, setShift] = useState('Morning Session');
  const [bookletCode, setBookletCode] = useState('Series-A');
  const [language, setLanguage] = useState('English & Telugu');
  const [officialStatus, setOfficialStatus] = useState<PreviousPaperOfficialStatus>('OFFICIAL');
  const [questionCount, setQuestionCount] = useState<number>(150);
  const [marks, setMarks] = useState<number>(150);
  const [durationMinutes, setDurationMinutes] = useState<number>(150);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const selectedExam = exams.find(ex => ex.exam_id === examId);
      const res = await fetch('/api/pyq/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: examId,
          recruitment_cycle: selectedExam?.active_cycle || `${year} Cycle`,
          year,
          paper_name: paperName,
          shift,
          booklet_code: bookletCode,
          language,
          official_status: officialStatus,
          question_count: questionCount,
          marks,
          duration_minutes: durationMinutes,
          notes,
          extraction_status: 'EXTRACTED',
          analysis_status: 'COMPLETED',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to register paper');
      }

      const created = await res.json();
      onPaperCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating paper record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Ingest Previous Year Paper</h2>
              <p className="text-xs text-slate-500">Document verification & fingerprint registry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Target Examination</label>
            <select
              value={examId}
              onChange={e => setExamId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium text-slate-800"
            >
              {exams.map(e => (
                <option key={e.exam_id} value={e.exam_id}>
                  {e.title} ({e.commission})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Examination Year</label>
              <input
                type="number"
                min={2000}
                max={2030}
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Booklet / Series Code</label>
              <input
                type="text"
                value={bookletCode}
                onChange={e => setBookletCode(e.target.value)}
                placeholder="e.g. Series-A or Set-1"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Paper Title & Number</label>
            <input
              type="text"
              value={paperName}
              onChange={e => setPaperName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Shift / Session</label>
              <input
                type="text"
                value={shift}
                onChange={e => setShift(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Language</label>
              <input
                type="text"
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Questions</label>
              <input
                type="number"
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Total Marks</label>
              <input
                type="number"
                value={marks}
                onChange={e => setMarks(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Minutes</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Document Official Status</label>
            <select
              value={officialStatus}
              onChange={e => setOfficialStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-medium"
            >
              <option value="OFFICIAL">OFFICIAL (Commission Master with Final Key)</option>
              <option value="GOVERNMENT_ARCHIVE">GOVERNMENT_ARCHIVE (Historical Gazette / Archive)</option>
              <option value="SECONDARY_COPY">SECONDARY_COPY (Verified Academy / Master Objections)</option>
              <option value="USER_UPLOAD_UNVERIFIED">USER_UPLOAD_UNVERIFIED (Requires Auditor Review)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Extraction Notes / Source Context</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g., Master question paper released by Commission post objection resolution."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-blue-600"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Ingesting...' : 'Register Paper'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
