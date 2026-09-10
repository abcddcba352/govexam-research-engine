import React, { useState, useEffect } from 'react';
import { MockBlueprintRecord, BlueprintAuditLogEntry } from '../../types.ts';
import { History, UserCheck, ShieldCheck, Clock, FileEdit, Lock, Copy } from 'lucide-react';

interface BlueprintLogsTabProps {
  blueprint: MockBlueprintRecord;
}

export function BlueprintLogsTab({ blueprint }: BlueprintLogsTabProps) {
  const [logs, setLogs] = useState<BlueprintAuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/blueprints/${blueprint.blueprint_id}/audit-logs`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLogs(data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [blueprint.blueprint_id]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'BLUEPRINT_CREATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">CREATED</span>;
      case 'BLUEPRINT_LOCKED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">LOCKED</span>;
      case 'AUDITOR_SLOT_EDIT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">SLOT OVERRIDE</span>;
      case 'AUDITOR_BLUEPRINT_EDIT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">CONFIG OVERRIDE</span>;
      case 'CLONED_SUPERSEDED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">CLONED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Version Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Version Genealogy & Lifecycle State
            </h3>
          </div>
          <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200">
            Version {blueprint.blueprint_version}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Status</span>
            <span className="font-bold text-slate-800">{blueprint.status}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Superseded By</span>
            <span className="font-mono text-slate-700">
              {blueprint.superseded_by || 'Current Active Version'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Locked By Auditor</span>
            <span className="font-semibold text-slate-800">
              {blueprint.locked_by ? `${blueprint.locked_by} (${new Date(blueprint.locked_at || '').toLocaleDateString()})` : 'Unlocked'}
            </span>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Immutable Modification Audit Trail</span>
          </h4>
          <span className="text-xs text-slate-500 font-semibold">{logs.length} Entries</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading audit history...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No modification logs found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.log_id} className="p-4 hover:bg-slate-50/60 transition-colors space-y-1.5 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {getActionBadge(log.action)}
                    <span className="font-bold text-slate-800">{log.auditor_name}</span>
                    {log.slot_number && (
                      <span className="font-mono text-[11px] text-indigo-700 font-bold">
                        Slot Q{log.slot_number}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-slate-600 leading-relaxed">
                  <strong className="text-slate-700">Rationale:</strong> {log.reason}
                </p>

                {log.field_changed && (
                  <div className="p-2 bg-slate-50 rounded-lg text-[11px] font-mono border border-slate-200/80 text-slate-600 flex items-center gap-2">
                    <span className="font-semibold text-slate-700">{log.field_changed}:</span>
                    <span className="text-rose-600 line-through truncate max-w-xs">{JSON.stringify(log.old_value)}</span>
                    <span>➔</span>
                    <span className="text-emerald-700 font-bold truncate max-w-xs">{JSON.stringify(log.new_value)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
