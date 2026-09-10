import React, { useState, useMemo } from 'react';
import {
  MockBlueprintRecord,
  BlueprintQuestionSlot,
  PYQRelationshipType
} from '../../types.ts';
import {
  Search,
  SlidersHorizontal,
  FileEdit,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Image,
  X,
  Lock
} from 'lucide-react';

interface QuestionSlotsTabProps {
  blueprint: MockBlueprintRecord;
  onUpdateSlot: (
    slotNumber: number,
    updates: Partial<BlueprintQuestionSlot>,
    reason: string,
    auditor: string
  ) => Promise<void>;
  isUpdating: boolean;
}

export function QuestionSlotsTab({
  blueprint,
  onUpdateSlot,
  isUpdating
}: QuestionSlotsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedCognitive, setSelectedCognitive] = useState('');
  const [selectedStaticCurrent, setSelectedStaticCurrent] = useState('');
  const [selectedPyqRel, setSelectedPyqRel] = useState('');

  // Editing state
  const [editingSlot, setEditingSlot] = useState<BlueprintQuestionSlot | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [editConcept, setEditConcept] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<'EASY' | 'MODERATE' | 'DIFFICULT'>('MODERATE');
  const [editCognitive, setEditCognitive] = useState<
    'RECALL' | 'UNDERSTAND' | 'APPLY' | 'ANALYSE' | 'MULTI_STEP_REASONING'
  >('UNDERSTAND');
  const [editType, setEditType] = useState('SINGLE_CORRECT');
  const [editAnswerPos, setEditAnswerPos] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [editAuditor, setEditAuditor] = useState('Curriculum Auditor');
  const [editReason, setEditReason] = useState('');

  // Extract unique subjects for filter
  const subjectsList = useMemo(() => {
    const set = new Set<string>();
    blueprint.slots.forEach(s => set.add(s.subject));
    return Array.from(set);
  }, [blueprint.slots]);

  // Filter slots
  const filteredSlots = useMemo(() => {
    return blueprint.slots.filter(s => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          s.topic.toLowerCase().includes(q) ||
          s.subject.toLowerCase().includes(q) ||
          s.core_concept_target.toLowerCase().includes(q) ||
          s.answerable_fact_family.toLowerCase().includes(q) ||
          s.question_number.toString() === q;
        if (!match) return false;
      }
      if (selectedSubject && s.subject !== selectedSubject) return false;
      if (selectedFormat && s.question_type !== selectedFormat) return false;
      if (selectedDifficulty && s.difficulty !== selectedDifficulty) return false;
      if (selectedCognitive && s.cognitive_level !== selectedCognitive) return false;
      if (selectedStaticCurrent && s.static_current !== selectedStaticCurrent) return false;
      if (selectedPyqRel && s.pyq_relationship !== selectedPyqRel) return false;
      return true;
    });
  }, [
    blueprint.slots,
    searchTerm,
    selectedSubject,
    selectedFormat,
    selectedDifficulty,
    selectedCognitive,
    selectedStaticCurrent,
    selectedPyqRel
  ]);

  const handleOpenEdit = (slot: BlueprintQuestionSlot) => {
    setEditingSlot(slot);
    setEditSubject(slot.subject);
    setEditTopic(slot.topic);
    setEditConcept(slot.core_concept_target);
    setEditDifficulty(slot.difficulty);
    setEditCognitive(slot.cognitive_level);
    setEditType(slot.question_type);
    setEditAnswerPos(slot.target_answer_position);
    setEditReason('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot || !editReason.trim()) return;

    const updates: Partial<BlueprintQuestionSlot> = {
      subject: editSubject,
      topic: editTopic,
      core_concept_target: editConcept,
      difficulty: editDifficulty,
      cognitive_level: editCognitive,
      question_type: editType,
      target_answer_position: editAnswerPos,
      auditor_overridden: true,
      override_reason: editReason
    };

    await onUpdateSlot(editingSlot.question_number, updates, editReason, editAuditor);
    setEditingSlot(null);
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'EASY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Easy</span>;
      case 'MODERATE':
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Moderate</span>;
      case 'DIFFICULT':
      case 'HARD':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Difficult</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{diff}</span>;
    }
  };

  const getFormatBadge = (fmt: string) => {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
        {fmt.replace('_', ' ')}
      </span>
    );
  };

  const isLocked = blueprint.status === 'BLUEPRINT_LOCKED';

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search slots by question #, topic, concept target, or fact family..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500 font-semibold">
            <span>Showing {filteredSlots.length} of {blueprint.slots.length} Slots</span>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            <option value="">All Subjects</option>
            {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            <option value="">All Formats</option>
            <option value="SINGLE_CORRECT">Single Correct</option>
            <option value="STATEMENT_COMBINATION">Statement Comb.</option>
            <option value="ASSERTION_REASON">Assertion-Reason</option>
            <option value="MATCH_FOLLOWING">Matching</option>
            <option value="CHRONOLOGICAL_SEQUENCE">Chronology</option>
            <option value="CASE_SCENARIO">Case Scenario</option>
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            <option value="">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MODERATE">Moderate</option>
            <option value="DIFFICULT">Difficult</option>
          </select>

          <select
            value={selectedCognitive}
            onChange={(e) => setSelectedCognitive(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            <option value="">All Bloom Levels</option>
            <option value="RECALL">Recall</option>
            <option value="UNDERSTAND">Understand</option>
            <option value="APPLY">Apply</option>
            <option value="ANALYSE">Analyse</option>
            <option value="MULTI_STEP_REASONING">Multi-Step</option>
          </select>

          <select
            value={selectedStaticCurrent}
            onChange={(e) => setSelectedStaticCurrent(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            <option value="">Static / Current</option>
            <option value="STATIC">Static Core</option>
            <option value="CURRENT">Current Affairs</option>
            <option value="CURRENT_LINKED_STATIC">Static-Linked</option>
          </select>

          <select
            value={selectedPyqRel}
            onChange={(e) => setSelectedPyqRel(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-600"
          >
            <option value="">All PYQ Linkages</option>
            <option value="CORE_TESTED_CONCEPT">Core Concept</option>
            <option value="ADJACENT_EXPANSION">Adjacent Concept</option>
            <option value="ROTATIONAL_SYLLABUS">Rotational Topic</option>
            <option value="CURRENT_EXTRAPOLATION">Current Extension</option>
            <option value="UNTESTED_SYLLABUS_FRONTIER">Under-tested Area</option>
          </select>
        </div>
      </div>

      {/* Slots List */}
      <div className="space-y-3">
        {filteredSlots.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            <SlidersHorizontal className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No question slots match your filters</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting search criteria</p>
          </div>
        ) : (
          filteredSlots.map((slot) => (
            <div
              key={slot.slot_id}
              className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-2xs transition-all space-y-3 ${
                slot.auditor_overridden
                  ? 'border-amber-300 bg-amber-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Top Row: Q Number, Answer Position, Badges, Edit Button */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    Q{slot.question_number}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-black bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono">
                    Target Option: {slot.target_answer_position}
                  </span>
                  {getFormatBadge(slot.question_type)}
                  {getDifficultyBadge(slot.difficulty)}
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    {slot.cognitive_level}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    slot.static_current === 'CURRENT'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : slot.static_current === 'CURRENT_LINKED_STATIC'
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {slot.static_current.replace(/_/g, ' ')}
                  </span>
                  {slot.state_scope === 'STATE_SPECIFIC' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-700" />
                      State Specific
                    </span>
                  )}
                  {slot.visual_requirement && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
                      <Image className="w-3 h-3 text-teal-700" />
                      Visual: {slot.visual_type || 'REQUIRED'}
                    </span>
                  )}
                  {slot.auditor_overridden && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                      Auditor Modified
                    </span>
                  )}
                </div>

                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(slot)}
                    className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1"
                    title="Auditor Override Slot Configuration"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>Auditor Edit</span>
                  </button>
                )}
              </div>

              {/* Subject, Topic & Concept Target */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-baseline gap-2 text-slate-500 text-[11px]">
                  <strong className="text-slate-800 font-semibold">{slot.subject}</strong>
                  <span>›</span>
                  <span className="text-indigo-900 font-semibold">{slot.topic}</span>
                  {slot.subtopic && (
                    <>
                      <span>›</span>
                      <span>{slot.subtopic}</span>
                    </>
                  )}
                  {slot.microtopic && (
                    <>
                      <span>›</span>
                      <span className="font-mono text-slate-400">[{slot.microtopic}]</span>
                    </>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Core Concept Target
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {slot.core_concept_target}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">
                        Fact Family
                      </span>
                      <span className="text-[11px] font-mono text-indigo-700 font-bold">
                        {slot.answerable_fact_family}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 leading-relaxed pt-1 border-t border-slate-200/60">
                    <strong className="text-slate-700">Reason For Inclusion:</strong> {slot.reason_for_inclusion}
                  </div>
                </div>
              </div>

              {/* Source & Distractor Requirements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                <div className="p-2 bg-slate-50/70 rounded-lg border border-slate-200/60">
                  <strong className="text-slate-700">Mandatory Source:</strong> {slot.source_requirement}
                </div>
                <div className="p-2 bg-slate-50/70 rounded-lg border border-slate-200/60">
                  <strong className="text-slate-700">Distractor Strategy:</strong> {slot.distractor_strategy || 'Plausible near-misses based on syllabus concepts'}
                </div>
              </div>

              {/* Non-repeat avoid fingerprints if specified */}
              {slot.avoid_fact_fingerprints && slot.avoid_fact_fingerprints.length > 0 && (
                <div className="text-[10px] text-amber-800 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60 flex items-center gap-1.5">
                  <span className="font-bold">Ledger Safety (Avoid):</span>
                  <span className="font-mono">{slot.avoid_fact_fingerprints.join(', ')}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Auditor Edit Slot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden my-8">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-indigo-300" />
                <h3 className="font-bold text-sm">
                  Auditor Override: Slot Q{editingSlot.question_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Topic</label>
                <input
                  type="text"
                  value={editTopic}
                  onChange={(e) => setEditTopic(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block">Core Concept Target</label>
                <textarea
                  value={editConcept}
                  onChange={(e) => setEditConcept(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Difficulty</label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="DIFFICULT">Difficult</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Bloom's Taxonomy</label>
                  <select
                    value={editCognitive}
                    onChange={(e) => setEditCognitive(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="RECALL">Recall</option>
                    <option value="UNDERSTAND">Understand</option>
                    <option value="APPLY">Apply</option>
                    <option value="ANALYSE">Analyse</option>
                    <option value="MULTI_STEP_REASONING">Multi-Step</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Question Format</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="SINGLE_CORRECT">Single Correct</option>
                    <option value="STATEMENT_COMBINATION">Statement Combination</option>
                    <option value="ASSERTION_REASON">Assertion-Reason</option>
                    <option value="MATCH_FOLLOWING">Match The Following</option>
                    <option value="CHRONOLOGICAL_SEQUENCE">Chronology Order</option>
                    <option value="CASE_SCENARIO">Case Scenario</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Target Answer Position</label>
                  <select
                    value={editAnswerPos}
                    onChange={(e) => setEditAnswerPos(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-indigo-700"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <div className="space-y-1">
                  <label className="font-bold text-amber-900 block">
                    Auditor Name (Mandatory Audit Trail)
                  </label>
                  <input
                    type="text"
                    value={editAuditor}
                    onChange={(e) => setEditAuditor(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-amber-900 block">
                    Reason for Override (Mandatory)
                  </label>
                  <textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    required
                    placeholder="Provide official syllabus or pedagogical justification..."
                    rows={2}
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || !editReason.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? 'Recording Override...' : 'Save Override & Re-Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
