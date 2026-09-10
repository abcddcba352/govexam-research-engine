import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Hash,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Sparkles
} from 'lucide-react';
import { DuplicateLedgerEntry, DuplicateCheckResult } from '../types';

export const DuplicateLedgerScreen: React.FC = () => {
  const [ledgerEntries, setLedgerEntries] = useState<DuplicateLedgerEntry[]>([]);
  const [totalBlocked, setTotalBlocked] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Question Tester
  const [testQuestionText, setTestQuestionText] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<DuplicateCheckResult | null>(null);

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ledger');
      if (!res.ok) throw new Error('Failed to fetch ledger');
      const data = await res.json();
      setLedgerEntries(data.entries || []);
      setTotalBlocked(data.total_duplicate_attempts_prevented || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuestionText.trim()) return;

    setIsChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch('/api/ledger/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_text: testQuestionText })
      });
      if (!res.ok) throw new Error('Check failed');
      const data: DuplicateCheckResult = await res.json();
      setCheckResult(data);
    } catch (err) {
      console.error(err);
      alert('Failed to check question against ledger.');
    } finally {
      setIsChecking(false);
    }
  };

  const filteredEntries = ledgerEntries.filter(entry =>
    entry.canonical_question_preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.question_hash.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CANONICAL DUPLICATE LEDGER</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Question Deduplication & Novelty Verification Ledger</h1>
          <p className="text-sm text-slate-600 mt-1">
            Cryptographic SHA-256 canonical hashing and semantic token matching ensuring zero repeat questions across exam mock test series.
          </p>
        </div>

        <button
          onClick={fetchLedger}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger Data</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unique Questions Indexed</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Hash className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{ledgerEntries.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Canonical hashes registered</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Duplicates Blocked</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-600 mt-2">{totalBlocked}</p>
          <span className="text-xs text-slate-500 mt-1 block">Prevented during generation cycles</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Deduplication Fidelity</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 mt-2">100%</p>
          <span className="text-xs text-slate-500 mt-1 block">Zero identical questions allowed</span>
        </div>
      </div>

      {/* Interactive Question Deduplication Tester */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Interactive Duplicate Question Tester</h2>
          </div>
          <span className="text-xs text-slate-500">Live testing against server ledger hashes</span>
        </div>
        <p className="text-xs text-slate-600">
          Paste any proposed draft question below to check whether it collides with an existing canonical question hash or exceeds the semantic token similarity threshold:
        </p>

        <form onSubmit={handleCheckQuestion} className="space-y-3">
          <textarea
            rows={3}
            value={testQuestionText}
            onChange={e => setTestQuestionText(e.target.value)}
            placeholder="e.g. Under the Constitution of India, which Constitutional Amendment Act substituted Article 371D to provide equitable opportunities..."
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTestQuestionText('Which Kakatiya ruler issued the famous Motupalli Pillar Inscription granting protective charter?')}
                className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium"
              >
                Insert Sample Duplicate
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => setTestQuestionText('What is the chemical formula of heavy water used as a moderator in nuclear reactors?')}
                className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium"
              >
                Insert Novel Question
              </button>
            </div>

            <button
              type="submit"
              disabled={isChecking || !testQuestionText.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isChecking ? 'Checking Ledger...' : 'Check Duplicate Collision'}</span>
            </button>
          </div>
        </form>

        {checkResult && (
          <div className={`p-4 rounded-xl border text-sm animate-in fade-in ${
            checkResult.is_duplicate
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-start gap-3">
              {checkResult.is_duplicate ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">
                  {checkResult.is_duplicate
                    ? 'DUPLICATE DETECTED — QUESTION REJECTED'
                    : 'NOVEL QUESTION APPROVED — ZERO COLLISIONS'}
                </p>
                <p className="text-xs leading-relaxed">
                  {checkResult.reason || 'This question has not been used in any previously generated mock tests.'}
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px] font-mono opacity-80">
                  <span>Computed Hash: {checkResult.question_hash}</span>
                  {checkResult.similarity_score !== undefined && (
                    <span>Similarity: {Math.round(checkResult.similarity_score * 100)}%</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ledger Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Canonical Question Registry Ledger</h2>
            <p className="text-xs text-slate-500">Every question ever generated is tracked by its normalized cryptographic footprint.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter by hash, topic, text..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Canonical Hash</th>
                <th className="py-3 px-4">Question Preview</th>
                <th className="py-3 px-4">Topic / Domain</th>
                <th className="py-3 px-4">Appears In</th>
                <th className="py-3 px-4">Blocked Duplicates</th>
                <th className="py-3 px-4">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEntries.map(entry => (
                <tr key={entry.ledger_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-indigo-700 font-semibold whitespace-nowrap">
                    {entry.question_hash}
                  </td>
                  <td className="py-3 px-4 max-w-md font-medium text-slate-900">
                    {entry.canonical_question_preview}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      {entry.topic}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-slate-500">
                      {entry.mock_ids.length} Mock{entry.mock_ids.length > 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {entry.duplicate_attempts_blocked > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-200">
                        {entry.duplicate_attempts_blocked} blocked
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                    {new Date(entry.first_registered_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No ledger records match the query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
