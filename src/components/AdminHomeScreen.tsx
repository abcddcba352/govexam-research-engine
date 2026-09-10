import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, BookOpen, CheckCircle2, Cloud, Database, FileCheck2, Search, ShieldAlert } from 'lucide-react';
import type { ExamRecord } from '../types.ts';
import { GroupedExamSelect } from './common/GroupedExamSelect.tsx';

type AdminDestination = 'INTAKE' | 'STUDIO' | 'COVERAGE' | 'PYQ' | 'BLUEPRINT' | 'MOCKS' | 'SOURCES' | 'LOGS';

interface AdminHomeScreenProps {
  exams: ExamRecord[];
  runs: any[];
  onNavigate: (destination: AdminDestination) => void;
}

export function AdminHomeScreen({ exams, runs, onNavigate }: AdminHomeScreenProps) {
  const [selectedExamId, setSelectedExamId] = useState('');
  const [coverage, setCoverage] = useState<any>();
  const [schedule, setSchedule] = useState<any>();
  const [health, setHealth] = useState<'loading' | 'ok' | 'error'>('loading');

  const defaultExam = useMemo(
    () => exams.find(exam => exam.exam_id.includes('endowment')) || exams[0],
    [exams],
  );

  useEffect(() => {
    if (!selectedExamId && defaultExam) setSelectedExamId(defaultExam.exam_id);
  }, [defaultExam, selectedExamId]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch('/api/health', { signal: controller.signal }).then(response => {
        setHealth(response.ok ? 'ok' : 'error');
      }),
      fetch('/api/research/schedule', { signal: controller.signal }).then(response => response.ok ? response.json() : null).then(setSchedule),
    ]).catch(error => {
      if (error.name !== 'AbortError') setHealth('error');
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedExamId) {
      setCoverage(undefined);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/research/coverage/${encodeURIComponent(selectedExamId)}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(setCoverage)
      .catch(error => { if (error.name !== 'AbortError') setCoverage(undefined); });
    return () => controller.abort();
  }, [selectedExamId]);

  const missingSubjects = coverage?.subjects?.filter((subject: any) => subject.status === 'MISSING_EVIDENCE').length ?? 0;
  const reviewSources = coverage?.evidence_count ?? coverage?.subjects?.reduce((total: number, subject: any) => total + Number(subject.evidence_count || 0), 0) ?? 0;
  const subjectsPendingReview = coverage?.subjects?.filter((subject: any) => subject.status !== 'VERIFIED').length ?? 0;
  const readiness = selectedExamId ? exams.find(exam => exam.exam_id === selectedExamId) : undefined;
  const paperReady = Boolean(readiness?.exam_profile_status === 'VERIFIED' && coverage?.subjects?.length && subjectsPendingReview === 0);

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Admin home</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">What needs attention?</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Choose an examination, collect official evidence, and review gaps before preparing a paper.</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Activity className={`h-4 w-4 ${health === 'ok' ? 'text-emerald-600' : health === 'error' ? 'text-rose-600' : 'text-slate-400'}`} />
            {health === 'ok' ? 'Staging is healthy' : health === 'error' ? 'Staging needs attention' : 'Checking staging…'}
          </div>
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-800">
          Current examination
          <GroupedExamSelect
            ariaLabel="Admin home examination"
            value={selectedExamId}
            onChange={setSelectedExamId}
            exams={exams}
            placeholder="Select an examination"
            showPaper={false}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm font-normal"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Database className="h-4 w-4" />} label="Sources to review" value={reviewSources} tone="indigo" />
        <MetricCard icon={<ShieldAlert className="h-4 w-4" />} label="Subjects without evidence" value={missingSubjects} tone={missingSubjects ? 'amber' : 'emerald'} />
        <MetricCard icon={<Cloud className="h-4 w-4" />} label="Cloud collector" value={schedule?.configured ? 'Every 10 min' : 'Unavailable'} tone={schedule?.configured ? 'emerald' : 'rose'} />
        <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Paper readiness" value={paperReady ? 'Ready to prepare' : readiness?.exam_profile_status === 'VERIFIED' ? 'Evidence review' : 'Profile incomplete'} tone={paperReady ? 'emerald' : 'amber'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <h3 className="font-bold text-slate-900">Recommended next step</h3>
          <p className="mt-2 text-sm text-slate-600">
            {missingSubjects > 0 ? `Collect and review sources for ${missingSubjects} remaining subject${missingSubjects === 1 ? '' : 's'}.` : 'Review retrieved evidence and confirm dates before paper preparation.'}
          </p>
          <button type="button" onClick={() => onNavigate('COVERAGE')} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            Open syllabus coverage <ArrowRight className="h-4 w-4" />
          </button>
          {schedule?.state?.last_error && <p className="mt-3 text-xs text-amber-700">The last cloud collection could not fetch one source. It will retry automatically.</p>}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <h3 className="font-bold text-slate-900">Quick actions</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <QuickAction icon={<FileCheck2 className="h-4 w-4" />} label="Add or select exam" onClick={() => onNavigate('INTAKE')} />
            <QuickAction icon={<Search className="h-4 w-4" />} label="Research official sources" onClick={() => onNavigate('STUDIO')} />
            <QuickAction icon={<BookOpen className="h-4 w-4" />} label="Review papers and audit" onClick={() => onNavigate('MOCKS')} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
        <h3 className="font-bold text-slate-900">Admin workflow</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ['1', 'Register the examination', 'Confirm commission, paper, cycle and syllabus.'],
            ['2', 'Collect official evidence', 'Use the coverage screen and review dates and scope.'],
            ['3', 'Prepare only when ready', 'Paper generation stays blocked while required evidence is incomplete.'],
          ].map(([number, title, description]) => <div key={number} className="rounded-xl bg-slate-50 p-4"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{number}</span><h4 className="mt-3 text-sm font-semibold">{title}</h4><p className="mt-1 text-xs leading-5 text-slate-600">{description}</p></div>)}
        </div>
        <p className="mt-4 text-xs text-slate-500">Research runs recorded: {runs.length}. Retrieved sources remain unverified until reviewed.</p>
      </div>
    </section>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone: 'indigo' | 'amber' | 'emerald' | 'rose' }) {
  const colors = { indigo: 'bg-indigo-50 text-indigo-700', amber: 'bg-amber-50 text-amber-700', emerald: 'bg-emerald-50 text-emerald-700', rose: 'bg-rose-50 text-rose-700' };
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"><div className={`inline-flex rounded-lg p-2 ${colors[tone]}`}>{icon}</div><p className="mt-3 text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}</p></div>;
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"><span className="text-indigo-600">{icon}</span>{label}<ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-400" /></button>;
}
