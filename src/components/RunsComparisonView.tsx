import React from 'react';
import { ResearchRunLog } from '../types.ts';
import { BarChart3, DollarSign, Clock, Search, ShieldCheck, Zap, Globe, Sparkles, Layers } from 'lucide-react';

interface RunsComparisonViewProps {
  runs: ResearchRunLog[];
  onSelectRun: (run: ResearchRunLog) => void;
  onRunBenchmark?: () => void;
  isBenchmarking?: boolean;
}

export const RunsComparisonView: React.FC<RunsComparisonViewProps> = ({
  runs,
  onSelectRun,
  onRunBenchmark,
  isBenchmarking = false,
}) => {
  // Aggregate metrics by research_mode
  const hybridRuns = runs.filter(r => r.research_mode === 'HYBRID');
  const googleRuns = runs.filter(r => r.research_mode === 'GOOGLE_API');
  const directRuns = runs.filter(r => r.research_mode === 'DIRECT_WEB');

  const calcAvg = (arr: ResearchRunLog[], key: keyof ResearchRunLog) => {
    if (arr.length === 0) return 0;
    const sum = arr.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    return Math.round((sum / arr.length) * 100) / 100;
  };

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Objective Comparison: 3 Research Approaches
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Evaluate cost, latency, search API dependency, and official source trust across 
            <strong> Mode A (Google Search API)</strong>, 
            <strong> Mode B (Direct Web)</strong>, and 
            <strong> Mode C (Hybrid)</strong>.
          </p>
        </div>

        {onRunBenchmark && (
          <button
            type="button"
            onClick={onRunBenchmark}
            disabled={isBenchmarking}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isBenchmarking ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Running 3-Mode Benchmark...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Benchmark All 3 Modes Sequentially</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 3 Approach Comparison Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MODE C: HYBRID */}
        <div className="bg-white border-2 border-blue-500/40 rounded-2xl p-5 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
            Recommended Default
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Mode C: Hybrid</h3>
              <p className="text-[11px] text-slate-500">Direct Web first + Search if required</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Avg Cost / Run
              </span>
              <span className="font-bold font-mono text-emerald-700">
                ${calcAvg(hybridRuns, 'estimated_cost')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-600" /> Google Search Queries
              </span>
              <span className="font-bold font-mono text-slate-800">
                {calcAvg(hybridRuns, 'Google_search_queries')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Avg Duration
              </span>
              <span className="font-mono text-slate-800">
                {(calcAvg(hybridRuns, 'duration_ms') / 1000).toFixed(1)}s
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Official Sources / Run
              </span>
              <span className="font-bold font-mono text-emerald-700">
                {calcAvg(hybridRuns, 'official_sources_found')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" /> Avg Gemini Tokens
              </span>
              <span className="font-mono text-slate-800">
                {calcAvg(hybridRuns, 'Gemini_tokens')}
              </span>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 text-[11px] text-blue-900">
            <strong>Verdict:</strong> Optimal economy & accuracy. Falls back to search grounding only when official registry lacks key scheme metrics.
          </div>
        </div>

        {/* MODE A: GOOGLE_API */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Mode A: Google API</h3>
              <p className="text-[11px] text-slate-500">Gemini Google Search Grounding</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Avg Cost / Run
              </span>
              <span className="font-bold font-mono text-slate-900">
                ${calcAvg(googleRuns, 'estimated_cost')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-indigo-600" /> Google Search Queries
              </span>
              <span className="font-bold font-mono text-indigo-700">
                {calcAvg(googleRuns, 'Google_search_queries')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Avg Duration
              </span>
              <span className="font-mono text-slate-800">
                {(calcAvg(googleRuns, 'duration_ms') / 1000).toFixed(1)}s
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Official Sources / Run
              </span>
              <span className="font-bold font-mono text-slate-800">
                {calcAvg(googleRuns, 'official_sources_found')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" /> Avg Gemini Tokens
              </span>
              <span className="font-mono text-slate-800">
                {calcAvg(googleRuns, 'Gemini_tokens')}
              </span>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
            <strong>Verdict:</strong> High discovery of latest news and notification releases across the broader web, but incurs search API grounding fees per run.
          </div>
        </div>

        {/* MODE B: DIRECT_WEB */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Mode B: Direct Web</h3>
              <p className="text-[11px] text-slate-500">Official Registry & Uploads Only</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Avg Cost / Run
              </span>
              <span className="font-bold font-mono text-emerald-600">
                $0.00 <span className="text-[10px] font-normal text-slate-500">(Token-only)</span>
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-600" /> Google Search Queries
              </span>
              <span className="font-bold font-mono text-emerald-700">
                0 <span className="text-[10px] font-normal text-slate-500">(Pure direct)</span>
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Avg Duration
              </span>
              <span className="font-mono text-slate-800">
                {(calcAvg(directRuns, 'duration_ms') / 1000).toFixed(1)}s
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Official Sources / Run
              </span>
              <span className="font-bold font-mono text-emerald-700">
                {calcAvg(directRuns, 'official_sources_found')}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" /> Avg Gemini Tokens
              </span>
              <span className="font-mono text-slate-800">
                {calcAvg(directRuns, 'Gemini_tokens')}
              </span>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-[11px] text-emerald-900">
            <strong>Verdict:</strong> 100% independent from search APIs. Directly inspects official commission domains, sitemaps, and uploaded syllabus documents.
          </div>
        </div>
      </div>

      {/* Historical Runs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Research Run Execution Log (audit trail)
        </h3>

        {runs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No research runs executed yet. Run an examination search above to populate the audit log.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-3">Run ID</th>
                  <th className="py-2.5 px-3">Exam Query</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">Search Qs</th>
                  <th className="py-2.5 px-3">Pages / Docs</th>
                  <th className="py-2.5 px-3">L5 Official</th>
                  <th className="py-2.5 px-3">Est. Cost</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.map((r) => (
                  <tr key={r.run_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {r.run_id.substring(0, 14)}...
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {r.query_input}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.research_mode === 'HYBRID'
                          ? 'bg-blue-100 text-blue-800'
                          : r.research_mode === 'GOOGLE_API'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {r.research_mode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {(r.duration_ms / 1000).toFixed(1)}s
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {r.Google_search_queries}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {r.pages_visited} / {r.documents_found}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold font-mono text-emerald-700">
                        {r.official_sources_found}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                      ${r.estimated_cost}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectRun(r)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-[11px] hover:underline"
                      >
                        Inspect Facts
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
