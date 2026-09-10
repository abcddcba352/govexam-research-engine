import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  AlertOctagon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
  Edit3
} from 'lucide-react';
import {
  ExamRecord,
  CriticalFactName,
  ExamFactVerification,
  VerificationStatus
} from '../types';

interface FieldVerificationMatrixProps {
  exam: ExamRecord;
  onVerifyFact: (factName: CriticalFactName, factLabel: string, currentValue: any) => void;
  onOpenFullSignoff: () => void;
  onLaunchResearch?: () => void;
}

interface FactRowMeta {
  key: CriticalFactName;
  label: string;
  category: 'IDENTITY' | 'PATTERN' | 'SYLLABUS';
  description: string;
}

const CRITICAL_FACTS_META: FactRowMeta[] = [
  { key: 'authority', label: 'Commission / Authority', category: 'IDENTITY', description: 'Statutory recruiting constitutional body' },
  { key: 'exam_name', label: 'Exam Name', category: 'IDENTITY', description: 'Official gazetted notification title' },
  { key: 'recruitment_cycle', label: 'Recruitment Cycle', category: 'IDENTITY', description: 'Notification number & applicable cycle year' },
  { key: 'stage_tier', label: 'Stage / Tier', category: 'PATTERN', description: 'Screening / Prelims / Mains / Tier specification' },
  { key: 'paper', label: 'Paper Scope', category: 'PATTERN', description: 'Exact paper number and subject coverage' },
  { key: 'question_count', label: 'Question Count', category: 'PATTERN', description: 'Total objective questions in test scheme' },
  { key: 'marks', label: 'Marks Scheme', category: 'PATTERN', description: 'Maximum marks & marks allotted per question' },
  { key: 'duration', label: 'Duration', category: 'PATTERN', description: 'Allocated test duration in minutes' },
  { key: 'negative_marking', label: 'Negative Marking Penalty', category: 'PATTERN', description: 'Deduction fraction per wrong answer (0, 0.25, 0.33, 0.5)' },
  { key: 'language_rules', label: 'Language Rules', category: 'PATTERN', description: 'Authorized exam mediums (English, Telugu, Urdu, etc.)' },
  { key: 'section_structure', label: 'Section Structure', category: 'SYLLABUS', description: 'Discrete section distribution & subject parts' },
  { key: 'syllabus_version', label: 'Syllabus Version', category: 'SYLLABUS', description: 'Gazetted syllabus notification version' }
];

