import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  Scale,
  History,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
import { ExamRecord, CriticalFactName, OfficialSourceRegistryRecord } from '../types';

interface AuditorSignoffModalProps {
  exam: ExamRecord;
  targetFact?: {
    key: CriticalFactName;
    label: string;
    currentValue: any;
  } | null;
  onClose: () => void;
  onSignoffSuccess: (updatedExam: ExamRecord) => void;
}

export const AuditorSignoffModal: React.FC<AuditorSignoffModalProps> = ({
  exam,
  targetFact,
  onClose,
  onSignoffSuccess,
}) => {
  const [sources, setSources] = useState<OfficialSourceRegistryRecord[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [customSourceRef, setCustomSourceRef] = useState<string>('');
  const [evidenceText, setEvidenceText] = useState<string>('');
  const [recruitmentCycle, setRecruitmentCycle] = useState<string>(
    exam.active_cycle || exam.recruitment_cycle || 'Current Notification'
  );
  const [auditorName, setAuditorName] = useState<string>('Lead Curriculum Auditor');
  const [reason, setReason] = useState<string>('');

  // Values
  const [negativeRate, setNegativeRate] = useState<number>(exam.pattern.negative_marking_rate);
  const [totalQuestions, setTotalQuestions] = useState<number>(exam.pattern.total_questions);
  const [durationMinutes, setDurationMinutes] = useState<number>(exam.pattern.duration_minutes);
  const [totalMarks, setTotalMarks] = useState<number>(exam.pattern.total_marks);
  const [targetFactValue, setTargetFactValue] = useState<string>(
    targetFact ? String(targetFact.currentValue ?? '') : ''
  );

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch available sources
  useEffect(() => {
    fetch(`/api/sources?exam_id=${exam.exam_id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSources(data);
          if (data.length > 0) {
            setSelectedSourceId(data[0].source_id);
            setCustomSourceRef(data[0].url || data[0].title);
          }
        }
      })
      .catch(() => {});
  }, [exam.exam_id]);

  const handleSourceSelect = (id: string) => {
    setSelectedSourceId(id);
    const found = sources.find(s => s.source_id === id);
    if (found) {
      setCustomSourceRef(found.url || found.title);
      if (!evidenceText && found.summary) {
        setEvidenceText(found.summary);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Strict validation: source evidence is mandatory
    if (!evidenceText.trim()) {
      setErrorMsg('Mandatory: Please provide official gazette evidence text or rule paragraph citation.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Mandatory: Please provide an auditor justification reason.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (targetFact) {
        // Individual fact verification mode
        const res = await fetch(`/api/exams/${exam.exam_id}/verify-fact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fact_name: targetFact.key,
            new_value: targetFactValue,
            previous_value: targetFact.currentValue,
            evidence_text: evidenceText.trim(),
            source_ref: customSourceRef.trim() || 'Official Gazette Review',
            auditor: auditorName.trim(),
            reason: reason.trim(),
            recruitment_cycle: recruitmentCycle.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to verify fact');
        onSignoffSuccess(data.exam);
      } else {
        // Comprehensive pattern sign-off
        const res = await fetch(`/api/exams/${exam.exam_id}/verify-pattern`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recruitment_cycle: recruitmentCycle.trim(),
            negative_marking_rate: negativeRate,
            total_questions: totalQuestions,
            duration_minutes: durationMinutes,
            total_marks: totalMarks,
            source_ref: customSourceRef.trim() || 'Official Commission Gazette & Notification',
            source_id: selectedSourceId || undefined,
            evidence_text: evidenceText.trim(),
            reason: reason.trim(),
            auditor: auditorName.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to record auditor sign-off');
        onSignoffSuccess(data.exam);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Auditor sign-off submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden text-xs flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {targetFact ? `Auditor Fact Sign-Off: ${targetFact.label}` : 'Comprehensive Auditor Pattern Sign-Off'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Creates an immutable audit record with previous value, new value, official citation & timestamp.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Exam Context Box */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900">{exam.title}</div>
            <div className="text-[11px] text-slate-500 flex flex-wrap gap-2">
              <span>{exam.commission}</span>
              <span>•</span>
              <span>{exam.stage}</span>
              <span>•</span>
              <span className="font-medium text-slate-700">Current Cycle: {exam.active_cycle || exam.recruitment_cycle}</span>
            </div>
          </div>

          {/* Applicable Recruitment Cycle */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Applicable Recruitment Cycle *
            </label>
            <input
              type="text"
              required
              value={recruitmentCycle}
              onChange={e => setRecruitmentCycle(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              placeholder="e.g. Notification 28/2022 (Current Cycle 2024-2025)"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Identifies which notification scheme this verification certifies.
            </p>
          </div>

          {/* Applicable Source Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Official Source Document *
            </label>
            {sources.length > 0 && (
              <select
                value={selectedSourceId}
                onChange={e => handleSourceSelect(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white mb-2"
              >
                {sources.map(s => (
                  <option key={s.source_id} value={s.source_id}>
                    [{s.source_level}] {s.title} ({s.domain})
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              required
              value={customSourceRef}
              onChange={e => setCustomSourceRef(e.target.value)}
              placeholder="Official Gazette / Notification URL or Document Citation"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono text-[11px]"
            />
          </div>

          {/* Official Evidence Text Snippet (MANDATORY) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Official Evidence Text / Gazette Citation *</span>
              <span className="text-[10px] text-rose-600 font-normal">Strict Requirement</span>
            </label>
            <textarea
              required
              rows={3}
              value={evidenceText}
              onChange={e => setEvidenceText(e.target.value)}
              placeholder="Paste exact paragraph or sentence from the official notification (e.g. 'Paragraph 8(d): Each wrong answer carries a penalty of one-fourth (0.25) of the mark allotted to that question.')"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Value Overrides */}
          {targetFact ? (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Verified Value for <span className="text-emerald-700 font-bold">{targetFact.label}</span>
              </label>
              <input
                type="text"
                required
                value={targetFactValue}
                onChange={e => setTargetFactValue(e.target.value)}
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg bg-emerald-50/30 font-semibold text-slate-900"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Previous Value: {String(targetFact.currentValue ?? 'None')}
              </span>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Pattern Parameters</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 text-[10px] mb-0.5">Negative Marking Penalty</label>
                  <select
                    value={negativeRate}
                    onChange={e => setNegativeRate(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold text-slate-900"
                  >
                    <option value={0}>0 (No Penalty)</option>
                    <option value={0.25}>0.25 (1/4th) - TGPSC Standard</option>
                    <option value={0.33}>0.33 (1/3rd) - APPSC / UPSC</option>
                    <option value={0.5}>0.50 (1/2) - SSC CGL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 text-[10px] mb-0.5">Total Questions</label>
                  <input
                    type="number"
                    value={totalQuestions}
                    onChange={e => {
                      const q = Number(e.target.value);
                      setTotalQuestions(q);
                      setTotalMarks(q * (exam.pattern.marks_per_question || 1));
                    }}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-[10px] mb-0.5">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 text-[10px] mb-0.5">Total Marks</label>
                  <input
                    type="number"
                    value={totalMarks}
                    onChange={e => setTotalMarks(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-semibold text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Auditor Name & Justification */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Auditor Full Name / Title *
              </label>
              <input
                type="text"
                required
                value={auditorName}
                onChange={e => setAuditorName(e.target.value)}
                placeholder="e.g. Lead PSC Curriculum Auditor"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Justification / Reason *
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Reconciled against official GO & Press Note"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Audit Trail Guarantee Notice */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Immutable Audit Trail Guaranteed</div>
              <p className="text-[10px] text-emerald-800 mt-0.5">
                This verification will be permanently logged under <code className="bg-emerald-100 px-1 py-0.2 rounded font-mono">PATTERN_VERIFICATION_AUDIT</code> with timestamp, auditor attribution, previous value, and new value.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Signing & Verifying...' : 'Sign & Verify Scheme'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
