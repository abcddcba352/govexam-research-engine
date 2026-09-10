import React, { useState, useEffect, useCallback } from 'react';
import {
  ExamRecord,
  MockBlueprintRecord,
  CreateBlueprintInput,
  BlueprintQuestionSlot
} from '../types.ts';
import { BlueprintHeader } from './blueprint/BlueprintHeader.tsx';
import { BlueprintCreateModal } from './blueprint/BlueprintCreateModal.tsx';
import { AllocationSummaryTab } from './blueprint/AllocationSummaryTab.tsx';
import { AuditSuiteTab } from './blueprint/AuditSuiteTab.tsx';
import { SeriesLedgerTab } from './blueprint/SeriesLedgerTab.tsx';
import { QuestionSlotsTab } from './blueprint/QuestionSlotsTab.tsx';
import { BlueprintLogsTab } from './blueprint/BlueprintLogsTab.tsx';
import {
  Layers,
  PieChart,
  ShieldCheck,
  FileCheck2,
  SlidersHorizontal,
  History,
  AlertCircle,
  PlusCircle,
  BookOpen
} from 'lucide-react';

interface BlueprintStudioScreenProps {
  exams: ExamRecord[];
  selectedExamId: string;
  onSelectExam: (examId: string) => void;
  onNavigateToMocks?: (blueprintId: string) => void;
}

