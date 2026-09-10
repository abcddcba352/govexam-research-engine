import React from 'react';
import {
  MockBlueprintRecord,
  BlueprintAuditCheckResult
} from '../../types.ts';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ShieldCheck,
  Award,
  Sparkles,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

interface AuditSuiteTabProps {
  blueprint: MockBlueprintRecord;
  onRevalidate: () => void;
  isValidating: boolean;
}

export function AuditSuiteTab({
  blueprint,
  onRevalidate,
  isValidating
}: AuditSuiteTabProps) {
  const audit = blueprint.audit_result;

  const getSeverityBadge = (sev: 'CRITICAL' | 'WARN' | 'INFO') => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            CRITICAL BLOCKER
          </span>
        );
      case 'WARN':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            AUDITOR WARNING
          </span>
        );
      case 'INFO':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            INFORMATIONAL
          </span>
        );
    }
  };

  const getStatusIcon = (pass: boolean, sev: string) => {
    if (pass) {
      return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
    }
    if (sev === 'CRITICAL') {
      return <XCircle className="w-5 h-5 text-rose-600 shrink-0" />;
    }
    return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
  };

  const checksList: BlueprintAuditCheckResult[] = audit?.check_results
    ? Object.values(audit.check_results)
    : [];

  return (
    <div className="space-y-6">
      {/* Audit Banner */}
      <div className={`p-5 rounded-2xl border shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        audit?.overall_status === 'FAIL'
          ? 'bg-rose-50 border-rose-200'
          : audit?.overall_status === 'WARN'
          ? 'bg-amber-50 border-amber-200'
          : 'bg-emerald-50 border-emerald-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            audit?.overall_status === 'FAIL'
              ? 'bg-rose-600 text-white'
              : audit?.overall_status === 'WARN'
              ? 'bg-amber-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                15-Point Curriculum Quality Audit Suite
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                audit?.overall_status === 'FAIL'
                  ? 'bg-rose-200 text-rose-900'
                  : audit?.overall_status === 'WARN'
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-emerald-200 text-emerald-900'
              }`}>
                {audit?.overall_status || 'PASS'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Verifies mathematical exactness, non-repeat ledger compliance, syllabus coverage, and cognitive realism.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRevalidate}
          disabled={isValidating}
          className="px-4 py-2 bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
        >
          {isValidating ? 'Re-auditing...' : 'Re-run Audit Suite'}
        </button>
      </div>

      {/* Errors or Warnings if present */}
      {audit?.errors && audit.errors.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-2">
          <h4 className="font-bold text-rose-900 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-700" />
            <span>Critical Blockers Preventing Blueprint Lock ({audit.errors.length}):</span>
          </h4>
          <ul className="list-disc list-inside space-y-1 text-rose-800">
            {audit.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {audit?.warnings && audit.warnings.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2">
          <h4 className="font-bold text-amber-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>Auditor Advisories ({audit.warnings.length}):</span>
          </h4>
          <ul className="list-disc list-inside space-y-1 text-amber-800">
            {audit.warnings.map((warn, i) => (
              <li key={i}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 15 Checks Checklist */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Verification Rules Checklist (15 Checks)
          </h4>
          <span className="text-xs font-semibold text-slate-500">
            {checksList.filter(c => c.pass).length} / {checksList.length} Passed
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {checksList.map((check, idx) => (
            <div key={idx} className="p-4 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
              {getStatusIcon(check.pass, check.severity)}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {check.check_name}
                    </span>
                    {getSeverityBadge(check.severity)}
                  </div>
                  <span className={`text-[11px] font-bold ${check.pass ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {check.pass ? 'PASSED' : 'ACTION REQUIRED'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {check.message}
                </p>
                {check.details && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    {check.details}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {audit?.recommendations && audit.recommendations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Auditor Recommendations & Guidance</span>
          </h4>
          <div className="space-y-2 text-xs text-slate-600">
            {audit.recommendations.map((rec, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
