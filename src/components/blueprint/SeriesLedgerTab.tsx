import React from 'react';
import { MockBlueprintRecord } from '../../types.ts';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  FileCheck2,
  RefreshCw,
  HelpCircle,
  Hash
} from 'lucide-react';

interface SeriesLedgerTabProps {
  blueprint: MockBlueprintRecord;
}

export function SeriesLedgerTab({ blueprint }: SeriesLedgerTabProps) {
  const ledger = blueprint.series_ledger_preview;

  const getPressureBadge = (pressure?: string) => {
    switch (pressure) {
      case 'NONE':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Abundant Headroom (NONE)
          </span>
        );
      case 'LOW':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            Low Headroom Pressure (LOW)
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            Moderate Headroom Pressure (MEDIUM)
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            High Uniqueness Pressure (HIGH)
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {pressure || 'Standard'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Uniqueness Pressure Overview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Series Non-Repeat Ledger & Uniqueness Monitor
              </h3>
              <p className="text-xs text-slate-500">
                Series ID: <span className="font-mono text-slate-700">{blueprint.series_id}</span> • Current Target: <strong>Mock #{blueprint.mock_number}</strong>
              </p>
            </div>
          </div>
          <div>
            {getPressureBadge(ledger?.uniqueness_pressure)}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed">
          {ledger?.pressure_details || 'Series non-repeat ledger actively tracks facts and questions to prevent memorization artifacts across consecutive mocks.'}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Preceding Final Mocks</span>
            <span className="text-2xl font-black text-slate-900">{ledger?.existing_final_mocks || 0}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Finalized in series</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Cumulative Facts Locked</span>
            <span className="text-2xl font-black text-indigo-700">{ledger?.unique_facts_used || 0}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Permanent fact families</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Planned In This Blueprint</span>
            <span className="text-2xl font-black text-emerald-700">{blueprint.question_count}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">New answerable facts</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Blocked Duplicate Attempts</span>
            <span className="text-2xl font-black text-rose-700">{ledger?.blocked_duplicates || 0}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Prevented by 5-layer ledger</span>
          </div>
        </div>
      </div>

      {/* 2. Topic-Repeat vs Fact-Repeat Policy */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Fundamental Series Policy: Topic Repeat vs Fact Repeat</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Topic Repetition is REQUIRED (Allowed & Mandatory)</span>
            </div>
            <p className="text-emerald-900 leading-relaxed">
              Crucial syllabus pillars (e.g., Fundamental Rights, Emergency Provisions, Reserve Bank Monetary Policy) must appear in every full-length mock to preserve realistic exam weightage.
            </p>
          </div>

          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-950">
              <ShieldCheck className="w-4 h-4 text-rose-700" />
              <span>Core Fact Repetition is STRICTLY PROHIBITED (Blocked)</span>
            </div>
            <p className="text-rose-900 leading-relaxed">
              If Mock 1 tested Article 21 and the right to privacy (Puttaswamy case), Mock 2 is blocked from re-testing that exact fact. Mock 2 must instead test an adjacent statutory or judicial facet (e.g. Article 20 protection in criminal proceedings).
            </p>
          </div>
        </div>
      </div>

      {/* 3. Pre-allocated Fact Families in this Blueprint */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Hash className="w-4 h-4 text-slate-600" />
            <span>Planned Fact Families Sample (First 10 Slots)</span>
          </h3>
          <span className="text-xs text-slate-500 font-semibold">
            {blueprint.slots.length} Unique Fact Targets
          </span>
        </div>

        <div className="space-y-2">
          {blueprint.slots.slice(0, 10).map((s) => (
            <div key={s.slot_id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-indigo-700">Q{s.question_number}</span>
                  <span>{s.topic}</span>
                  <span className="text-[10px] text-slate-400">•</span>
                  <span className="text-[11px] text-slate-600">{s.core_concept_target}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Fact Family: {s.answerable_fact_family}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 text-[10px] font-bold shrink-0">
                {s.pyq_relationship.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