export function BlueprintStudioScreen({
  exams,
  selectedExamId,
  onSelectExam,
  onNavigateToMocks
}: BlueprintStudioScreenProps) {
  const [blueprints, setBlueprints] = useState<MockBlueprintRecord[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>('');
  const [activeBlueprint, setActiveBlueprint] = useState<MockBlueprintRecord | null>(null);

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<
    'ALLOCATION' | 'AUDIT' | 'LEDGER' | 'SLOTS' | 'LOGS'
  >('ALLOCATION');

  // Modal & Loading states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isUpdatingSlot, setIsUpdatingSlot] = useState(false);
  const [isGeneratingMock, setIsGeneratingMock] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load blueprints for the exam
  const loadBlueprints = useCallback(async (examId: string, preferredId?: string) => {
    try {
      const res = await fetch(`/api/blueprints?exam_id=${examId}`);
      const data: MockBlueprintRecord[] = await res.json();
      setBlueprints(data);

      if (data.length > 0) {
        const toSelect = preferredId
          ? data.find(b => b.blueprint_id === preferredId) || data[0]
          : data[0];
        setSelectedBlueprintId(toSelect.blueprint_id);
        setActiveBlueprint(toSelect);
      } else {
        setSelectedBlueprintId('');
        setActiveBlueprint(null);
      }
    } catch (err) {
      console.error("Failed to load blueprints:", err);
    }
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      loadBlueprints(selectedExamId);
    }
  }, [selectedExamId, loadBlueprints]);

  // Handle blueprint selector change
  const handleSelectBlueprint = (bpId: string) => {
    setSelectedBlueprintId(bpId);
    const found = blueprints.find(b => b.blueprint_id === bpId);
    if (found) {
      setActiveBlueprint(found);
    }
  };

  // Create Blueprint
  const handleCreateBlueprint = async (input: CreateBlueprintInput) => {
    setIsGenerating(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/blueprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create blueprint');
      }
      const newBp: MockBlueprintRecord = await res.json();
      setIsCreateModalOpen(false);
      setFeedbackMsg({ type: 'success', text: `Blueprint generated successfully: ${newBp.slots.length} question slots allocated!` });
      await loadBlueprints(input.exam_id, newBp.blueprint_id);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setIsGenerating(false);
    }
  };

  // Revalidate Blueprint
  const handleRevalidate = async () => {
    if (!activeBlueprint) return;
    setIsValidating(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/blueprints/${activeBlueprint.blueprint_id}/validate`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Validation failed');
      const data = await res.json();
      setActiveBlueprint(prev => prev ? { ...prev, audit_result: data.audit_result } : null);
      setFeedbackMsg({ type: 'success', text: `Audit complete: Overall Status is ${data.overall_status} (Score: ${data.audit_result.total_score}/100)` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setIsValidating(false);
    }
  };

  // Lock Blueprint
  const handleLock = async () => {
    if (!activeBlueprint) return;
    setIsLocking(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/blueprints/${activeBlueprint.blueprint_id}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditor: 'Senior Curriculum Auditor' })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to lock blueprint');
      }
      const lockedBp: MockBlueprintRecord = await res.json();
      setActiveBlueprint(lockedBp);
      setFeedbackMsg({ type: 'success', text: 'Blueprint successfully locked! Question generation authorized.' });
      loadBlueprints(selectedExamId, lockedBp.blueprint_id);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setIsLocking(false);
    }
  };

  // Clone Blueprint
  const handleClone = async () => {
    if (!activeBlueprint) return;
    try {
      const res = await fetch(`/api/blueprints/${activeBlueprint.blueprint_id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Auditor requested new editable version to adjust syllabus weighting',
          auditor: 'Curriculum Auditor'
        })
      });
      if (!res.ok) throw new Error('Failed to clone');
      const cloned: MockBlueprintRecord = await res.json();
      setFeedbackMsg({ type: 'success', text: `Cloned into new version v${cloned.blueprint_version}` });
      loadBlueprints(selectedExamId, cloned.blueprint_id);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  // Update Slot
  const handleUpdateSlot = async (
    slotNumber: number,
    updates: Partial<BlueprintQuestionSlot>,
    reason: string,
    auditor: string
  ) => {
    if (!activeBlueprint) return;
    setIsUpdatingSlot(true);
    try {
      const res = await fetch(`/api/blueprints/${activeBlueprint.blueprint_id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_number: slotNumber,
          field: 'slot_override',
          new_value: updates,
          reason,
          auditor
        })
      });
      if (!res.ok) throw new Error('Failed to save slot override');
      const updated: MockBlueprintRecord = await res.json();
      setActiveBlueprint(updated);
      setFeedbackMsg({ type: 'success', text: `Slot Q${slotNumber} override recorded and audit rules recomputed.` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setIsUpdatingSlot(false);
    }
  };

  // Generate Mock Test from Locked Blueprint
  const handleGenerateMockTest = async () => {
    if (!activeBlueprint) return;
    if (activeBlueprint.status !== 'BLUEPRINT_LOCKED') {
      setFeedbackMsg({ type: 'error', text: 'Blueprint must be locked (BLUEPRINT_LOCKED) before questions can be generated.' });
      return;
    }
    setIsGeneratingMock(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/blueprints/${activeBlueprint.blueprint_id}/generate-mock`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate mock test from blueprint');
      }
      const data = await res.json();
      setFeedbackMsg({
        type: 'success',
        text: `Mock Test #${data.mock.mock_number} generated! ${data.mock.total_questions} questions verified against blueprint slots.`
      });
      if (onNavigateToMocks) {
        onNavigateToMocks(activeBlueprint.blueprint_id);
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    } finally {
      setIsGeneratingMock(false);
    }
  };

  const currentExam = exams.find(e => e.exam_id === selectedExamId) || exams[0];

  return (
    <div className="space-y-5">
      {/* Feedback message banner */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Blueprint Header */}
      <BlueprintHeader
        blueprint={activeBlueprint}
        exams={exams}
        selectedExamId={selectedExamId}
        onSelectExam={onSelectExam}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onValidate={handleRevalidate}
        onLock={handleLock}
        onClone={handleClone}
        onGenerateMock={handleGenerateMockTest}
        isValidating={isValidating}
        isLocking={isLocking}
        isGeneratingMock={isGeneratingMock}
      />

      {/* Blueprint Selector Strip (if multiple blueprints exist for exam) */}
      {blueprints.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px] whitespace-nowrap">
            Versions for this Exam:
          </span>
          {blueprints.map(bp => (
            <button
              key={bp.blueprint_id}
              type="button"
              onClick={() => handleSelectBlueprint(bp.blueprint_id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                selectedBlueprintId === bp.blueprint_id
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span>Mock #{bp.mock_number}</span>
              <span className="text-[10px] opacity-80">v{bp.blueprint_version}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                bp.status === 'BLUEPRINT_LOCKED'
                  ? 'bg-emerald-500 text-white'
                  : bp.status === 'APPROVED'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {bp.status.replace('BLUEPRINT_', '')}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {activeBlueprint ? (
        <div className="space-y-4">
          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs text-xs font-semibold overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('ALLOCATION')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeSubTab === 'ALLOCATION'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Allocation & Alignment</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('AUDIT')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeSubTab === 'AUDIT'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>15-Point Audit Suite</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeSubTab === 'AUDIT' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {activeBlueprint.audit_result?.total_score ?? 95}/100
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('LEDGER')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeSubTab === 'LEDGER'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Series Non-Repeat Ledger</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeSubTab === 'LEDGER' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                Mock #{activeBlueprint.mock_number}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('SLOTS')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeSubTab === 'SLOTS'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Question Slots (Q1 - Q{activeBlueprint.question_count})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('LOGS')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeSubTab === 'LOGS'
                  ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Audit Logs & History</span>
            </button>
          </div>

          {/* Sub-tab Views */}
          {activeSubTab === 'ALLOCATION' && (
            <AllocationSummaryTab blueprint={activeBlueprint} />
          )}

          {activeSubTab === 'AUDIT' && (
            <AuditSuiteTab
              blueprint={activeBlueprint}
              onRevalidate={handleRevalidate}
              isValidating={isValidating}
            />
          )}

          {activeSubTab === 'LEDGER' && (
            <SeriesLedgerTab blueprint={activeBlueprint} />
          )}

          {activeSubTab === 'SLOTS' && (
            <QuestionSlotsTab
              blueprint={activeBlueprint}
              onUpdateSlot={handleUpdateSlot}
              isUpdating={isUpdatingSlot}
            />
          )}

          {activeSubTab === 'LOGS' && (
            <BlueprintLogsTab blueprint={activeBlueprint} />
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-2xs max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              No Blueprint Created for {currentExam?.title || 'this Exam'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              The Blueprint Engine decides WHAT every question in a mock must test before question generation begins, reconciling official notification rules, PYQ intelligence, and the canonical non-repeat ledger.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate Evidence-Based Blueprint</span>
          </button>
        </div>
      )}

      {/* Creation Modal */}
      {currentExam && (
        <BlueprintCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          exam={currentExam}
          onCreate={handleCreateBlueprint}
          isSubmitting={isGenerating}
        />
      )}
    </div>
  );
}
