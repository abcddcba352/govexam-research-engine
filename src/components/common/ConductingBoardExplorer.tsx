import React, { useMemo } from 'react';
import {
  Building2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Search,
  Sparkles,
  BookOpen,
  MapPin,
  PlusCircle,
  Info
} from 'lucide-react';
import type { ExamRecord } from '../../types.ts';
import {
  ConductingBoardInfo,
  CENTRAL_CONDUCTING_BOARDS,
  INDIAN_STATES,
  JurisdictionTier,
  getBoardsForState,
  getCentralBoards
} from '../../utils/examJurisdiction.ts';

interface ConductingBoardExplorerProps {
  exams: ExamRecord[];
  jurisdictionTier: JurisdictionTier;
  onJurisdictionChange: (tier: JurisdictionTier) => void;
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onSelectExam: (examTitle: string, matchedDbExam?: ExamRecord) => void;
  onLaunchResearch?: (query: string, examId?: string) => void;
  onOpenMocks?: (examId: string) => void;
}

export const ConductingBoardExplorer: React.FC<ConductingBoardExplorerProps> = ({
  exams,
  jurisdictionTier,
  onJurisdictionChange,
  selectedState,
  onStateChange,
  selectedBoardId,
  onSelectBoard,
  onSelectExam,
  onLaunchResearch,
  onOpenMocks,
}) => {
  // 1. Boards for current tier
  const activeBoards = useMemo(() => {
    if (jurisdictionTier === 'CENTRAL') {
      return getCentralBoards();
    }
    return getBoardsForState(selectedState);
  }, [jurisdictionTier, selectedState]);

  // If no board is selected or selected board is not in active list, default to first
  const currentBoard = useMemo(() => {
    const found = activeBoards.find(b => b.id === selectedBoardId);
    return found || activeBoards[0] || null;
  }, [activeBoards, selectedBoardId]);

  // Match database exams to active board
  const getBoardDbExams = (board: ConductingBoardInfo) => {
    return exams.filter(e => {
      const comm = (e.commission || '').toLowerCase();
      const title = (e.title || '').toLowerCase();
      const soc = (e.state_or_central || '').toLowerCase();

      if (board.jurisdictionTier === 'CENTRAL') {
        if (board.id === 'ssc') return comm.includes('ssc') || comm.includes('staff selection') || title.includes('ssc ');
        if (board.id === 'rrb') return comm.includes('rrb') || comm.includes('railway') || title.includes('rrb ');
        if (board.id === 'upsc') return comm.includes('upsc') || comm.includes('union public') || title.includes('upsc ');
        if (board.id === 'banking') return comm.includes('ibps') || comm.includes('banking') || comm.includes('sbi') || comm.includes('rbi');
        if (board.id === 'central_institutes') return comm.includes('nta') || title.includes('nit ') || title.includes('central univ');
      } else {
        // State board
        if (board.id === 'tgpsc') return (soc.includes('telangana') || comm.includes('tgpsc')) && (title.includes('tgpsc') || comm.includes('tgpsc') || comm.includes('tspsc'));
        if (board.id === 'tslprb') return (soc.includes('telangana') || comm.includes('tslprb')) && (comm.includes('police') || title.includes('police') || comm.includes('tslprb'));
        if (board.id === 'tg_education') return soc.includes('telangana') && (comm.includes('dsc') || title.includes('dsc') || comm.includes('treirb'));
        if (board.id === 'tg_mhsrb') return soc.includes('telangana') && (comm.includes('mhsrb') || title.includes('mhsrb') || title.includes('nurse'));
        if (board.id === 'tg_nit_warangal') return title.includes('nit warangal') || comm.includes('nit warangal');

        if (board.id === 'appsc') return (soc.includes('andhra') || comm.includes('appsc')) && (title.includes('appsc') || comm.includes('appsc'));
        if (board.id === 'slprb_ap') return (soc.includes('andhra') || comm.includes('slprb')) && (comm.includes('police') || title.includes('police'));

        // Generic state fallback match
        const stateLower = (board.state || '').toLowerCase();
        return soc.includes(stateLower) || comm.includes(stateLower);
      }
      return false;
    });
  };

  const getDbExamForBoardItem = (boardItemTitle: string, boardDbExams: ExamRecord[]) => {
    const norm = boardItemTitle.toLowerCase();
    return boardDbExams.find(dbEx => {
      const dbTitle = dbEx.title.toLowerCase();
      // Look for key phrases like 'group 2', 'aee civil', 'cgl', 'ntpc', etc.
      if (norm.includes('group 2') || norm.includes('group-ii')) return dbTitle.includes('group 2') || dbTitle.includes('group-ii');
      if (norm.includes('group 1') || norm.includes('group-i')) return dbTitle.includes('group 1') || dbTitle.includes('group-i');
      if (norm.includes('aee') || norm.includes('assistant executive engineer')) return dbTitle.includes('aee') || dbTitle.includes('assistant executive');
      if (norm.includes('endowment') || norm.includes('executive officer')) return dbTitle.includes('endowment') || dbTitle.includes('executive officer');
      if (norm.includes('cgl')) return dbTitle.includes('cgl');
      if (norm.includes('chsl')) return dbTitle.includes('chsl');
      if (norm.includes('ntpc')) return dbTitle.includes('ntpc');
      if (norm.includes('civil services')) return dbTitle.includes('civil services');
      if (norm.includes('police') && norm.includes('si')) return dbTitle.includes('si') || dbTitle.includes('sub-inspector');
      return dbTitle.includes(norm) || norm.includes(dbTitle);
    });
  };

  const activeBoardDbExams = currentBoard ? getBoardDbExams(currentBoard) : [];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
      {/* 1. Header & Jurisdiction Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <Building2 className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Recruitment Boards & Commission Branches
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Browse examination branches grouped strictly under their statutory conducting authorities.
          </p>
        </div>

        {/* Central vs State Jurisdiction Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => onJurisdictionChange('CENTRAL')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              jurisdictionTier === 'CENTRAL'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🏛️</span>
            <span>Central / National ({CENTRAL_CONDUCTING_BOARDS.length} Boards)</span>
          </button>

          <button
            type="button"
            onClick={() => onJurisdictionChange('STATE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              jurisdictionTier === 'STATE'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🗺️</span>
            <span>State-Wise Branches</span>
          </button>
        </div>
      </div>

      {/* 2. State Picker (When State-Wise is active) */}
      {jurisdictionTier === 'STATE' && (
        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>Select State:</span>
              <span className="text-slate-500 font-normal">Choose state to load its official conducting boards</span>
            </div>

            {/* State dropdown */}
            <select
              value={selectedState}
              onChange={(e) => onStateChange(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer shadow-2xs"
            >
              {INDIAN_STATES.map(s => (
                <option key={s.code} value={s.name}>
                  {s.name} ({s.shortCommission})
                </option>
              ))}
            </select>
          </div>

          {/* Quick State Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {['Telangana', 'Andhra Pradesh', 'Tamil Nadu', 'Karnataka', 'Uttar Pradesh', 'Bihar', 'Maharashtra', 'Rajasthan'].map(stName => {
              const isSelected = selectedState === stName;
              return (
                <button
                  key={stName}
                  type="button"
                  onClick={() => onStateChange(stName)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {stName === 'Telangana' && '🟣 '}
                  {stName === 'Andhra Pradesh' && '🟢 '}
                  {stName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Conducting Boards Shelf (Cards for each board) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <span>Official Examination Boards</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px]">
              {activeBoards.length} {jurisdictionTier === 'STATE' ? `in ${selectedState}` : 'Central Bodies'}
            </span>
          </span>
          <span className="text-[11px] text-slate-500">
            Click any board to view its examination branch
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeBoards.map((board) => {
            const isSelected = currentBoard?.id === board.id;
            const dbExams = getBoardDbExams(board);
            const dbCount = dbExams.length;

            return (
              <button
                key={board.id}
                type="button"
                onClick={() => onSelectBoard(board.id)}
                className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xl" role="img" aria-label={board.name}>
                      {board.icon}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {dbCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {dbCount} in DB
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                        {board.exams.length} exams
                      </span>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {board.shortName}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                    {board.name}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-600 flex items-center gap-1 text-[10px]">
                    {board.category === 'PSC' && '🏛️ Public Service'}
                    {board.category === 'POLICE' && '👮 Police Board'}
                    {board.category === 'TEACHER' && '🎓 Education Board'}
                    {board.category === 'HEALTH' && '🏥 Health Recruitment'}
                    {board.category === 'TECHNICAL_INSTITUTE' && '🔬 Premier Institute'}
                    {board.category === 'POWER' && '⚡ Power Utilities'}
                    {board.category === 'RAILWAY' && '🚆 Indian Railways'}
                    {board.category === 'CENTRAL' && '🏛️ Central Commission'}
                    {board.category === 'BANKING' && '🏦 Banking Board'}
                  </span>

                  <span className="text-indigo-600 font-bold flex items-center gap-0.5 text-[11px]">
                    <span>Explore</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Board Branch Details & Exams List */}
      {currentBoard && (
        <div className="rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-50/50 to-white p-4 space-y-4">
          {/* Board Info Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                {currentBoard.icon}
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-900">
                    {currentBoard.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold">
                    {currentBoard.shortName}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
                  {currentBoard.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={currentBoard.officialPortal}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 text-xs font-semibold shadow-2xs transition-colors"
              >
                <span>Official Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* List of Exams / Posts under this Board */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Exams & Posts under {currentBoard.shortName} ({currentBoard.exams.length})
              </span>
              <span className="text-[11px] text-slate-500">
                Click any exam to load into Research Engine
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {currentBoard.exams.map((boardExam) => {
                const matchedDbExam = getDbExamForBoardItem(boardExam.title, activeBoardDbExams);
                const isVerified = matchedDbExam?.exam_profile_status === 'VERIFIED';
                const hasBlueprints = Boolean(matchedDbExam);

                return (
                  <div
                    key={boardExam.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 transition-all shadow-2xs flex flex-col justify-between gap-2.5 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                          {boardExam.title}
                        </h5>

                        {matchedDbExam ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            <ShieldCheck className="w-3 h-3" />
                            <span>{isVerified ? 'VERIFIED' : 'DATABASE'}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-medium shrink-0">
                            Available
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 mt-1">
                        <strong className="text-slate-700">Post / Role:</strong> {boardExam.post}
                      </p>

                      {boardExam.paper && (
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          Scheme: {boardExam.paper}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectExam(boardExam.title, matchedDbExam);
                          if (onLaunchResearch) {
                            onLaunchResearch(boardExam.title, matchedDbExam?.exam_id);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        <Search className="w-3 h-3" />
                        <span>Research</span>
                      </button>

                      {matchedDbExam && onOpenMocks && (
                        <button
                          type="button"
                          onClick={() => onOpenMocks(matchedDbExam.exam_id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Audit & Mocks</span>
                        </button>
                      )}

                      {!matchedDbExam && (
                        <span className="text-[10px] text-slate-400 italic">
                          1-click AI research ready
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
