import React, { useState, useMemo } from 'react';
import { ResearchFact, SourceTrustLevel, VerificationStatus } from '../types.ts';
import { TrustBadge, VerificationBadge } from './TrustBadges.tsx';
import { ExternalLink, Check, AlertCircle, ShieldAlert, Sparkles, Filter } from 'lucide-react';

interface FactsDisplayProps {
  facts: ResearchFact[];
  summaryNotes?: string;
  researchMode: string;
  researchStatus?: 'RESEARCH_SUCCESS' | 'RESEARCH_PARTIAL' | 'RESEARCH_PARTIAL_QUOTA_EXHAUSTED' | 'RESEARCH_FAILED';
  unresolvedFacts?: string[];
  fallbackApplied?: boolean;
  uiMessage?: string;
}

export const FactsDisplay: React.FC<FactsDisplayProps> = ({
  facts,
  summaryNotes,
  researchMode,
  researchStatus,
  unresolvedFacts,
  fallbackApplied,
  uiMessage,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredFacts = useMemo(() => {
    return facts.filter(fact => {
      if (selectedStatus !== 'ALL' && fact.verification_status !== selectedStatus) return false;
      if (selectedLevel !== 'ALL' && fact.source_level !== selectedLevel) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          fact.fact.toLowerCase().includes(q) ||
          fact.value.toLowerCase().includes(q) ||
          fact.source_title.toLowerCase().includes(q) ||
          fact.source_domain.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [facts, selectedStatus, selectedLevel, searchTerm]);

  const verifiedOfficialCount = facts.filter(f => f.verification_status === 'VERIFIED_OFFICIAL').length;
  const conflictCount = facts.filter(f => f.verification_status === 'CONFLICT' || !!f.conflict_details).length;

  return (
    <div className="space-y-4">
      {/* Resilient Quota / Fallback Advisory Banner */}
      {(uiMessage || (researchStatus === 'RESEARCH_PARTIAL_QUOTA_EXHAUSTED' || researchStatus === 'RESEARCH_PARTIAL')) && (
        <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 flex items-start gap-3 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5 leading-relaxed">
            <div className="font-semibold text-amber-900 flex items-center gap-2">
              <span>{uiMessage || "Primary AI research quota reached — using fallback/direct official research."}</span>
              {(researchStatus === 'RESEARCH_PARTIAL_QUOTA_EXHAUSTED' || researchStatus === 'RESEARCH_PARTIAL') && (
                <span className="px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-900 font-mono text-[10px] font-bold">
                  PARTIAL RESEARCH
                </span>
              )}
            </div>
            {unresolvedFacts && unresolvedFacts.length > 0 && (
              <div className="pt-1">
                <span className="text-amber-800 font-medium">Unresolved Critical Facts: </span>
                <div className="inline-flex flex-wrap gap-1 mt-1">
                  {unresolvedFacts.map(factName => (
                    <span
                      key={factName}
                      className="px-2 py-0.5 rounded bg-amber-100/90 text-amber-900 border border-amber-200/60 font-mono text-[11px]"
                    >
                      {factName.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Notes banner */}
      {summaryNotes && summaryNotes !== uiMessage && (
        <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/70 text-blue-950 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="font-semibold text-blue-900">Research Synthesis ({researchMode}): </strong>
            {summaryNotes}
          </div>
        </div>
      )}

      {/* Filter and stats bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Discovered Facts ({filteredFacts.length} of {facts.length})
            </span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                {verifiedOfficialCount} Official
              </span>
              {conflictCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  {conflictCount} Conflicts Overridden by L5
                </span>
              )}
            </div>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search facts, syllabus, marks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
            <Filter className="w-3 h-3" /> Filter:
          </span>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-[11px] px-2 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="ALL">All Verification Statuses</option>
            <option value="VERIFIED_OFFICIAL">Verified Official</option>
            <option value="VERIFIED_MULTIPLE_SOURCES">Verified Multiple Sources</option>
            <option value="SECONDARY_ONLY">Secondary Only</option>
            <option value="CONFLICT">Conflict</option>
            <option value="UNVERIFIED">Unverified</option>
          </select>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="text-[11px] px-2 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="ALL">All Trust Levels</option>
            <option value="LEVEL_5_OFFICIAL">Level 5 (Official / Gazette)</option>
            <option value="LEVEL_4_GOVERNMENT">Level 4 (Government / PIB)</option>
            <option value="LEVEL_3_ACADEMIC">Level 3 (Academic)</option>
            <option value="LEVEL_2_SECONDARY">Level 2 (Secondary / News)</option>
            <option value="LEVEL_1_DISCOVERY">Level 1 (Discovery / Forums)</option>
          </select>

          {(selectedStatus !== 'ALL' || selectedLevel !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedStatus('ALL');
                setSelectedLevel('ALL');
                setSearchTerm('');
              }}
              className="text-[11px] text-blue-600 hover:underline ml-auto"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Fact Cards List */}
      <div className="space-y-3">
        {filteredFacts.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
            No facts match the selected filters.
          </div>
        ) : (
          filteredFacts.map((item, idx) => (
            <div
              key={`${item.fact}-${idx}`}
              className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs hover:border-blue-200 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                    {item.fact}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <VerificationBadge status={item.verification_status} />
                    <TrustBadge level={item.source_level} compact />
                    <span className="text-[10px] text-slate-400 font-mono">
                      Conf: {item.confidence}%
                    </span>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-500 font-mono">
                  <div>Retrieved: {item.retrieved_at && !isNaN(new Date(item.retrieved_at).getTime()) ? new Date(item.retrieved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Verified in Registry'}</div>
                  <div className="text-[10px] text-slate-400">Pub: {item.publication_date || 'Current Cycle'}</div>
                </div>
              </div>

              {/* Fact Value */}
              <div className="text-xs text-slate-700 font-normal leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 my-2 whitespace-pre-line">
                {item.value}
              </div>

              {/* Conflict details callout if present */}
              {item.conflict_details && (
                <div className="mb-2 p-2 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-amber-950">Discrepancy Resolution: </strong>
                    {item.conflict_details}
                    <div className="text-[10px] text-amber-800 font-mono mt-0.5">
                      Enforced rule: Level 5 Official Source overrides Level 1/2 secondary claims.
                    </div>
                  </div>
                </div>
              )}

              {/* Source & Provenance Metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">{item.source_title}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-slate-500">{item.source_domain}</span>
                </div>

                <a
                  href={item.source_url.startsWith('http') ? item.source_url : `https://${item.source_domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Inspect Source
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
