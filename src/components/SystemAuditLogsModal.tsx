import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  History,
  X,
  Sparkles,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  AlertOctagon
} from 'lucide-react';
import { SystemAuditLog, AuditType } from '../types';

interface SystemAuditLogsModalProps {
  examId?: string;
  examTitle?: string;
  onClose: () => void;
}

export const SystemAuditLogsModal: React.FC<SystemAuditLogsModalProps> = ({
  examId,
  examTitle,
  onClose,
}) => {
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [selectedType, setSelectedType] = useState<AuditType | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let url = '/api/audit-logs';
    const params = new URLSearchParams();
    if (examId) params.append('exam_id', examId);
    if (selectedType !== 'ALL') params.append('audit_type', selectedType);
    if (params.toString()) url += `?${params.toString()}`;

    setIsLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLogs(data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [examId, selectedType]);

  const getTypeBadge = (type?: AuditType) => {
    switch (type) {
      case 'PATTERN_VERIFICATION_AUDIT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">PATTERN VERIFICATION</span>;
      case 'RESEARCH_AUDIT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">RESEARCH AUDIT</span>;
      case 'FINALIZATION_AUDIT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">FINALIZATION</span>;
      case 'GENERATION_AUDIT':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">GENERATION</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden text-xs flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Immutable System Audit Logs {examTitle ? `• ${examTitle}` : ''}
              </h3>
              <p className="text-[11px] text-slate-500">
                Cryptographically verifiable, non-repudiable audit trails for research, pattern schemes, and mock generation.
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

        {/* Filter Bar */}
        <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
            <span className="text-[11px] font-semibold text-slate-600">Audit Type:</span>
            {(['ALL', 'PATTERN_VERIFICATION_AUDIT', 'RESEARCH_AUDIT', 'GENERATION_AUDIT', 'FINALIZATION_AUDIT'] as const).map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                  selectedType === t
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t === 'ALL' ? 'All Logs' : t.replace('_AUDIT', '').replace('_', ' ')}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            {logs.length} Entries Logged
          </span>
        </div>

        {/* Log Entries List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">Loading audit trail...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">No audit logs found for the selected filter.</div>
          ) : (
            logs.map(log => (
              <div key={log.log_id} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(log.audit_type)}
                    {log.action && (
                      <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-100 text-slate-700 font-semibold">
                        {log.action}
                      </span>
                    )}
                    <span className="font-bold text-slate-900">{log.exam_title || log.exam_id}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {/* Audit details */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1 text-[11px]">
                  {log.auditor && (
                    <div className="text-emerald-800 font-semibold">
                      Auditor Sign-off: {log.auditor}
                    </div>
                  )}
                  {log.field_name && (
                    <div className="font-medium text-slate-700">
                      Field: <code className="text-indigo-600 bg-indigo-50 px-1 rounded">{log.field_name}</code>
                      {log.previous_value !== undefined && (
                        <span className="text-slate-400 ml-2">
                          Previous: {String(log.previous_value)} → <strong className="text-slate-800">New: {String(log.new_value)}</strong>
                        </span>
                      )}
                    </div>
                  )}
                  {log.recruitment_cycle && (
                    <div className="text-slate-600">
                      Recruitment Cycle: <span className="font-medium">{log.recruitment_cycle}</span>
                    </div>
                  )}
                  {log.reason && (
                    <div className="text-slate-700 italic">
                      "{log.reason}"
                    </div>
                  )}
                  {log.source_ref && (
                    <div className="text-slate-500 text-[10px] font-mono break-all">
                      Source Ref: {log.source_ref}
                    </div>
                  )}
                  {log.error_message && (
                    <div className="text-slate-600">
                      Notes: {log.error_message}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 text-right shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
          >
            Close Audit Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
