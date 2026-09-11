import React from 'react';
import {
  MockBlueprintRecord,
  ExamRecord,
  TestMode,
  ExamStage,
  ExamStagePaper
} from '../../types.ts';
import { groupExamsByJurisdiction, getCleanExamTitle } from '../../utils/examJurisdiction.ts';
import { BlueprintHierarchyFilter } from './BlueprintHierarchyFilter.tsx';
import {
  ShieldCheck,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  History,
  Sparkles,
  Download,
  Copy,
  PlusCircle,
  FileCheck2,
  Calendar,
  Layers,
  Award
} from 'lucide-react';

interface BlueprintHeaderProps {
  blueprint: MockBlueprintRecord | null;
  exams: ExamRecord[];
  selectedExamId: string;
  onSelectExam: (examId: string) => void;
  onOpenCreateModal: () => void;
  onValidate: () => void;
  onLock: () => void;
  onClone: () => void;
  onGenerateMock?: () => void;
  isValidating: boolean;
  isLocking: boolean;
  isGeneratingMock?: boolean;
  onPaperChange?: (stage: ExamStage | null, paper: ExamStagePaper | null) => void;
}

export function BlueprintHeader({
  blueprint,
  exams,
  selectedExamId,
  onSelectExam,
  onOpenCreateModal,
  onValidate,
  onLock,
  onClone,
  onGenerateMock,
  isValidating,
  isLocking,
  isGeneratingMock = false,
  onPaperChange
}: BlueprintHeaderProps) {
  const currentExam = exams.find(e => e.exam_id === selectedExamId);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'BLUEPRINT_LOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Lock className="w-3.5 h-3.5 text-emerald-700" />
            BLUEPRINT LOCKED
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
            AUDIT APPROVED
          </span>
        );
      case 'NEEDS_REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            NEEDS AUDITOR REVIEW
          </span>
        );
      case 'SUPERSEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <History className="w-3.5 h-3.5 text-slate-600" />
            SUPERSEDED (ARCHIVED)
          </span>
        );
      case 'VALIDATING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-700 animate-spin" />
            VALIDATING AUDIT RULES
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            DRAFT
          </span>
        );
    }
  };

  const exportJson = () => {
    if (!blueprint) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(blueprint, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `blueprint_${blueprint.blueprint_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Exam and Selection Info */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base sm:text-lg text-slate-900">
                {getCleanExamTitle(currentExam) || 'Examination Blueprint'}
              </h2>
              {blueprint && getStatusBadge(blueprint.status)}
            </div>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
            <span>Cycle: <strong className="text-slate-700">{currentExam?.active_cycle || currentExam?.recruitment_cycle || 'Current'}</strong></span>
            <span>•</span>
            <span>Category: <strong className="text-slate-700">{currentExam?.state_or_central}</strong></span>
            <span>•</span>
            <span>Stage: <strong className="text-purple-700">{currentExam?.stage}</strong></span>
            <span>•</span>
            <span>Paper: <strong className="text-slate-800">{currentExam?.paper}</strong></span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate New Blueprint</span>
          </button>

          {blueprint && (
            <>
              <button
                type="button"
                onClick={onValidate}
                disabled={isValidating}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Re-run 15-Point Quality Check Suite"
              >
                <FileCheck2 className="w-4 h-4 text-slate-600" />
                <span>{isValidating ? 'Auditing...' : 'Audit Suite'}</span>
              </button>

              {blueprint.status !== 'BLUEPRINT_LOCKED' && (
                <button
                  type="button"
                  onClick={onLock}
                  disabled={isLocking || blueprint.audit_result?.overall_status === 'FAIL'}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                    blueprint.audit_result?.overall_status === 'FAIL'
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                  title={
                    blueprint.audit_result?.overall_status === 'FAIL'
                      ? 'Cannot lock: Critical audit blockers must be resolved first.'
                      : 'Lock Blueprint to authorize final question generation.'
                  }
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLocking ? 'Locking...' : 'Lock Blueprint'}</span>
                </button>
              )}

              {blueprint.status === 'BLUEPRINT_LOCKED' && (
                <>
                  {onGenerateMock && (
                    <button
                      type="button"
                      onClick={onGenerateMock}
                      disabled={isGeneratingMock}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      title="Generate novel mock paper strictly executing this locked blueprint specification"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-200" />
                      <span>{isGeneratingMock ? 'Generating Mock...' : 'Generate Mock Paper'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClone}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Clone to create a new editable version v(N+1)"
                  >
                    <Copy className="w-4 h-4 text-amber-700" />
                    <span>Clone / New Version</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={exportJson}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all border border-slate-200 cursor-pointer"
                title="Export Blueprint JSON"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 5-Level Cascading Hierarchy Filter: State -> Board -> Exam -> Stage -> Paper */}
      <BlueprintHierarchyFilter
        exams={exams}
        selectedExamId={selectedExamId}
        onSelectExam={onSelectExam}
        onPaperChange={onPaperChange}
      />

      {/* Blueprint Metadata strip */}
      {blueprint && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Series & Mock #</span>
            <span className="font-bold text-slate-800">
              Mock #{blueprint.mock_number} (v{blueprint.blueprint_version})
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Test Mode</span>
            <span className="font-bold text-indigo-700">
              {blueprint.test_mode.replace('_', ' ')}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Slot Count</span>
            <span className="font-bold text-slate-800">
              {blueprint.question_count} Qs ({blueprint.total_marks} M)
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">PYQ Intelligence</span>
            <span className={`font-bold ${
              blueprint.pyq_intelligence_status === 'HIGH_CONFIDENCE'
                ? 'text-emerald-700'
                : blueprint.pyq_intelligence_status === 'SUFFICIENT'
                ? 'text-blue-700'
                : 'text-amber-700'
            }`}>
              {blueprint.pyq_intelligence_status.replace('_', ' ')}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">CA Cutoff Date</span>
            <span className="font-bold text-slate-800 font-mono text-[11px]">
              {blueprint.current_affairs_cutoff || 'Not Specified'}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Audit Score</span>
            <span className={`font-bold text-sm ${
              (blueprint.audit_result?.total_score || 0) >= 80 ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {blueprint.audit_result?.total_score ?? 'N/A'}/100
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
