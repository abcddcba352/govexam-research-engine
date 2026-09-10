import React,{useEffect,useState} from 'react';
import type { ExamRecord } from '../types.ts';
import type { ResearchEvidence } from '../researchCoverage.ts';

export function ResearchCoverageDesk({exams}:{exams:ExamRecord[]}) {
  const [examId,setExamId]=useState('');const [cutoff,setCutoff]=useState(new Date().toISOString().slice(0,10));
  const [data,setData]=useState<any>();const [schedule,setSchedule]=useState<any>();const [error,setError]=useState('');
  const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    fetch('/api/research/schedule',{signal:controller.signal}).then(r=>r.ok?r.json():null).then(setSchedule).catch(()=>setSchedule(null));
    if(!examId){setData(undefined);return ()=>controller.abort();}
    setError('');setData(undefined);
    fetch(`/api/research/coverage/${encodeURIComponent(examId)}?cutoff_date=${encodeURIComponent(cutoff)}`,{signal:controller.signal})
      .then(async r=>{const body=await r.json();if(!r.ok) throw Error(body.error||'Coverage could not load.');return body;})
      .then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
    return ()=>controller.abort();
  },[examId,cutoff,revision]);
  async function collect(publisherId:string) {
    setBusy(true);setError('');setNotice('');
    try {
      const response=await fetch('/api/research/collect-subject',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({exam_id:examId,publisher_id:publisherId,cutoff_date:cutoff})});
      const result=await response.json();if(!response.ok)throw Error(result.error||'Collection failed.');
      setNotice(result.message||`${result.saved} new source saved. Evidence requires review; no AI calls were made.`);
      setRevision(v=>v+1);
    }catch(e:any){setError(e.message);}finally{setBusy(false);}
  }
  const date=(value?:string)=>value?new Date(value).toLocaleString():'No completed run yet';
  return <section className="space-y-5">
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-2xl font-bold text-slate-900">Syllabus Coverage & Research</h2>
      <p className="mt-2 text-sm text-slate-600">Track every registered subject and topic. Collected sources are research material; answer verification and paper readiness are assessed separately.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium">Examination and paper<select aria-label="Coverage examination" disabled={busy} value={examId} onChange={e=>{setExamId(e.target.value);setNotice('');}} className="mt-1 block w-full rounded-lg border p-2"><option value="">Select a paper</option>{exams.map(e=><option key={e.exam_id} value={e.exam_id}>{e.title} — {e.paper}</option>)}</select></label>
        <label className="text-sm font-medium">Preparation cutoff<input aria-label="Coverage cutoff" disabled={busy} type="date" max={new Date().toISOString().slice(0,10)} value={cutoff} onChange={e=>setCutoff(e.target.value)} className="mt-1 block rounded-lg border p-2"/></label>
      </div>
    </div>
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 text-sm">
      <h3 className="font-semibold">Cloud research schedule</h3>
      <p className="mt-1">{schedule?.configured?'Configured on Cloudflare: one small task every 10 minutes. Your computer can stay off.':'Cloud schedule status is unavailable.'}</p>
      <p className="mt-2">Last successful task: {date(schedule?.state?.last_success_at)} · Pending articles: {schedule?.state?.pending?.length??0}</p>
      {schedule?.state?.last_action&&<p>{schedule.state.last_action}</p>}
      {schedule?.state?.last_error&&<p className="mt-2 text-amber-800">Last task needs attention: {schedule.state.last_error}</p>}
      <button onClick={()=>setRevision(v=>v+1)} disabled={busy} className="mt-3 font-semibold text-indigo-700 underline">Refresh coverage and schedule</button>
    </div>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice&&<p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {data&&<>
      <div className="grid gap-3 sm:grid-cols-3">{[['Sources to review',data.evidence_count],['Topics without evidence',data.topics_without_evidence],['Question verification','Not assessed']].map(([label,value])=><div key={label} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div>
      <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><caption className="p-4 text-left font-bold">Subject coverage</caption><thead className="bg-slate-50"><tr>{['Subject','Retrieved sources','Missing dates','Remaining work'].map(h=><th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody>{data.subjects.map((s:any)=><tr key={s.id} className="border-t"><td className="px-4 py-3 font-medium">{s.name}</td><td className="px-4 py-3">{s.evidence_count}</td><td className="px-4 py-3">{s.missing_dates}</td><td className="px-4 py-3 text-amber-700">{s.evidence_count?'Verify relevance, dates and claims':'Collect supporting evidence'}</td></tr>)}</tbody></table></div>
      <details className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">All {data.topics.length} registered sections and topics</summary><ul className="mt-3 divide-y">{data.topics.map((t:any)=><li key={t.topic} className="py-3 text-sm"><strong>{t.topic}</strong><p>{t.evidence_count} possible sources · {t.match_level==='BROAD_SECTION'?'Broad section matches only':'Topic matches need review'}</p></li>)}</ul></details>
      <div className="rounded-xl border bg-white p-5"><h3 className="font-bold">Subject sources and collection gaps</h3><p className="mt-1 text-xs text-slate-500">Each button reads at most one new article. A working source covers only its stated area.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{data.publishers.map((p:any)=><div key={p.id} className="rounded-lg border p-4"><a href={p.url} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 underline">{p.name}</a><p className="mt-1 text-sm">{p.note}</p><p className="mt-2 text-xs text-slate-500">{p.mode==='UNAVAILABLE'?'Collector not available':`Refresh target: ${p.refresh_hours} hours`}</p>{schedule?.state?.publishers?.[p.id]&&<p className="mt-1 text-xs">{schedule.state.publishers[p.id].status}: {schedule.state.publishers[p.id].detail}</p>}<button disabled={busy||p.mode==='UNAVAILABLE'} onClick={()=>collect(p.id)} className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-40">{busy?'Collecting…':'Collect one source'}</button></div>)}</div><p className="mt-4 text-sm text-amber-800">Subjects without supporting evidence remain gaps. Mathematics/reasoning need validated problem generators; state studies and specialist subjects require more coverage than these initial references.</p></div>
      <details className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">Inspect collected evidence ({data.evidence.length})</summary><div className="mt-4 space-y-4">{data.evidence.map((e:ResearchEvidence)=><article key={e.content_hash} className="rounded-lg border p-4"><a href={e.url} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 underline">{e.title}</a><p className="mt-2 text-xs text-slate-500">{e.subjects.join(', ')} · {e.kind} · Published: {e.publication_date||'Unknown — review required'} · Retrieved: {date(e.retrieved_at)}</p><details className="mt-3 text-sm"><summary className="cursor-pointer">Source text — unverified</summary><p className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap">{e.text}</p></details></article>)}</div></details>
    </>}
  </section>;
}
