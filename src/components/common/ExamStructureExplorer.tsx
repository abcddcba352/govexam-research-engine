import React, { useState } from 'react';
import {
  Layers,
  BookOpen,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  FileCheck2,
  CheckCircle2,
  Clock,
  HelpCircle,
  ShieldCheck,
  AlertCircle,
  PlusCircle,
  Search,
  Award,
  Zap
} from 'lucide-react';
import type { ExamStructureScheme, ExamStage, ExamStagePaper } from '../../types.ts';

interface ExamStructureExplorerProps {
  structure: ExamStructureScheme | null;
  isLoading?: boolean;
  onSearchStructure?: (query: string) => void;
  onSelectPaperForResearch?: (paperTitle: string, stageName: string) => void;
  onSelectPaperForIntake?: (paper: ExamStagePaper, stage: ExamStage, scheme: ExamStructureScheme) => void;
  onSelectPaperForMocks?: (paperTitle: string) => void;
  onClose?: () => void;
}

export const ExamStructureExplorer: React.FC<ExamStructureExplorerProps> = ({
  structure,
  isLoading = false,
  onSearchStructure,
  onSelectPaperForResearch,
  onSelectPaperForIntake,
  onSelectPaperForMocks,
  onClose,
}) => {
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (paperId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [paperId]: !prev[paperId]
    }));
  };

  const handleQuickChip = (term: string) => {
    setSearchQuery(term);
    if (onSearchStructure) {
      onSearchStructure(term);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearchStructure) {
      onSearchStructure(searchQuery.trim());
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 shadow-md overflow-hidden transition-all animate-in fade-in duration-200">
      {/* Search Header Bar */}
      <div className="p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-700/60 border border-indigo-500/40 text-indigo-200 text-xs font-semibold mb-2">
            <Layers className="w-3.5 h-3.5 text-amber-300" />
            <span>EXAMINATION SELECTION ARCHITECTURE</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span>Stages & Examination Papers Explorer</span>
            {structure && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold uppercase">
                {structure.total_stages} {structure.total_stages === 1 ? 'Stage' : 'Stages'}
              </span>
            )}
          </h2>
          <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
            Inspect the complete gazetted selection process, preliminary screening tests, descriptive mains papers, qualifying cutoffs, and physical/skill tests.
          </p>
        </div>

        {onSearchStructure && (
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2 max-w-md w-full md:w-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="e.g. TGPSC Group 1, TSLPRB SI, SSC CGL..."
                className="w-full pl-9 pr-3 py-2 bg-white/10 border border-white/20 rounded-lg text-xs text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white/20 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {isLoading ? 'Fetching...' : 'Fetch Scheme'}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-2 text-indigo-200 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </form>
        )}
      </div>

      {/* Quick Search Suggestions Chips */}
      <div className="px-5 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex items-center gap-1.5 flex-wrap text-xs">
        <span className="font-bold text-indigo-950 mr-1 flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-indigo-600" />
          <span>Popular Schemes:</span>
        </span>
        {[
          { label: 'TGPSC Group-1 (Prelims + 7 Mains)', query: 'TGPSC Group 1' },
          { label: 'TGPSC Group-2 (4 Papers)', query: 'TGPSC Group 2' },
          { label: 'TSLPRB Police SI (PWT + PMT/PET + 4 FWE)', query: 'TSLPRB Police SI' },
          { label: 'SSC CGL (Tier 1 & Tier 2)', query: 'SSC CGL' },
          { label: 'UPSC CSE (Prelims + 9 Mains + Interview)', query: 'UPSC CSE' },
          { label: 'APPSC Group-2 (Screening + 2 Mains + CPT)', query: 'APPSC Group 2' },
          { label: 'RRB NTPC (CBT 1 & CBT 2)', query: 'RRB NTPC' },
        ].map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickChip(item.query)}
            className="px-2 py-0.5 rounded-md bg-white hover:bg-indigo-600 hover:text-white text-indigo-900 border border-indigo-200 text-[11px] font-medium transition-colors cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Body */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-700">Resolving official notification selection stages and papers...</p>
          <p className="text-xs text-slate-400">Consulting gazetted scheme, statutory examination patterns, and syllabus rules.</p>
        </div>
      ) : !structure ? (
        <div className="p-8 text-center text-slate-500 text-sm">
          Enter an examination name above or click one of the popular schemes to view its stages and papers breakdown.
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* Overview Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {structure.commission}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200 text-slate-800">
                  {structure.state_or_central === 'Central' ? '🏛️ Central (National)' : `🗺️ State: ${structure.state_or_central}`}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{structure.source_status === 'VERIFIED_OFFICIAL_CATALOG' ? 'Verified Official Scheme' : 'AI Retrieved Scheme'}</span>
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{structure.exam_name}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-700">Selection Pathway: </strong>
                {structure.selection_summary}
              </p>
            </div>

            {structure.official_reference && (
              <a
                href={structure.official_reference}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-indigo-700 font-semibold text-xs border border-slate-300 inline-flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <span>Official Notice</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Visual Roadmap Timeline */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>Selection Roadmap:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {structure.stages.map((stg, idx) => {
                const isSelected = activeStageId === stg.stage_id || (!activeStageId && idx === 0);
                return (
                  <button
                    key={stg.stage_id}
                    type="button"
                    onClick={() => setActiveStageId(stg.stage_id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        Stage {stg.stage_number} of {structure.total_stages}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        stg.is_qualifying_only ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {stg.is_qualifying_only ? 'Qualifying Only' : 'Merit Ranking'}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 text-sm">{stg.stage_name}</div>
                    <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <span>{stg.papers.length} {stg.papers.length === 1 ? 'Paper' : 'Papers'}</span>
                      <span className="font-semibold text-slate-700">{stg.total_marks > 0 ? `${stg.total_marks} Marks` : 'Qualifying'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Stages & Papers Accordion */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Examination Papers Breakdown:</span>
              <span className="text-slate-400 font-normal lowercase">
                click any paper to research or register intake
              </span>
            </div>

            {structure.stages.map((stage) => {
              const isStageActive = activeStageId === stage.stage_id || (!activeStageId);
              return (
                <div
                  key={stage.stage_id}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
                >
                  {/* Stage Header */}
                  <div
                    onClick={() => setActiveStageId(activeStageId === stage.stage_id ? null : stage.stage_id)}
                    className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {stage.stage_number}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base">{stage.stage_name}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            stage.stage_type === 'PRELIMINARY'
                              ? 'bg-blue-100 text-blue-800'
                              : stage.stage_type === 'MAINS'
                              ? 'bg-purple-100 text-purple-800'
                              : stage.stage_type === 'PHYSICAL_TEST'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-teal-100 text-teal-800'
                          }`}>
                            {stage.stage_type}
                          </span>
                        </div>
                        {stage.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{stage.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right text-xs">
                        <span className="font-bold text-slate-900 block">{stage.papers.length} {stage.papers.length === 1 ? 'Paper' : 'Papers'}</span>
                        <span className="text-slate-500">{stage.total_marks > 0 ? `${stage.total_marks} Marks` : 'Qualifying'}</span>
                      </div>
                      {isStageActive ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Stage Papers List */}
                  {isStageActive && (
                    <div className="divide-y divide-slate-100 p-2 sm:p-3 space-y-2">
                      {stage.papers.map((paper) => (
                        <div
                          key={paper.paper_id}
                          className="p-3.5 rounded-lg border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-slate-800 text-white font-mono">
                                {paper.paper_number}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                paper.type === 'OBJECTIVE'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : paper.type === 'DESCRIPTIVE'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {paper.type}
                              </span>
                              {paper.is_qualifying && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                  Qualifying
                                </span>
                              )}
                            </div>

                            <h5 className="font-bold text-slate-900 text-sm">{paper.title}</h5>

                            {/* Metrics pill */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                              {paper.total_questions !== undefined && (
                                <span className="flex items-center gap-1 font-medium">
                                  <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>{paper.total_questions} Questions</span>
                                </span>
                              )}
                              <span className="flex items-center gap-1 font-medium">
                                <Award className="w-3.5 h-3.5 text-amber-500" />
                                <span>{paper.total_marks} Marks</span>
                              </span>
                              {paper.duration_minutes !== undefined && (
                                <span className="flex items-center gap-1 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                                  <span>{paper.duration_minutes} Mins ({paper.duration_minutes / 60} hrs)</span>
                                </span>
                              )}
                              {paper.negative_marking_rate !== undefined && (
                                <span className="flex items-center gap-1 font-medium text-rose-700">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                  <span>-{paper.negative_marking_rate} Penalty</span>
                                </span>
                              )}
                              {paper.language_mediums && (
                                <span className="text-[11px] text-slate-400">
                                  Medium: {paper.language_mediums.join(', ')}
                                </span>
                              )}
                            </div>

                            {/* Sections list toggle */}
                            {paper.sections && paper.sections.length > 0 && (
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleSection(paper.paper_id)}
                                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{expandedSections[paper.paper_id] ? 'Hide syllabus sections' : `View ${paper.sections.length} curriculum sections`}</span>
                                  <ChevronDown className={`w-3 h-3 transition-transform ${expandedSections[paper.paper_id] ? 'rotate-180' : ''}`} />
                                </button>

                                {expandedSections[paper.paper_id] && (
                                  <ul className="mt-2 space-y-1 pl-3 border-l-2 border-indigo-200 text-xs text-slate-600 animate-in fade-in">
                                    {paper.sections.map((sec, sidx) => (
                                      <li key={sidx} className="leading-relaxed">
                                        • {sec}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 1-Click Action Buttons for this Paper */}
                          <div className="flex flex-row lg:flex-col gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                            {onSelectPaperForResearch && (
                              <button
                                type="button"
                                onClick={() => onSelectPaperForResearch(
                                  `${structure.exam_name}: ${paper.paper_number} (${paper.title})`,
                                  stage.stage_name
                                )}
                                className="flex-1 lg:flex-none px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                                <span>Research Paper</span>
                              </button>
                            )}

                            {onSelectPaperForIntake && (
                              <button
                                type="button"
                                onClick={() => onSelectPaperForIntake(paper, stage, structure)}
                                className="flex-1 lg:flex-none px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Register Intake</span>
                              </button>
                            )}

                            {onSelectPaperForMocks && (
                              <button
                                type="button"
                                onClick={() => onSelectPaperForMocks(paper.title)}
                                className="flex-1 lg:flex-none px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium border border-slate-200 inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              >
                                <BookOpen className="w-3 h-3 text-slate-400" />
                                <span>Mocks / Blueprint</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
