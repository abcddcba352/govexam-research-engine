import React, { useState } from 'react';
import {
  PYQQuestionRecord,
  WhyAskedReasonTag,
  DistractorStyle,
  PYQDifficultyLevel,
  PYQCognitiveLevel,
} from '../types.ts';
import {
  X,
  ShieldCheck,
  HelpCircle,
  Brain,
  Layers,
  Sparkles,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
  Target,
  Image as ImageIcon,
  CheckCircle2,
  Edit3,
  Bookmark,
  Scale
} from 'lucide-react';

interface Props {
  question: PYQQuestionRecord;
  onClose: () => void;
  onQuestionUpdated?: (updated: PYQQuestionRecord) => void;
}

export const PYQQuestionInspectorModal: React.FC<Props> = ({
  question,
  onClose,
  onQuestionUpdated,
}) => {
  const [isAuditorEditing, setIsAuditorEditing] = useState(false);
  const [auditorName, setAuditorName] = useState('Senior Curriculum Auditor');
  const [auditReason, setAuditReason] = useState('');
  const [editSubject, setEditSubject] = useState(question.primary_subject);
  const [editTopic, setEditTopic] = useState(question.primary_topic);
  const [editSubtopic, setEditSubtopic] = useState(question.subtopic);
  const [editAnswer, setEditAnswer] = useState(question.correct_answer);
  const [editDifficulty, setEditDifficulty] = useState<PYQDifficultyLevel>(question.difficulty);
  const [editCognitive, setEditCognitive] = useState<PYQCognitiveLevel>(question.cognitive_level);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuditorSave = async () => {
    if (!auditReason.trim()) {
      setError('Auditor justification / reason is mandatory for modifying PYQ records.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pyq/questions/${question.pyq_question_id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditor_name: auditorName,
          reason: auditReason,
          updates: {
            primary_subject: editSubject,
            primary_topic: editTopic,
            subtopic: editSubtopic,
            correct_answer: editAnswer,
            difficulty: editDifficulty,
            cognitive_level: editCognitive,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save auditor review');
      }

      const updated = await res.json();
      setIsAuditorEditing(false);
      if (onQuestionUpdated) {
        onQuestionUpdated(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Error updating question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEvidenceBadge = (strength: string) => {
    switch (strength) {
      case 'STRONG':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'MODERATE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SPECULATIVE':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case 'EASY':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DIFFICULT':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'MODERATE':
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              Q{question.question_number}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  PYQ Question Inspector
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-slate-200 text-slate-800">
                  {question.paper_id}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${getDifficultyBadge(question.difficulty)}`}>
                  {question.difficulty}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {question.question_type.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {question.primary_subject} &bull; {question.primary_topic} &bull; {question.subtopic}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAuditorEditing ? (
              <button
                type="button"
                onClick={() => setIsAuditorEditing(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Auditor Override</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuditorEditing(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold"
              >
                Cancel Edit
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm text-slate-800">
          {/* Auditor Edit Panel if active */}
          {isAuditorEditing && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Auditor Sign-Off & Fact Override Mode</span>
                </div>
                <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded font-medium">
                  Generates Immutable PYQ_ANALYSIS_AUDIT
                </span>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-rose-100 border border-rose-300 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Primary Subject</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={e => setEditSubject(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Primary Topic</label>
                  <input
                    type="text"
                    value={editTopic}
                    onChange={e => setEditTopic(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Subtopic</label>
                  <input
                    type="text"
                    value={editSubtopic}
                    onChange={e => setEditSubtopic(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Verified Answer</label>
                  <select
                    value={editAnswer}
                    onChange={e => setEditAnswer(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 font-bold"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Difficulty</label>
                  <select
                    value={editDifficulty}
                    onChange={e => setEditDifficulty(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-blue-600"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="DIFFICULT">DIFFICULT</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Cognitive Level</label>
                  <select
                    value={editCognitive}
                    onChange={e => setEditCognitive(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-blue-600"
                  >
                    <option value="RECALL">RECALL</option>
                    <option value="UNDERSTAND">UNDERSTAND</option>
                    <option value="APPLY">APPLY</option>
                    <option value="ANALYSE">ANALYSE</option>
                    <option value="MULTI_STEP_REASONING">MULTI_STEP_REASONING</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-xs">
                  Auditor Sign-off Reason / Authoritative Citation *
                </label>
                <textarea
                  rows={2}
                  value={auditReason}
                  onChange={e => setAuditReason(e.target.value)}
                  placeholder="e.g., Question classification verified against TGPSC official syllabus unit 3 and final answer key corrigendum."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-blue-600 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAuditorEditing(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleAuditorSave}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Apply Auditor Sign-Off'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Question Text Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Official Question Item
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>Length: {question.question_length}</span>
              </div>
            </div>
            <p className="text-base font-semibold text-slate-900 leading-relaxed whitespace-pre-line">
              {question.question_en}
            </p>

            {/* Visual Attachment Notice if present */}
            {question.has_image || question.has_map || question.has_diagram || question.has_table ? (
              <div className="mt-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200 flex items-start gap-2.5">
                <ImageIcon className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-900">
                      Visual Reference: {question.visual_type || 'DIAGRAM / MAP'}
                    </span>
                    {question.visual_review_required && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                        Visual Review Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-indigo-800 mt-0.5">
                    {question.visual_description || 'Question contains a schematic map or diagram essential for answering.'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Options Grid */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Options & Distractor Analysis
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { label: 'A', text: question.option_a_en, trap: question.distractor_details?.option_a_trap },
                { label: 'B', text: question.option_b_en, trap: question.distractor_details?.option_b_trap },
                { label: 'C', text: question.option_c_en, trap: question.distractor_details?.option_c_trap },
                { label: 'D', text: question.option_d_en, trap: question.distractor_details?.option_d_trap },
              ].map(opt => {
                const isCorrect = question.correct_answer === opt.label;
                return (
                  <div
                    key={opt.label}
                    className={`p-3 rounded-xl border transition-all ${
                      isCorrect
                        ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {opt.label}
                        </span>
                        {isCorrect && (
                          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Verified Answer
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {isCorrect ? 'Key Verified' : question.distractor_style}
                      </span>
                    </div>
                    <p className={`text-xs ${isCorrect ? 'text-emerald-950 font-medium' : 'text-slate-700'}`}>
                      {opt.text}
                    </p>
                    {opt.trap && (
                      <p className="text-[11px] text-slate-500 mt-2 pt-1.5 border-t border-slate-100 italic">
                        <span className="font-semibold text-slate-600 not-italic">Trap logic: </span>
                        {opt.trap}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Answer Key Evidence & Provisional Revision History */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Answer Key Evidence & Authority</span>
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {question.answer_verification_status}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {question.answer_source_citation || 'Linked against official commission answer key.'}
            </p>

            {question.provisional_conflict_history && (
              <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Provisional Key Dispute Resolved: </span>
                  <span>{question.provisional_conflict_history}</span>
                </div>
              </div>
            )}
          </div>

          {/* Deep Analytical Dimensions (Taxonomy, Cognitive, Difficulty) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Cognitive */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                <Brain className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cognitive Demand</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{question.cognitive_level}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Elimination possible: {question.elimination_possible ? 'Yes' : 'No'} &bull; Style: {question.option_style}
              </p>
            </div>

            {/* Distractor Intelligence */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                <Target className="w-3.5 h-3.5 text-amber-600" />
                <span>Distractor Quality</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{question.distractor_style}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                  Score {question.distractor_quality_score}/5
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Archetype: {question.distractor_details?.trap_archetype || 'NEAR_FACT_SWAP'}
              </p>
            </div>

            {/* Temporal & Jurisdiction */}
            <div className="p-3.5 rounded-xl bg-white border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                <Scale className="w-3.5 h-3.5 text-blue-600" />
                <span>Domain & Temporality</span>
              </div>
              <p className="text-sm font-bold text-slate-900">
                {question.static_or_current} &bull; {question.state_specificity}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {question.current_affairs_age_months
                  ? `${question.current_affairs_age_months} months window before exam`
                  : 'Static syllabus foundation'}
              </p>
            </div>
          </div>

          {/* "Why Was This Asked?" Engine */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Why Was This Question Asked? (Analytical Rationale)
                </h3>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-md font-bold border ${getEvidenceBadge(question.evidence_strength)}`}>
                Evidence: {question.evidence_strength}
              </span>
            </div>

            <p className="text-xs text-blue-950 leading-relaxed font-medium">
              {question.reason_summary}
            </p>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {question.reason_tags?.map(tag => (
                <span
                  key={tag}
                  className="text-[11px] px-2 py-0.5 rounded bg-white text-blue-800 font-semibold border border-blue-200 shadow-2xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Adjacent Testable Concepts (Blueprint Input) */}
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Adjacent Testable Concepts (Future Blueprint Candidates)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Tested without direct duplicate copying
              </span>
            </div>

            <div className="space-y-2">
              {question.adjacent_concepts?.map((adj, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">{adj.concept}</p>
                    <p className="text-slate-600 mt-0.5">
                      <span className="font-semibold text-slate-700">Relationship: </span>
                      {adj.relationship_to_pyq}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Syllabus: {adj.syllabus_relevance} &bull; Source: {adj.source_requirement || 'Official Gazette / SCERT'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-1 rounded font-bold text-[11px] border ${
                      adj.future_relevance === 'HIGH'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    Relevance: {adj.future_relevance}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Same-Fact Fingerprint */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="font-bold text-slate-700">Canonical Fact Fingerprint</span>
              <span className="font-mono text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">
                {question.pyq_fact_fingerprint}
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1 mt-2">
              <p>
                <span className="font-semibold text-slate-700">Core Concept: </span>
                {question.core_concept}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Core Answerable Fact: </span>
                {question.core_answerable_fact}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="font-semibold text-slate-700 text-[11px]">Entities: </span>
                {question.entities?.map(e => (
                  <span key={e} className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 rounded-b-2xl flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {question.auditor_reviewed ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Audited by {question.auditor_name} ({new Date(question.reviewed_at!).toLocaleDateString()})
              </span>
            ) : (
              <span>Automated Extraction Verified</span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
