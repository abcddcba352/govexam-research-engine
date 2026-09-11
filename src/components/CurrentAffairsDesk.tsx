import React, { useEffect, useState, useMemo } from 'react';
import type { ExamRecord, ExamStage, ExamStagePaper } from '../types.ts';
import type { CollectedArticle } from '../currentAffairs.ts';
import { ExamHierarchyFilter } from './common/ExamHierarchyFilter.tsx';

export function CurrentAffairsDesk({ exams }: { exams: ExamRecord[] }) {
  const [examId, setExamId] = useState(exams.length > 0 ? exams[0].exam_id : '');
  const [, setActiveStage] = useState<ExamStage | null>(null);
  const [, setActivePaper] = useState<ExamStagePaper | null>(null);
  const [urls, setUrls] = useState('');
  const [cutoff, setCutoff] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [articles, setArticles] = useState<CollectedArticle[]>([]);

  const [failures, setFailures] = useState<{ url: string; reason: string }[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState('');
  const [diagnostics, setDiagnostics] = useState<Array<{ publisher: string; status: string; detail: string }>>([]);

  useEffect(() => {
    if (!examId && exams.length > 0) {
      setExamId(exams[0].exam_id);
    }
  }, [exams, examId]);

  useEffect(() => {
    if (!examId) return;
    const controller = new AbortController();
    setArticles([]);
    setFailures([]);
    setError('');
    setSummary('');
    setDiagnostics([]);
    fetch('/api/current-affairs/' + encodeURIComponent(examId) + '?cutoff_date=' + encodeURIComponent(cutoff), { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Saved source collection could not load.');
        return response.json();
      })
      .then(data => setArticles(data.articles || []))
      .catch(error => {
        if (error.name !== 'AbortError') setError(error.message);
      });
    return () => controller.abort();
  }, [examId, cutoff]);

  async function collect(automatic = false) {
    setBusy(true);
    setError('');
    setFailures([]);
    setSummary('');
    setDiagnostics([]);
    try {
      const response = await fetch('/api/current-affairs/' + (automatic ? 'discover' : 'collect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: examId,
          cutoff_date: cutoff,
          urls: urls.split('\n').map(s => s.trim()).filter(Boolean)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Collection failed.');
      setArticles(data.articles);
      setFailures(data.failures);
      if (automatic) {
        setDiagnostics(data.diagnostics || []);
        setSummary(`${data.candidates_found} links discovered · ${data.articles_attempted} articles read · ${data.reused_articles} reused · ${data.articles.length} relevant sources retained · No AI calls`);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  const cutoffControl = (
    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
        Cutoff:
      </label>
      <input
        aria-label="Current affairs cutoff"
        disabled={busy}
        type="date"
        min="2000-01-01"
        max="2099-12-31"
        value={cutoff}
        onChange={e => setCutoff(e.target.value)}
        className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      />

    </div>
  );

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Current Affairs Research Desk</h2>
          <p className="mt-1 text-sm text-slate-600">
            Collect primary articles for the selected paper, inspect their evidence, and decide what deserves further research. Scores show research priority, not a prediction of exam questions.
          </p>
        </div>

        {/* 5-Level Cascading Hierarchy Filter */}
        <ExamHierarchyFilter
          exams={exams}
          selectedExamId={examId}
          onSelectExam={(newId) => setExamId(newId)}
          onPaperChange={(stage, paper) => {
            setActiveStage(stage);
            setActivePaper(paper);
          }}
          disabled={busy}
          title="Current Affairs & Paper Hierarchy Filter"
          subtitle="Filter through State ➔ Board ➔ Exam ➔ Stage ➔ Paper to collect and rank relevant current affairs"
          badgeLabel="Current Affairs Hierarchy"
          extraControls={cutoffControl}
        />

        <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
          <h3 className="font-semibold text-indigo-950">Automatic source discovery</h3>
          <p className="mt-1 text-sm text-slate-700">
            Find articles from PIB, ISRO and RBI, read their full text, and rank them for this paper. No PDF uploads or AI credits needed. Coverage depends on each publisher being available.
          </p>
          <button
            disabled={busy || !examId}
            onClick={() => collect(true)}
            className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Collecting sources…' : 'Find Relevant Current Affairs'}
          </button>
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">Add specific article links (optional)</summary>
          <label className="mt-3 block text-sm font-medium">
            Primary article URLs — one per line, up to ten
            <textarea
              aria-label="Primary article URLs"
              disabled={busy}
              value={urls}
              onChange={e => setUrls(e.target.value)}
              rows={4}
              placeholder="Paste direct article links from PIB, AP government, RBI, ISRO, or supported international institutions."
              className="mt-1 block w-full rounded-lg border border-slate-300 p-3 font-mono text-xs"
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">
            Publication dates and event dates are checked separately. Missing dates, unavailable pages, PDFs needing extraction, and unsupported answers remain unresolved.
          </p>
          <button
            disabled={busy || !examId || !urls.trim()}
            onClick={() => collect()}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Retrieving primary articles…' : 'Collect & Rank Sources'}
          </button>
        </details>

        {summary && <p role="status" className="mt-4 text-sm font-medium text-slate-700">{summary}</p>}
        {!!diagnostics.length && (
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer">Publisher coverage and collection details</summary>
            <ul className="mt-2 space-y-2">
              {diagnostics.map((d, i) => (
                <li key={i}>
                  <strong>{d.publisher}: {d.status}</strong>
                  <p>{d.detail}</p>
                </li>
              ))}
            </ul>
          </details>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      {failures.map(f => (
        <div key={f.url} className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <strong>Unresolved source:</strong> {f.url}
          <p>{f.reason}</p>
        </div>
      ))}

      {articles.map(article => (
        <article key={article.content_hash} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <a href={article.url} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 underline">
              {article.title}
            </a>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
              Research priority {article.priority_score}/100
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Published: {article.publication_date || 'Date missing'} · Retrieved: {article.retrieved_at && !isNaN(new Date(article.retrieved_at).getTime()) ? new Date(article.retrieved_at).toLocaleString() : 'Recent'} · {article.status.replaceAll('_', ' ')}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {article.priority_reasons.map(reason => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold">Inspect retrieved source text</summary>
            <p className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 leading-relaxed">
              {article.text}
            </p>
          </details>
        </article>
      ))}

      {!busy && !articles.length && !error && (
        <p className="text-sm text-slate-500">
          No collected articles to show. Existing paper views and exports remain available in Master Papers & Audit.
        </p>
      )}
    </section>
  );
}
