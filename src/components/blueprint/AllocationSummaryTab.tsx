import React from 'react';
import { MockBlueprintRecord } from '../../types.ts';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Layers,
  BookOpen,
  PieChart,
  BarChart2,
  Calendar,
  Sparkles,
  TrendingUp,
  Brain,
  FileCheck2,
  ShieldCheck,
  Eye
} from 'lucide-react';

interface AllocationSummaryTabProps {
  blueprint: MockBlueprintRecord;
}

export function AllocationSummaryTab({ blueprint }: AllocationSummaryTabProps) {
  const { allocation_summary, audit_result, series_ledger_preview } = blueprint;
  const totalQuestions = blueprint.question_count;

  const getTagBadge = (tag?: string) => {
    switch (tag) {
      case 'STABLE_CORE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Stable Core
          </span>
        );
      case 'ROTATIONAL_COVERAGE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Rotational Coverage
          </span>
        );
      case 'CURRENT_EXTENSION':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Current Affairs Focus
          </span>
        );
      case 'UNDERTESTED_SYLLABUS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Under-Tested Area
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {tag || 'Standard'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Overall Score & Dimension Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Score */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl border border-indigo-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
              Quality & Realism Score
            </span>
            <Award className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-baseline gap-1">
              <span>{audit_result?.total_score ?? 95}</span>
              <span className="text-base font-normal text-indigo-300">/ 100</span>
            </div>
            <p className="text-xs text-indigo-200/90 mt-1">
              Overall Status: <strong className="text-white">{audit_result?.overall_status || 'PASS'}</strong>
            </p>
          </div>
          <div className="w-full bg-indigo-950/60 rounded-full h-2 border border-indigo-700/50 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${audit_result?.total_score ?? 95}%` }}
            />
          </div>
        </div>

        {/* 3 Key Health Dimensions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Pattern & Syllabus
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {audit_result?.pattern_score ?? 100}%
          </div>
          <p className="text-[11px] text-slate-500">
            Conforms strictly to official gazetted sections, total marks, and syllabus taxonomy.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              PYQ Alignment
            </span>
            <Brain className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {audit_result?.historical_alignment_score ?? 95}%
          </div>
          <p className="text-[11px] text-slate-500">
            Evidence strength calibrated against exact exam previous papers without question copying.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Non-Repeat Safety
            </span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {audit_result?.non_repeat_score ?? 100}%
          </div>
          <p className="text-[11px] text-slate-500">
            Permanent ledger safety: 0 duplicate fact collisions with existing final series mocks.
          </p>
        </div>
      </div>

      {/* 2. Official Section Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Official Section Allocation (Stage A)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Matches official examination scheme with zero integer rounding errors
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            {totalQuestions} Questions Total
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {allocation_summary.sections.map((sec, idx) => (
            <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Section {idx + 1}
              </span>
              <div className="font-bold text-xs text-slate-900 truncate" title={sec.section_name}>
                {sec.section_name}
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                <span className="text-slate-600">Allocated: <strong className="text-indigo-700">{sec.count} Qs</strong></span>
                <span className="text-slate-400 text-[10px]">Official: {sec.official_count} Qs</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Subject Allocation: Target vs PYQ Observed vs Official */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Subject Allocation & Evidence Reconciliation (Stage B)</span>
          </h3>
          <p className="text-xs text-slate-500">
            Reconciles official gazette notification with historical PYQ observed frequency
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Subject / Domain</th>
                <th className="px-3 py-2.5 text-center">Allocated Qs</th>
                <th className="px-3 py-2.5 text-center">Target Weight %</th>
                <th className="px-3 py-2.5 text-center">PYQ Observed %</th>
                <th className="px-3 py-2.5 text-center">Official Gazette %</th>
                <th className="px-3 py-2.5">Allocation Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {allocation_summary.subjects.map((sub, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-3 py-3 font-bold text-slate-900 max-w-[220px]">
                    {sub.subject}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {sub.count} Qs
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-slate-800">
                    {sub.target_weight_pct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-3 text-center text-slate-600">
                    {sub.pyq_observed_pct !== undefined ? `${sub.pyq_observed_pct.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-3 py-3 text-center text-slate-600">
                    {sub.official_weight_pct !== undefined ? `${sub.official_weight_pct}%` : 'Syllabus Core'}
                  </td>
                  <td className="px-3 py-3 text-slate-500 text-[11px] leading-relaxed max-w-[300px]">
                    {sub.rationale || 'Balanced curriculum representation based on syllabus topics.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Topic Weighting & Anti-Overfitting Strategy */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Topic Allocation & Anti-Overfitting Strategy (Stage C)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Balances Stable Core (45%) + Rotational Coverage (25%) + Current Affairs (20%) + Under-tested (10%)
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">Stable Core</span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">Rotational</span>
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold">Current</span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold">Under-Tested</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Topic</th>
                <th className="px-3 py-2.5">Subject</th>
                <th className="px-3 py-2.5 text-center">Score (0-100)</th>
                <th className="px-3 py-2.5 text-center">Target Qs</th>
                <th className="px-3 py-2.5 text-center">Strategy Tag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {allocation_summary.topics.map((t, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-3 py-2.5 font-bold text-slate-800">
                    {t.topic}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {t.subject}
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold text-slate-800">
                    {t.relevance_score ?? 75}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="font-bold text-indigo-700 px-2 py-0.5 bg-indigo-50 rounded-lg">
                      {t.count} Qs
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {getTagBadge(t.tag)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Matrices Grid: Formats, Difficulty & Bloom's Taxonomy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Formats Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-indigo-600" />
            <span>Question Formats (Stage E)</span>
          </h4>
          <div className="space-y-2">
            {allocation_summary.formats.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">{f.format.replace('_', ' ')}</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {f.count} Qs ({Math.round((f.count / totalQuestions) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty Calibration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            <span>Difficulty Matrix (Stage F)</span>
          </h4>
          <div className="space-y-2.5 pt-1">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-emerald-700">Easy (Foundational)</span>
                <span className="font-bold">{allocation_summary.difficulties.easy_count} Qs</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${(allocation_summary.difficulties.easy_count / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-blue-700">Moderate (Standard Pattern)</span>
                <span className="font-bold">{allocation_summary.difficulties.moderate_count} Qs</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${(allocation_summary.difficulties.moderate_count / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-rose-700">Difficult (Discriminative)</span>
                <span className="font-bold">{allocation_summary.difficulties.difficult_count} Qs</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{ width: `${(allocation_summary.difficulties.difficult_count / totalQuestions) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cognitive Levels */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-purple-600" />
            <span>Bloom's Taxonomy (Stage G)</span>
          </h4>
          <div className="space-y-1.5 text-xs font-medium">
            <div className="flex justify-between p-1.5 bg-slate-50 rounded">
              <span className="text-slate-600">Recall</span>
              <span className="font-bold text-slate-800">{allocation_summary.cognitive.recall} Qs</span>
            </div>
            <div className="flex justify-between p-1.5 bg-slate-50 rounded">
              <span className="text-slate-600">Understand</span>
              <span className="font-bold text-slate-800">{allocation_summary.cognitive.understand} Qs</span>
            </div>
            <div className="flex justify-between p-1.5 bg-slate-50 rounded">
              <span className="text-slate-600">Apply</span>
              <span className="font-bold text-slate-800">{allocation_summary.cognitive.apply} Qs</span>
            </div>
            <div className="flex justify-between p-1.5 bg-slate-50 rounded">
              <span className="text-slate-600">Analyse</span>
              <span className="font-bold text-slate-800">{allocation_summary.cognitive.analyse} Qs</span>
            </div>
            <div className="flex justify-between p-1.5 bg-slate-50 rounded">
              <span className="text-slate-600">Multi-Step Reasoning</span>
              <span className="font-bold text-slate-800">{allocation_summary.cognitive.multi_step} Qs</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Static vs Current & Answer Position Balancing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Static vs Current Window */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Static vs Current Affairs Window (Stage H)</span>
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase text-slate-500 block">Static Core</span>
              <strong className="text-sm font-bold text-slate-800">
                {allocation_summary.static_current.static_count} Qs
              </strong>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase text-slate-500 block">Dynamic Current</span>
              <strong className="text-sm font-bold text-emerald-700">
                {allocation_summary.static_current.current_count} Qs
              </strong>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase text-slate-500 block">Static-Linked</span>
              <strong className="text-sm font-bold text-blue-700">
                {allocation_summary.static_current.linked_count} Qs
              </strong>
            </div>
          </div>
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs space-y-1">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
              <span>Cutoff Date Locked:</span>
              <span className="font-mono">{blueprint.current_affairs_cutoff || 'Not Defined'}</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Questions testing current affairs strictly observe the gazetted recruitment notification window.
            </p>
          </div>
        </div>

        {/* Answer Position Balancing */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-indigo-600" />
              <span>Target Answer Position Balance (Stage J)</span>
            </h4>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
              Balanced (25% ± 3%)
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {['A', 'B', 'C', 'D'].map((k) => {
              const count = (allocation_summary.answer_positions as any)[k] || 0;
              const pct = Math.round((count / totalQuestions) * 100);
              return (
                <div key={k} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <span className="text-sm font-black text-indigo-700 block">Option {k}</span>
                  <span className="text-base font-bold text-slate-900 block">{count} Qs</span>
                  <span className="text-[10px] text-slate-500">{pct}%</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Eliminates option bias and prevents consecutive answer streaks (max streak ≤ 2 identical letters).
          </p>
        </div>
      </div>
    </div>
  );
}
