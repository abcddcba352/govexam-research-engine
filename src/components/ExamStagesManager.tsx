import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ExamRecord, ExamStage, ExamStagePaper, ExamStructureScheme } from '../types';

interface ExamStagesManagerProps {
  exam: ExamRecord;
  onRefreshExams?: () => void;
  onClose?: () => void;
}

export const ExamStagesManager: React.FC<ExamStagesManagerProps> = ({
  exam,
  onRefreshExams,
  onClose
}) => {
  // Initialize stages from exam record (either direct stages or structure_scheme)
  const initialStages: ExamStage[] = (exam.stages && exam.stages.length > 0)
    ? exam.stages
    : (exam.structure_scheme?.stages && exam.structure_scheme.stages.length > 0)
    ? exam.structure_scheme.stages
    : [];

  const [stages, setStages] = useState<ExamStage[]>(initialStages);
  const [isAutoDetecting, setIsAutoDetecting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);

  const totalPapersCount = stages.reduce((acc, s) => acc + (s.papers?.length || 0), 0);

  const handleAutoDetect = async () => {
    setIsAutoDetecting(true);
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
        setStatusMessage({
          type: 'SUCCESS',
          text: `Auto-detected ${data.structure.stages.length} stages and ${data.structure.stages.reduce((acc: number, s: ExamStage) => acc + (s.papers?.length || 0), 0)} papers from official gazette. Click "Save Stages & Papers" to persist.`
        });
      } else {
        setStatusMessage({
          type: 'ERROR',
          text: 'No official gazette template found for this specific title. You can add stages and papers manually.'
        });
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'ERROR',
        text: err.message || 'Auto-detection failed.'
      });
    } finally {
      setIsAutoDetecting(false);
    }
  };

  const handleAddStage = () => {
    const stageNum = stages.length + 1;
    const newStage: ExamStage = {
      stage_id: `stage_${Date.now().toString(36)}_${stageNum}`,
      stage_number: stageNum,
      stage_name: `Stage ${stageNum}: ${stageNum === 1 ? 'Preliminary Written Test' : stageNum === 2 ? 'Mains Written Examination' : 'Interview / Physical Test'}`,
      stage_type: stageNum === 1 ? 'PRELIMINARY' : stageNum === 2 ? 'MAINS' : 'INTERVIEW',
      is_qualifying_only: stageNum === 1,
      total_papers: 1,
      papers: [
        {
          paper_id: `paper_${Date.now().toString(36)}_1`,
          paper_number: 'Paper-I',
          title: 'General Studies & Mental Ability',
          type: stageNum === 2 ? 'DESCRIPTIVE' : 'OBJECTIVE',
          total_questions: 150,
          total_marks: 150,
          duration_minutes: 150,
          negative_marking_rate: 0.25,
          is_qualifying: false,
          sections: ['General Studies', 'Aptitude & Reasoning']
        }
      ]
    };
    setStages(prev => [...prev, newStage]);
    setStatusMessage(null);
  };

  const handleRemoveStage = (stageId: string) => {
    setStages(prev => prev.filter(s => s.stage_id !== stageId));
    setStatusMessage(null);
  };

  const handleUpdateStage = (stageId: string, patch: Partial<ExamStage>) => {
    setStages(prev => prev.map(s => s.stage_id === stageId ? { ...s, ...patch } : s));
  };

  const handleAddPaper = (stageId: string) => {
    setStages(prev => prev.map(s => {
      if (s.stage_id !== stageId) return s;
      const papers = s.papers || [];
      const pNum = papers.length + 1;
      const newPaper: ExamStagePaper = {
        paper_id: `paper_${Date.now().toString(36)}_${pNum}`,
        paper_number: `Paper-${pNum}`,
        title: `Paper ${pNum}: Subject Domain`,
        type: s.stage_type === 'MAINS' ? 'DESCRIPTIVE' : 'OBJECTIVE',
        total_questions: 150,
        total_marks: 150,
        duration_minutes: 150,
        negative_marking_rate: 0.25,
        is_qualifying: false,
        sections: ['General Domain', 'Core Syllabus']
      };
      return {
        ...s,
        total_papers: papers.length + 1,
        papers: [...papers, newPaper]
      };
    }));
    setStatusMessage(null);
  };

  const handleRemovePaper = (stageId: string, paperId: string) => {
    setStages(prev => prev.map(s => {
      if (s.stage_id !== stageId) return s;
      const papers = s.papers || [];
      return {
        ...s,
        total_papers: Math.max(0, papers.length - 1),
        papers: papers.filter(p => p.paper_id !== paperId)
      };
    }));
    setStatusMessage(null);
  };

  const handleUpdatePaper = (stageId: string, paperId: string, patch: Partial<ExamStagePaper>) => {
    setStages(prev => prev.map(s => {
      if (s.stage_id !== stageId) return s;
      const papers = s.papers || [];
      return {
        ...s,
        papers: papers.map(p => p.paper_id === paperId ? { ...p, ...patch } : p)
      };
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/exams/${exam.exam_id}/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save stages and papers');
      }
      setStatusMessage({
        type: 'SUCCESS',
        text: `Successfully saved ${stages.length} stages and ${totalPapersCount} papers for "${exam.title}"!`
      });
      if (onRefreshExams) {
        onRefreshExams();
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'ERROR',
        text: err.message || 'Error saving stages and papers'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-indigo-50/40 rounded-xl border border-indigo-200 p-4 space-y-4 shadow-xs">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-200">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Stages & Papers Architecture Manager</span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">
            Configure all selection stages (Prelims, PET, Mains) and every paper under each stage for <strong>{exam.title}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAutoDetect}
            disabled={isAutoDetecting}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Automatically look up official gazetted stages and all papers for this exam"
          >
            {isAutoDetecting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Auto-Detecting...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>⚡ Auto-Detect Stages & Papers</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleAddStage}
            className="px-3 py-1.5 rounded-lg bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-bold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stage</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : '💾 Save Stages & Papers'}</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Message */}
      {statusMessage && (
        <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
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

      {/* Stages List */}
      {stages.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-indigo-200 p-6 text-center space-y-3">
          <p className="text-xs text-slate-600">
            No selection stages or papers recorded for this exam yet. Click <strong>⚡ Auto-Detect Stages & Papers</strong> or <strong>Add Stage</strong> to build the multi-paper hierarchy.
          </p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={handleAutoDetect}
              className="text-xs px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Auto-Detect from Official Gazette</span>
            </button>
            <button
              type="button"
              onClick={handleAddStage}
              className="text-xs px-3.5 py-2 rounded-lg bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Stage 1 (Prelims / Mains)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {stages.map((stg, stgIdx) => (
            <div key={stg.stage_id || stgIdx} className="bg-white rounded-xl border border-indigo-100 shadow-2xs overflow-hidden">
              {/* Stage Header */}
              <div className="p-3 bg-indigo-50/70 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {stgIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={stg.stage_name}
                    onChange={e => handleUpdateStage(stg.stage_id, { stage_name: e.target.value })}
                    placeholder="Stage Name (e.g. Stage 1: Preliminary Test)"
                    className="text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded px-2.5 py-1 flex-1 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={stg.stage_type}
                    onChange={e => handleUpdateStage(stg.stage_id, { stage_type: e.target.value as any })}
                    className="text-[11px] font-semibold bg-white border border-slate-300 rounded px-2 py-1 text-slate-700"
                  >
                    <option value="PRELIMINARY">PRELIMINARY / SCREENING</option>
                    <option value="MAINS">MAINS WRITTEN</option>
                    <option value="INTERVIEW">INTERVIEW / PERSONALITY</option>
                    <option value="PHYSICAL_TEST">PHYSICAL TEST (PET/PMT)</option>
                    <option value="SKILL_TEST">SKILL / TYPING TEST</option>
                  </select>

                  <label className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(stg.is_qualifying_only)}
                      onChange={e => handleUpdateStage(stg.stage_id, { is_qualifying_only: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Qualifying Only</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleAddPaper(stg.stage_id)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Paper</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveStage(stg.stage_id)}
                    className="text-[11px] p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                    title="Delete Stage"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Papers List under this Stage */}
              <div className="p-3 space-y-2.5 bg-slate-50/50">
                {(!stg.papers || stg.papers.length === 0) ? (
                  <div className="p-4 rounded-lg border border-dashed border-indigo-200 bg-white text-center space-y-2">
                    <p className="text-xs text-slate-500 font-medium">
                      No papers added under {stg.stage_name || `Stage ${stgIdx + 1}`} yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAddPaper(stg.stage_id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Paper to this Stage</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {stg.papers.map((paper, pIdx) => (
                      <div
                        key={paper.paper_id || pIdx}
                        className="p-3 rounded-lg border border-slate-200 bg-white hover:border-indigo-200 transition-all text-xs space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <input
                              type="text"
                              value={paper.paper_number}
                              onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, { paper_number: e.target.value })}
                              placeholder="e.g. Paper-I"
                              className="w-24 font-mono font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded px-2 py-1 text-[11px]"
                            />
                            <input
                              type="text"
                              value={paper.title}
                              onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, { title: e.target.value })}
                              placeholder="Paper Title (e.g. General Studies & Mental Ability)"
                              className="flex-1 font-bold text-slate-900 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <select
                              value={paper.type}
                              onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, { type: e.target.value as any })}
                              className="text-[11px] font-semibold bg-white border border-slate-300 rounded px-2 py-1 text-slate-700"
                            >
                              <option value="OBJECTIVE">OBJECTIVE (MCQ)</option>
                              <option value="DESCRIPTIVE">DESCRIPTIVE (WRITTEN)</option>
                              <option value="PHYSICAL_TEST">PHYSICAL TEST</option>
                              <option value="SKILL_TEST">SKILL / TYPING</option>
                              <option value="INTERVIEW">INTERVIEW</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemovePaper(stg.stage_id, paper.paper_id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Delete Paper"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Paper Metrics Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                          <div>
                            <label className="text-[10px] uppercase font-semibold text-slate-500 block">Total Questions</label>
                            <input
                              type="number"
                              value={paper.total_questions ?? ''}
                              onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, { total_questions: Number(e.target.value) })}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-semibold text-slate-500 block">Total Marks</label>
                            <input
                              type="number"
                              value={paper.total_marks ?? ''}
                              onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, { total_marks: Number(e.target.value) })}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-semibold text-slate-500 block">Duration (Mins)</label>
                            <input
                              type="number"
                              value={paper.duration_minutes ?? ''}
                              onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, { duration_minutes: Number(e.target.value) })}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-semibold text-slate-500 block">Negative Marking</label>
                            <select
                              value={paper.negative_marking_rate ?? 0.25}
                              onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, { negative_marking_rate: Number(e.target.value) })}
                              className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px]"
                            >
                              <option value={0.0}>0.00 (No Penalty)</option>
                              <option value={0.20}>0.20 (1/5th TS Police)</option>
                              <option value={0.25}>0.25 (1/4th Standard)</option>
                              <option value={0.33}>0.33 (1/3rd AP/RRB)</option>
                              <option value={0.50}>0.50 (1/2 SSC Tier-1)</option>
                            </select>
                          </div>
                        </div>

                        {/* Paper Sections & Syllabus Input */}
                        <div className="pt-1.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-1.5 text-[11px]">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 shrink-0">Sections / Topics:</span>
                          <input
                            type="text"
                            value={(paper.sections || []).join(', ')}
                            onChange={e => handleUpdatePaper(stg.stage_id, paper.paper_id, {
                              sections: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            })}
                            placeholder="e.g. General Studies, Mental Ability, State History, Polity"
                            className="flex-1 w-full bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 text-[11px] focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    ))}

                    {/* Prominent button to add another paper under this stage */}
                    <button
                      type="button"
                      onClick={() => handleAddPaper(stg.stage_id)}
                      className="w-full py-2 border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-lg text-xs font-semibold text-indigo-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Paper to {stg.stage_name || `Stage ${stgIdx + 1}`}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Bottom Save Bar */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Total: {stages.length} Stages, {totalPapersCount} Papers configured.
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : '💾 Save Stages & Papers Changes'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
