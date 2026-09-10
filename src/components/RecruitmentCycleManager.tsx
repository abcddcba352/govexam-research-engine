import React, { useState } from 'react';
import {
  History,
  Calendar,
  Layers,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Info,
  Clock
} from 'lucide-react';
import { ExamRecord, ExamPatternVersion } from '../types';

interface RecruitmentCycleManagerProps {
  exam: ExamRecord;
  onSwitchCycle: (cycleName: string) => Promise<void>;
  onAddCycleVersion: (newVersion: Partial<ExamPatternVersion>) => Promise<void>;
}

export const RecruitmentCycleManager: React.FC<RecruitmentCycleManagerProps> = ({
  exam,
  onSwitchCycle,
  onAddCycleVersion,
}) => {
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  // New version form state
  const [cycleName, setCycleName] = useState<string>('');
  const [notificationNumber, setNotificationNumber] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [totalQuestions, setTotalQuestions] = useState<number>(exam.pattern.total_questions);
  const [durationMinutes, setDurationMinutes] = useState<number>(exam.pattern.duration_minutes);
  const [negativeMarking, setNegativeMarking] = useState<number>(exam.pattern.negative_marking_rate);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const versions: ExamPatternVersion[] = exam.pattern_versions || [
    {
      version_id: `${exam.exam_id}_current`,
      exam_id: exam.exam_id,
      recruitment_cycle: exam.active_cycle || exam.recruitment_cycle,
      notification_number: 'Current Notification',
      effective_date: new Date().toISOString().split('T')[0],
      pattern: { ...exam.pattern },
      syllabus_topics: [...exam.syllabus_topics],
      is_active: true,
      notes: 'Active primary recruitment cycle scheme'
    }
  ];

  const handleSelectCycle = async (cycle: string) => {
    if (cycle === (exam.active_cycle || exam.recruitment_cycle)) return;
    setSwitchingTo(cycle);
    try {
      await onSwitchCycle(cycle);
    } finally {
      setSwitchingTo(null);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleName.trim()) return;
    setIsSaving(true);
    try {
      await onAddCycleVersion({
        recruitment_cycle: cycleName.trim(),
        notification_number: notificationNumber.trim() || 'Official Gazette',
        effective_date: effectiveDate,
        notes: notes.trim(),
        pattern: {
          ...exam.pattern,
          total_questions: totalQuestions,
          duration_minutes: durationMinutes,
          negative_marking_rate: negativeMarking,
          total_marks: totalQuestions * (exam.pattern.marks_per_question || 1),
        },
      });
      setIsAddingNew(false);
      setCycleName('');
      setNotificationNumber('');
      setNotes('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <h4 className="font-bold text-slate-800 text-sm">Recruitment-Cycle Pattern Versioning</h4>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {versions.length} Version{versions.length > 1 ? 's' : ''} Preserved
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
          <span>{isAddingNew ? 'Cancel New Version' : 'New Cycle Scheme'}</span>
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2 p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 text-blue-800 text-[11px]">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            <strong>Historical Pattern Integrity Rule:</strong> Never overwrite previous notification schemes when commissions revise patterns. Select a cycle to load its specific pattern and facts without erasing historical datasets.
          </span>
        </div>

        {/* Existing Versions List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {versions.map((ver) => {
            const isActive = ver.recruitment_cycle === (exam.active_cycle || exam.recruitment_cycle);
            const isPending = switchingTo === ver.recruitment_cycle;

            return (
              <div
                key={ver.version_id}
                className={`p-3 rounded-xl border transition-all relative ${
                  isActive
                    ? 'bg-indigo-50/40 border-indigo-400 ring-1 ring-indigo-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{ver.recruitment_cycle}</span>
                      {isActive && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-600 text-white">
                          ACTIVE CYCLE
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>Notif: {ver.notification_number || 'N/A'}</span>
                      <span>•</span>
                      <span>Effective: {ver.effective_date}</span>
                    </div>
                  </div>

                  {!isActive && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSelectCycle(ver.recruitment_cycle)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-300 font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isPending ? 'Switching...' : 'Switch to Cycle'}
                    </button>
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Questions</span>
                    <span className="font-semibold text-slate-800">{ver.pattern.total_questions} Qs</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Negative Penalty</span>
                    <span className="font-semibold text-slate-800">
                      {ver.pattern.negative_marking_rate === 0
                        ? 'None (0.0)'
                        : `-${ver.pattern.negative_marking_rate}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Duration</span>
                    <span className="font-semibold text-slate-800">{ver.pattern.duration_minutes} Mins</span>
                  </div>
                </div>

                {ver.notes && (
                  <p className="mt-2 text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded">
                    "{ver.notes}"
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Add New Cycle Form Modal / Accordion */}
        {isAddingNew && (
          <form onSubmit={handleCreateVersion} className="p-4 bg-slate-50 rounded-xl border border-indigo-200 space-y-3 mt-3 animate-in fade-in">
            <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Define Separate Recruitment Cycle Version</span>
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 text-[11px] font-semibold mb-1">Recruitment Cycle Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Notification 04/2025 (Upcoming)"
                  value={cycleName}
                  onChange={e => setCycleName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-[11px] font-semibold mb-1">Notification Number</label>
                <input
                  type="text"
                  placeholder="e.g. 04/2025"
                  value={notificationNumber}
                  onChange={e => setNotificationNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-[11px] font-semibold mb-1">Effective Date</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 text-[11px] mb-1">Total Questions</label>
                <input
                  type="number"
                  value={totalQuestions}
                  onChange={e => setTotalQuestions(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-[11px] mb-1">Duration (Mins)</label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-[11px] mb-1">Negative Marking Rate</label>
                <select
                  value={negativeMarking}
                  onChange={e => setNegativeMarking(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value={0}>0 (No Penalty)</option>
                  <option value={0.25}>0.25 (1/4th)</option>
                  <option value={0.33}>0.33 (1/3rd)</option>
                  <option value={0.5}>0.50 (1/2)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 text-[11px] mb-1">Version Notes / Gazette Context</label>
              <input
                type="text"
                placeholder="Reason or notification context for this scheme version..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-semibold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Preserving Version...' : 'Save as Active Cycle'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
