import React from 'react';
import { ResearchMode } from '../types.ts';
import { Sparkles, Globe, Cpu, ShieldCheck } from 'lucide-react';

interface ModeSelectorProps {
  mode: ResearchMode;
  onChange: (mode: ResearchMode) => void;
  disabled?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, onChange, disabled }) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <SlidersIcon className="w-3.5 h-3.5 text-blue-600" />
          Research Mode
        </label>
        <span className="text-[11px] text-slate-500 font-mono">
          Default: <strong className="text-blue-700 font-semibold">HYBRID</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* MODE C: HYBRID */}
        <button
          type="button"
          id="mode-hybrid-btn"
          disabled={disabled}
          onClick={() => onChange('HYBRID')}
          className={`relative text-left p-3.5 rounded-xl border transition-all ${
            mode === 'HYBRID'
              ? 'bg-blue-50/70 border-blue-500 text-blue-950 shadow-sm ring-1 ring-blue-500/20'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Hybrid
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
              Recommended
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Direct Web registry first; invokes targeted Google Search grounding only when required.
          </p>
          <div className="mt-2 text-[10px] font-mono text-blue-900/70 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Zero search cost if registry suffices
          </div>
        </button>

        {/* MODE A: GOOGLE_API */}
        <button
          type="button"
          id="mode-google-btn"
          disabled={disabled}
          onClick={() => onChange('GOOGLE_API')}
          className={`relative text-left p-3.5 rounded-xl border transition-all ${
            mode === 'GOOGLE_API'
              ? 'bg-indigo-50/70 border-indigo-500 text-indigo-950 shadow-sm ring-1 ring-indigo-500/20'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-800">
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              Google Search API
            </span>
            <span className="text-[10px] uppercase font-medium px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
              Grounding
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Gemini Google Search grounding and URL context for live internet indexing.
          </p>
          <div className="mt-2 text-[10px] font-mono text-indigo-900/70 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-indigo-600" />
            Paid Grounding API queries
          </div>
        </button>

        {/* MODE B: DIRECT_WEB */}
        <button
          type="button"
          id="mode-direct-btn"
          disabled={disabled}
          onClick={() => onChange('DIRECT_WEB')}
          className={`relative text-left p-3.5 rounded-xl border transition-all ${
            mode === 'DIRECT_WEB'
              ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 shadow-sm ring-1 ring-emerald-500/20'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Direct Web
            </span>
            <span className="text-[10px] uppercase font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
              No Search API
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Known official commission websites, sitemaps, registry paths & uploaded docs only.
          </p>
          <div className="mt-2 text-[10px] font-mono text-emerald-900/70 flex items-center gap-1">
            <span className="text-emerald-700 font-bold">$0.00</span>
            Pure Direct Authority Retrieval
          </div>
        </button>
      </div>
    </div>
  );
};

function SlidersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  );
}