export const FieldVerificationMatrix: React.FC<FieldVerificationMatrixProps> = ({
  exam,
  onVerifyFact,
  onOpenFullSignoff,
  onLaunchResearch,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'IDENTITY' | 'PATTERN' | 'SYLLABUS'>('ALL');

  const factMap = exam.fact_verifications || {};

  // Compute counts
  let verifiedCount = 0;
  let unverifiedCount = 0;
  let conflictCount = 0;

  CRITICAL_FACTS_META.forEach(meta => {
    const item = factMap[meta.key];
    const status = item?.verification_status || 'UNVERIFIED';
    if (status === 'VERIFIED_OFFICIAL' && item?.evidence_text) {
      verifiedCount++;
    } else if (status === 'CONFLICT') {
      conflictCount++;
    } else {
      unverifiedCount++;
    }
  });

  const totalCount = CRITICAL_FACTS_META.length;
  const isAllVerified = verifiedCount === totalCount && conflictCount === 0;
  const verificationPercent = Math.round((verifiedCount / totalCount) * 100);

  const getStatusBadge = (status?: VerificationStatus, hasEvidence?: boolean) => {
    if (status === 'VERIFIED_OFFICIAL' && hasEvidence) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>VERIFIED</span>
        </span>
      );
    }
    if (status === 'CONFLICT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertOctagon className="w-3 h-3 text-rose-600" />
          <span>CONFLICT</span>
        </span>
      );
    }
    if (status === 'PARTIALLY_VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>PARTIAL</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <HelpCircle className="w-3 h-3 text-slate-400" />
        <span>UNVERIFIED</span>
      </span>
    );
  };

  const filteredFacts = CRITICAL_FACTS_META.filter(
    f => filterCategory === 'ALL' || f.category === filterCategory
  );

  return (
    <div className="bg-slate-50/70 rounded-xl border border-slate-200 overflow-hidden text-xs transition-all">
      {/* Header bar */}
      <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
            isAllVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm">Field-Level Verification Audit Matrix</h4>
              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wide border ${
                isAllVerified
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {isAllVerified ? 'Gate: Passed (Verified)' : 'Gate: Blocked (Unverified Facts)'}
              </span>
            </div>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Strict multi-fact audit rule: Exam profile requires 100% verified critical fields with official gazette evidence.
            </p>
          </div>
        </div>

        {/* Status indicator & buttons */}
        <div className="flex items-center gap-2.5">
          <div className="text-right pr-2 hidden sm:block">
            <div className="font-bold text-slate-800">
              {verifiedCount} / {totalCount} Verified ({verificationPercent}%)
            </div>
            <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1 ml-auto">
              <div
                className={`h-full transition-all duration-300 ${
                  isAllVerified ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${verificationPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={onOpenFullSignoff}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Auditor Sign-Off</span>
          </button>

          {onLaunchResearch && !isAllVerified && (
            <button
              onClick={onLaunchResearch}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Auto-Research</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title={isExpanded ? "Collapse Matrix" : "Expand Matrix"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">Filter Facts:</span>
            {(['ALL', 'IDENTITY', 'PATTERN', 'SYLLABUS'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterCategory === cat
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat === 'ALL' ? 'All (12)' : cat === 'IDENTITY' ? 'Identity (3)' : cat === 'PATTERN' ? 'Exam Pattern (7)' : 'Syllabus (2)'}
              </button>
            ))}
          </div>

          {/* Facts Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider">
                    <th className="py-2 px-3 font-semibold w-1/4">Critical Fact Field</th>
                    <th className="py-2 px-3 font-semibold w-1/4">Verified Fact Value</th>
                    <th className="py-2 px-2 font-semibold text-center w-24">Status</th>
                    <th className="py-2 px-3 font-semibold">Official Evidence & Source</th>
                    <th className="py-2 px-2 font-semibold text-right w-20">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFacts.map(meta => {
                    const fact = factMap[meta.key];
                    const hasEvidence = Boolean(fact?.evidence_text && fact.evidence_text.trim().length > 0);
                    const isVerified = fact?.verification_status === 'VERIFIED_OFFICIAL' && hasEvidence;

                    // Fallback display value
                    let displayValue: any = fact?.fact_value;
                    if (displayValue === undefined || displayValue === null || displayValue === '') {
                      if (meta.key === 'negative_marking') displayValue = exam.pattern.negative_marking_rate;
                      else if (meta.key === 'question_count') displayValue = exam.pattern.total_questions;
                      else if (meta.key === 'marks') displayValue = exam.pattern.total_marks;
                      else if (meta.key === 'duration') displayValue = `${exam.pattern.duration_minutes} Mins`;
                      else if (meta.key === 'language_rules') displayValue = exam.pattern.mediums?.join(', ') || 'English, Telugu';
                      else if (meta.key === 'authority') displayValue = exam.commission;
                      else if (meta.key === 'exam_name') displayValue = exam.title;
                      else if (meta.key === 'recruitment_cycle') displayValue = exam.active_cycle || exam.recruitment_cycle;
                      else if (meta.key === 'stage_tier') displayValue = exam.stage;
                      else if (meta.key === 'paper') displayValue = exam.paper;
                      else if (meta.key === 'section_structure') displayValue = `${exam.pattern.sections?.length || 0} Sections`;
                      else if (meta.key === 'syllabus_version') displayValue = 'Standard Official Gazette';
                    }

                    if (Array.isArray(displayValue)) {
                      displayValue = displayValue.join(' • ');
                    }

                    return (
                      <tr
                        key={meta.key}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !isVerified ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 align-top">
                          <div className="font-semibold text-slate-800">{meta.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{meta.description}</div>
                        </td>
                        <td className="py-2.5 px-3 align-top font-medium text-slate-900">
                          <div className="break-words max-w-xs">{String(displayValue || 'Not Set')}</div>
                        </td>
                        <td className="py-2.5 px-2 align-top text-center">
                          {getStatusBadge(fact?.verification_status, hasEvidence)}
                        </td>
                        <td className="py-2.5 px-3 align-top text-[11px]">
                          {hasEvidence ? (
                            <div className="space-y-1">
                              <p className="text-slate-700 italic">"{fact.evidence_text}"</p>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                                {fact.source_title && (
                                  <span className="font-medium text-slate-700">{fact.source_title}</span>
                                )}
                                {fact.applicable_cycle && (
                                  <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                                    Cycle: {fact.applicable_cycle}
                                  </span>
                                )}
                                {fact.verified_by && (
                                  <span className="text-emerald-700">By: {fact.verified_by}</span>
                                )}
                                {fact.source_url && (
                                  <a
                                    href={fact.source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-0.5 text-indigo-600 hover:underline"
                                  >
                                    <span>Doc</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-400 italic">
                              No official gazette citation linked. Pending auditor verification or research run.
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2 align-top text-right">
                          <button
                            onClick={() => onVerifyFact(meta.key, meta.label, displayValue)}
                            className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 rounded border border-slate-200 text-[11px] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Verify or override this specific fact"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Verify</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
