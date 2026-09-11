import React, { useState } from 'react';
import {
  Layers,
  FileText,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Save,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Settings,
  Youtube
} from 'lucide-react';
import { ExamRecord, ExamStage, ExamStagePaper, ExamStructureScheme } from '../types';

interface ExamHierarchyDrilldownProps {
  exam: ExamRecord;
  onUpdateExam: (updatedExam: ExamRecord) => void;
  onDeleteExam?: (examId: string) => void;
  onRefreshExams?: () => void;
}

export const ExamHierarchyDrilldown: React.FC<ExamHierarchyDrilldownProps> = ({
  exam,
  onUpdateExam,
  onDeleteExam,
  onRefreshExams
}) => {
  // Initialize stages
  const initialStages: ExamStage[] = (exam.stages && exam.stages.length > 0)
    ? exam.stages
    : (exam.structure_scheme?.stages && exam.structure_scheme.stages.length > 0)
    ? exam.structure_scheme.stages
    : [];

  const [stages, setStages] = useState<ExamStage[]>(initialStages);
  const [expandedStageIds, setExpandedStageIds] = useState<Record<string, boolean>>({});
  const [expandedPaperIds, setExpandedPaperIds] = useState<Record<string, boolean>>({});

  // Editing state
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageForm, setStageForm] = useState<Partial<ExamStage>>({});

  const [editingPaperKey, setEditingPaperKey] = useState<string | null>(null); // `${stageId}__${paperId}`
  const [paperForm, setPaperForm] = useState<Partial<ExamStagePaper>>({});

  const [editingSubjectKey, setEditingSubjectKey] = useState<string | null>(null); // `${stageId}__${paperId}__${subjectIdx}`
  const [editingSubjectText, setEditingSubjectText] = useState<string>('');

  const [newSubjectInputs, setNewSubjectInputs] = useState<Record<string, string>>({}); // `${stageId}__${paperId}` -> text

  const [isEditingPattern, setIsEditingPattern] = useState<boolean>(false);
  const [patternForm, setPatternForm] = useState({
    total_questions: exam.pattern?.total_questions ?? 150,
    duration_minutes: exam.pattern?.duration_minutes ?? 150,
    total_marks: exam.pattern?.total_marks ?? 150,
    negative_marking_rate: exam.pattern?.negative_marking_rate ?? 0.25,
    mediums: (exam.pattern?.mediums || ['English', 'Telugu']).join(', ')
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);

  // Toggle stage accordion
  const toggleStage = (stageId: string) => {
    setExpandedStageIds(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  // Toggle paper accordion
  const togglePaper = (paperKey: string) => {
    setExpandedPaperIds(prev => ({ ...prev, [paperKey]: !prev[paperKey] }));
  };

  // Auto-detect from gazette
  const handleAutoDetect = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/research/exam-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: exam.title })
      });
      if (!res.ok) throw new Error('Failed to auto-detect structure');
      const data = await res.json();
      if (data.structure && Array.isArray(data.structure.stages) && data.structure.stages.length > 0) {
        setStages(data.structure.stages);
        // Persist immediately
        await persistStages(data.structure.stages, data.structure);
        setStatusMessage({
          type: 'SUCCESS',
          text: `Auto-detected and saved ${data.structure.stages.length} official stages and papers!`
        });
      } else {
        setStatusMessage({
          type: 'ERROR',
          text: 'No official gazette template found for this exam query. You can add stages and papers manually.'
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'ERROR', text: err.message || 'Auto-detect failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Persist stages to backend
  const persistStages = async (updatedStages: ExamStage[], scheme?: ExamStructureScheme) => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/exams/${exam.exam_id}/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages: updatedStages, structure_scheme: scheme })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to persist stages.');
      }
      const data = await res.json();
      if (data.exam) {
        onUpdateExam(data.exam);
      }
      setStatusMessage({
        type: 'SUCCESS',
        text: 'All hierarchy updates saved successfully.'
      });
      if (onRefreshExams) onRefreshExams();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'ERROR', text: err.message || 'Error saving changes.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Stage CRUD
  const handleAddStage = () => {
    const nextNum = stages.length + 1;
    const newStage: ExamStage = {
      stage_id: `stage_${Date.now().toString(36)}_${nextNum}`,
      stage_number: nextNum,
      stage_name: `Stage ${nextNum}: ${nextNum === 1 ? 'Preliminary Written Test (PWT)' : nextNum === 2 ? 'Mains Written Examination' : 'Interview / Skill Test'}`,
      stage_type: nextNum === 1 ? 'PRELIMINARY' : nextNum === 2 ? 'MAINS' : 'INTERVIEW',
      is_qualifying_only: nextNum === 1,
      total_papers: 1,
      papers: [
        {
          paper_id: `paper_${Date.now().toString(36)}_1`,
          paper_number: 'Paper-I',
          title: 'General Studies and Mental Ability',
          type: 'OBJECTIVE',
          total_questions: 150,
          total_marks: 150,
          duration_minutes: 150,
          negative_marking_rate: 0.25,
          is_qualifying: false,
          sections: ['General Studies', 'Arithmetic & Reasoning']
        }
      ]
    };
    const updated = [...stages, newStage];
    setStages(updated);
    setExpandedStageIds(prev => ({ ...prev, [newStage.stage_id]: true }));
    persistStages(updated);
  };

  const handleStartEditStage = (stage: ExamStage) => {
    setEditingStageId(stage.stage_id);
    setStageForm({
      stage_name: stage.stage_name,
      stage_type: stage.stage_type,
      is_qualifying_only: stage.is_qualifying_only,
      description: stage.description
    });
  };

  const handleSaveEditStage = (stageId: string) => {
    const updated = stages.map(s => s.stage_id === stageId ? { ...s, ...stageForm } : s);
    setStages(updated);
    setEditingStageId(null);
    persistStages(updated);
  };

  const handleDeleteStage = (stageId: string) => {
    if (!window.confirm('Are you sure you want to delete this stage and all its papers?')) return;
    const updated = stages.filter(s => s.stage_id !== stageId);
    setStages(updated);
    persistStages(updated);
  };

  // Paper CRUD
  const handleAddPaper = (stageId: string) => {
    const stage = stages.find(s => s.stage_id === stageId);
    const pNum = (stage?.papers?.length || 0) + 1;
    const newPaper: ExamStagePaper = {
      paper_id: `paper_${Date.now().toString(36)}_${pNum}`,
      paper_number: `Paper-${pNum}`,
      title: `Paper-${pNum}: Subject Knowledge`,
      type: stage?.stage_type === 'MAINS' ? 'DESCRIPTIVE' : 'OBJECTIVE',
      total_questions: 150,
      total_marks: 150,
      duration_minutes: 150,
      negative_marking_rate: 0.25,
      is_qualifying: false,
      sections: ['General Overview', 'Core Subject Topics']
    };

    const updated = stages.map(s => {
      if (s.stage_id !== stageId) return s;
      const papers = s.papers || [];
      return {
        ...s,
        total_papers: papers.length + 1,
        papers: [...papers, newPaper]
      };
    });
    setStages(updated);
    setExpandedPaperIds(prev => ({ ...prev, [`${stageId}__${newPaper.paper_id}`]: true }));
    persistStages(updated);
  };

  const handleStartEditPaper = (stageId: string, paper: ExamStagePaper) => {
    const key = `${stageId}__${paper.paper_id}`;
    setEditingPaperKey(key);
    setPaperForm({ ...paper });
  };

  const handleSaveEditPaper = (stageId: string, paperId: string) => {
    const updated = stages.map(s => {
      if (s.stage_id !== stageId) return s;
      const papers = (s.papers || []).map(p => p.paper_id === paperId ? { ...p, ...paperForm } : p);
      return { ...s, papers };
    });
    setStages(updated);
    setEditingPaperKey(null);
    persistStages(updated);
  };

  const handleDeletePaper = (stageId: string, paperId: string) => {
    if (!window.confirm('Delete this paper and all its subjects?')) return;
    const updated = stages.map(s => {
      if (s.stage_id !== stageId) return s;
      const papers = (s.papers || []).filter(p => p.paper_id !== paperId);
      return { ...s, total_papers: papers.length, papers };
    });
    setStages(updated);
    persistStages(updated);
  };

  // Subject / Topic CRUD
  const handleStartEditSubject = (stageId: string, paperId: string, idx: number, currentText: string) => {
    setEditingSubjectKey(`${stageId}__${paperId}__${idx}`);
    setEditingSubjectText(currentText);
  };

  const handleSaveEditSubject = (stageId: string, paperId: string, idx: number) => {
    if (!editingSubjectText.trim()) return;
    const updated = stages.map(s => {
      if (s.stage_id !== stageId) return s;
      const papers = (s.papers || []).map(p => {
        if (p.paper_id !== paperId) return p;
        const sections = [...(p.sections || [])];
        sections[idx] = editingSubjectText.trim();
        return { ...p, sections };
      });
      return { ...s, papers };
    });
    setStages(updated);
    setEditingSubjectKey(null);
    persistStages(updated);
  };

  const handleDeleteSubject = (stageId: string, paperId: string, idx: number) => {
    const updated = stages.map(s => {
      if (s.stage_id !== stageId) return s;
      const papers = (s.papers || []).map(p => {
        if (p.paper_id !== paperId) return p;
        const sections = (p.sections || []).filter((_, i) => i !== idx);
        return { ...p, sections };
      });
      return { ...s, papers };
    });
    setStages(updated);
    persistStages(updated);
  };

  const handleAddSubject = (stageId: string, paperId: string) => {
    const key = `${stageId}__${paperId}`;
    const text = (newSubjectInputs[key] || '').trim();
    if (!text) return;

    const updated = stages.map(s => {
      if (s.stage_id !== stageId) return s;
      const papers = (s.papers || []).map(p => {
        if (p.paper_id !== paperId) return p;
        const sections = [...(p.sections || []), text];
        return { ...p, sections };
      });
      return { ...s, papers };
    });
    setStages(updated);
    setNewSubjectInputs(prev => ({ ...prev, [key]: '' }));
    persistStages(updated);
  };

  // Save Exam Pattern Updates
  const handleSavePattern = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const mediumsList = patternForm.mediums.split(',').map(m => m.trim()).filter(Boolean);
      const updatedPattern = {
        total_questions: Number(patternForm.total_questions) || 0,
        duration_minutes: Number(patternForm.duration_minutes) || 0,
        total_marks: Number(patternForm.total_marks) || 0,
        marks_per_question: Number(patternForm.total_questions) > 0 ? (Number(patternForm.total_marks) / Number(patternForm.total_questions)) : 1,
        negative_marking_rate: Number(patternForm.negative_marking_rate) || 0,
        mediums: mediumsList,
        sections: exam.pattern?.sections || exam.syllabus_topics || []
      };

      const res = await fetch(`/api/exams/${exam.exam_id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: updatedPattern })
      });
      if (!res.ok) throw new Error('Failed to update examination pattern');
      const data = await res.json();
      if (data.exam) {
        onUpdateExam(data.exam);
      }
      setIsEditingPattern(false);
      setStatusMessage({ type: 'SUCCESS', text: 'Exam pattern updated successfully.' });
    } catch (err: any) {
      setStatusMessage({ type: 'ERROR', text: err.message || 'Pattern update failed.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-indigo-200 p-4 space-y-4 shadow-sm text-slate-800 animate-in fade-in">
      {/* Top Controls Bar: Pattern Summary + Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wide">
              Official Selection Architecture
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {stages.length} Stages • {stages.reduce((acc, s) => acc + (s.papers?.length || 0), 0)} Papers
            </span>
            {exam.study_materials && exam.study_materials.length > 0 && (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 inline-flex items-center gap-1">
                <Youtube className="w-3 h-3 text-red-600" />
                <span>{exam.study_materials.length} Video {exam.study_materials.length === 1 ? 'Material' : 'Materials'}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Click on any <strong>Stage</strong> to view its papers. Click on any <strong>Paper</strong> to view and edit its subjects.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsEditingPattern(!isEditingPattern)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>{isEditingPattern ? 'Close Pattern Settings' : 'Edit Pattern'}</span>
          </button>

          <button
            type="button"
            onClick={handleAutoDetect}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Auto-fetch official multi-stage architecture from gazette"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>⚡ Auto-Detect Structure</span>
          </button>

          <button
            type="button"
            onClick={handleAddStage}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Stage</span>
          </button>

          {onDeleteExam && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete "${exam.title}"? This cannot be undone.`)) {
                  onDeleteExam(exam.exam_id);
                }
              }}
              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Delete Exam Record"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Status Feedback Alert */}
      {statusMessage && (
        <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
          statusMessage.type === 'SUCCESS'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
            : 'bg-rose-50 border-rose-300 text-rose-900 font-medium'
        }`}>
          {statusMessage.type === 'SUCCESS' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Pattern Editor Panel (Collapsible) */}
      {isEditingPattern && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-indigo-600" />
              <span>Edit Examination Pattern Parameters</span>
            </h4>
            <span className="text-[11px] text-slate-500">Root Evaluation Scheme</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Total Questions</label>
              <input
                type="number"
                value={patternForm.total_questions}
                onChange={e => setPatternForm({ ...patternForm, total_questions: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Duration (Mins)</label>
              <input
                type="number"
                value={patternForm.duration_minutes}
                onChange={e => setPatternForm({ ...patternForm, duration_minutes: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Total Marks</label>
              <input
                type="number"
                value={patternForm.total_marks}
                onChange={e => setPatternForm({ ...patternForm, total_marks: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Negative Marking</label>
              <select
                value={patternForm.negative_marking_rate}
                onChange={e => setPatternForm({ ...patternForm, negative_marking_rate: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-semibold"
              >
                <option value={0}>0.00 (No Penalty)</option>
                <option value={0.20}>0.20 (1/5th TS Police)</option>
                <option value={0.25}>0.25 (1/4th Standard)</option>
                <option value={0.33}>0.33 (1/3rd AP/RRB)</option>
                <option value={0.50}>0.50 (1/2 SSC Tier-1)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Mediums</label>
              <input
                type="text"
                value={patternForm.mediums}
                onChange={e => setPatternForm({ ...patternForm, mediums: e.target.value })}
                placeholder="English, Telugu, Urdu"
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 font-semibold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditingPattern(false)}
              className="px-3 py-1 rounded bg-slate-200 text-slate-700 font-semibold hover:bg-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSavePattern}
              disabled={isSaving}
              className="px-4 py-1 rounded bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-xs cursor-pointer disabled:opacity-50"
            >
              Save Pattern
            </button>
          </div>
        </div>
      )}

      {/* Level 2: STAGES LIST (ACCORDION) */}
      {stages.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 text-center space-y-3">
          <p className="text-xs text-slate-600">
            No selection stages or papers recorded yet. Click below to add your first examination stage or auto-detect from the official gazette.
          </p>
          <div className="flex justify-center gap-2.5">
            <button
              type="button"
              onClick={handleAutoDetect}
              className="text-xs px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>⚡ Auto-Detect Official Stages</span>
            </button>
            <button
              type="button"
              onClick={handleAddStage}
              className="text-xs px-3.5 py-2 rounded-lg bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Stage 1 (Prelims / Mains)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {stages.map((stage, sIdx) => {
            const isExpanded = Boolean(expandedStageIds[stage.stage_id]);
            const isEditing = editingStageId === stage.stage_id;
            const papersCount = stage.papers?.length || 0;

            return (
              <div
                key={stage.stage_id || sIdx}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition-all"
              >
                {/* STAGE HEADER (Click to toggle papers) */}
                <div
                  className={`p-3 transition-colors flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none ${
                    isExpanded ? 'bg-indigo-50/70 border-b border-indigo-100' : 'bg-slate-50/80 hover:bg-indigo-50/30'
                  }`}
                  onClick={() => !isEditing && toggleStage(stage.stage_id)}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-transform"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </button>

                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {stage.stage_number || sIdx + 1}
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={stageForm.stage_name || ''}
                          onChange={e => setStageForm({ ...stageForm, stage_name: e.target.value })}
                          className="text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 flex-1"
                        />
                        <select
                          value={stageForm.stage_type || 'PRELIMINARY'}
                          onChange={e => setStageForm({ ...stageForm, stage_type: e.target.value as any })}
                          className="text-[11px] font-semibold bg-white border border-slate-300 rounded px-2 py-1"
                        >
                          <option value="PRELIMINARY">PRELIMINARY / SCREENING</option>
                          <option value="MAINS">MAINS WRITTEN</option>
                          <option value="PHYSICAL_TEST">PHYSICAL TEST (PET/PMT)</option>
                          <option value="INTERVIEW">INTERVIEW</option>
                          <option value="SKILL_TEST">SKILL / TYPING</option>
                        </select>
                        <label className="flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 rounded px-2 py-1">
                          <input
                            type="checkbox"
                            checked={Boolean(stageForm.is_qualifying_only)}
                            onChange={e => setStageForm({ ...stageForm, is_qualifying_only: e.target.checked })}
                          />
                          <span>Qualifying</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleSaveEditStage(stage.stage_id)}
                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          title="Save Stage"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStageId(null)}
                          className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          {stage.stage_name || `Stage ${sIdx + 1}`}
                        </span>

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {stage.stage_type}
                        </span>

                        {stage.is_qualifying_only ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            Qualifying Only
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Merit Scoring
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                          {papersCount} {papersCount === 1 ? 'Paper' : 'Papers'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stage Action Controls */}
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartEditStage(stage)}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        title="Edit Stage Name / Type"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        handleAddPaper(stage.stage_id);
                        if (!isExpanded) toggleStage(stage.stage_id);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Add Paper</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteStage(stage.stage_id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title="Delete Stage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Level 3: PAPERS UNDER THIS STAGE (Shown when Stage is clicked) */}
                {isExpanded && (
                  <div className="p-3 bg-slate-50/50 space-y-2.5 border-t border-slate-100">
                    {papersCount === 0 ? (
                      <div className="p-4 rounded-lg border border-dashed border-slate-200 bg-white text-center space-y-2">
                        <p className="text-xs text-slate-500 font-medium">
                          No examination papers defined under this stage yet.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleAddPaper(stage.stage_id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Paper to this Stage</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {stage.papers?.map((paper, pIdx) => {
                          const paperKey = `${stage.stage_id}__${paper.paper_id}`;
                          const isPaperExpanded = Boolean(expandedPaperIds[paperKey]);
                          const isEditingPaper = editingPaperKey === paperKey;
                          const subjectsCount = paper.sections?.length || 0;

                          return (
                            <div
                              key={paper.paper_id || pIdx}
                              className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs hover:border-indigo-200 transition-all"
                            >
                              {/* PAPER HEADER (Click to toggle subjects) */}
                              <div
                                className={`p-2.5 flex flex-wrap items-center justify-between gap-2.5 cursor-pointer select-none transition-colors ${
                                  isPaperExpanded ? 'bg-indigo-50/40 border-b border-indigo-100' : 'bg-white hover:bg-slate-50'
                                }`}
                                onClick={() => !isEditingPaper && togglePaper(paperKey)}
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                                  <button
                                    type="button"
                                    className="p-1 text-slate-400 hover:text-indigo-600"
                                  >
                                    {isPaperExpanded ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </button>

                                  {isEditingPaper ? (
                                    <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
                                      <input
                                        type="text"
                                        value={paperForm.paper_number || ''}
                                        onChange={e => setPaperForm({ ...paperForm, paper_number: e.target.value })}
                                        className="w-20 font-mono text-[11px] font-bold bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5"
                                        placeholder="Paper-I"
                                      />
                                      <input
                                        type="text"
                                        value={paperForm.title || ''}
                                        onChange={e => setPaperForm({ ...paperForm, title: e.target.value })}
                                        className="flex-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-0.5"
                                        placeholder="Paper Title"
                                      />
                                      <select
                                        value={paperForm.type || 'OBJECTIVE'}
                                        onChange={e => setPaperForm({ ...paperForm, type: e.target.value as any })}
                                        className="text-[11px] bg-white border border-slate-300 rounded px-1.5 py-0.5"
                                      >
                                        <option value="OBJECTIVE">OBJECTIVE (MCQ)</option>
                                        <option value="DESCRIPTIVE">DESCRIPTIVE</option>
                                        <option value="PHYSICAL_TEST">PHYSICAL TEST</option>
                                        <option value="SKILL_TEST">SKILL / TYPING</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEditPaper(stage.stage_id, paper.paper_id)}
                                        className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingPaperKey(null)}
                                        className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[11px]">
                                        {paper.paper_number || `Paper-${pIdx + 1}`}
                                      </span>
                                      <span className="font-bold text-slate-900">
                                        {paper.title}
                                      </span>
                                      <span className="text-[11px] text-slate-500 font-medium">
                                        ({paper.total_questions || 150} Qs • {paper.total_marks || 150} Marks • {paper.duration_minutes || 150}m • -{paper.negative_marking_rate ?? 0.25} Neg)
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                                        {subjectsCount} {subjectsCount === 1 ? 'Subject' : 'Subjects'}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Paper Action Controls */}
                                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                  {!isEditingPaper && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditPaper(stage.stage_id, paper)}
                                      className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                      title="Edit Paper Scheme & Title"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!isPaperExpanded) togglePaper(paperKey);
                                    }}
                                    className="px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                  >
                                    {isPaperExpanded ? 'Hide Subjects' : 'View Subjects'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeletePaper(stage.stage_id, paper.paper_id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                    title="Delete Paper"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Level 4: SUBJECTS / TOPICS (Shown when Paper is clicked) */}
                              {isPaperExpanded && (
                                <div className="p-3 bg-slate-50/70 border-t border-slate-100 space-y-2.5">
                                  <div className="flex items-center justify-between text-xs text-slate-600">
                                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>Subjects / Syllabus Topics for this Paper</span>
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                      Every subject can be edited or deleted
                                    </span>
                                  </div>

                                  {/* List of subjects */}
                                  {(!paper.sections || paper.sections.length === 0) ? (
                                    <div className="p-3 rounded bg-white border border-dashed border-slate-200 text-center text-xs text-slate-500">
                                      No subjects/topics added to this paper yet. Enter a subject name below to add one.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {paper.sections.map((subject, subIdx) => {
                                        const subKey = `${stage.stage_id}__${paper.paper_id}__${subIdx}`;
                                        const isEditingSubject = editingSubjectKey === subKey;

                                        return (
                                          <div
                                            key={subIdx}
                                            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs shadow-2xs hover:border-indigo-200"
                                          >
                                            {isEditingSubject ? (
                                              <div className="flex items-center gap-1.5 flex-1">
                                                <input
                                                  type="text"
                                                  value={editingSubjectText}
                                                  onChange={e => setEditingSubjectText(e.target.value)}
                                                  className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-slate-900 font-medium"
                                                  autoFocus
                                                  onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveEditSubject(stage.stage_id, paper.paper_id, subIdx);
                                                    if (e.key === 'Escape') setEditingSubjectKey(null);
                                                  }}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => handleSaveEditSubject(stage.stage_id, paper.paper_id, subIdx)}
                                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                                >
                                                  <Check className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => setEditingSubjectKey(null)}
                                                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                                >
                                                  <X className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            ) : (
                                              <>
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                  <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                                                    {subIdx + 1}
                                                  </span>
                                                  <span className="font-medium text-slate-800 truncate" title={subject}>
                                                    {subject}
                                                  </span>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleStartEditSubject(stage.stage_id, paper.paper_id, subIdx, subject)}
                                                    className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                                                    title="Edit Subject"
                                                  >
                                                    <Edit2 className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeleteSubject(stage.stage_id, paper.paper_id, subIdx)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                                    title="Delete Subject"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Quick Add Subject Input */}
                                  <div className="flex items-center gap-2 pt-1">
                                    <input
                                      type="text"
                                      value={newSubjectInputs[paperKey] || ''}
                                      onChange={e => setNewSubjectInputs({ ...newSubjectInputs, [paperKey]: e.target.value })}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleAddSubject(stage.stage_id, paper.paper_id);
                                      }}
                                      placeholder="Type new subject/topic name (e.g. Test of Reasoning, Indian Economy)..."
                                      className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddSubject(stage.stage_id, paper.paper_id)}
                                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add Subject</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Action Bar: Delete Entire Examination */}
      {onDeleteExam && (
        <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-lg">
          <span className="text-xs text-slate-500 font-medium">
            Danger Zone: Need to permanently remove this examination?
          </span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete examination "${exam.title}"? This cannot be undone.`)) {
                onDeleteExam(exam.exam_id);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-bold border border-rose-200 transition-colors shadow-2xs cursor-pointer"
            title={`Permanently delete ${exam.title}`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Delete This Examination</span>
          </button>
        </div>
      )}
    </div>
  );
};
