# Automatic source collection

Cloud research is now configured on the existing staging Worker. See [Cloud subject research](CLOUD-SUBJECT-RESEARCH.md) for the syllabus dashboard, source coverage and schedule. The local commands below are optional; your computer does not need to stay on for the cloud schedule.

The Current Affairs Desk now has **Find Relevant Current Affairs**. Select a registered paper and a preparation cutoff; no PDFs or pasted article links are required.

The collector checks PIB's English RSS feed, ISRO's press-release index, and RBI's press-release index. It discovers links, reads up to ten articles per run, checks publication dates, matches the selected syllabus, deduplicates identical content, and saves relevant source text. Each publisher's outcome is displayed, including empty feeds and blocked requests. It makes no model or paid search calls.

## Run automatically on this computer

With the existing database configuration in `.env`, run:

```powershell
cd D:\govexam-research-engine
npm run research:auto
```

This collects for registered exams immediately and repeats every six hours while the process runs. Stop with Ctrl+C. The computer must stay on. It does not install a Windows service, schedule an assistant reminder, or enable a Cloudflare cron job.

For a hidden background process on Windows:

```powershell
.\scripts\research-worker.ps1 start
.\scripts\research-worker.ps1 status
.\scripts\research-worker.ps1 stop
```

The controller checks the exact project worker path before starting or stopping a process. Logs go to timestamped files under `work`. It does not restart automatically after a computer reboot.

For one cycle or a selected paper:

```powershell
npm run research:once
npm run research:once -- --exam=ssc_cgl_tier_1
```

Optional settings: `AUTO_RESEARCH_INTERVAL_HOURS=6` (1–168 hours); `--cutoff=YYYY-MM-DD` for a historical cutoff. The latest feed is not a historical archive: an old cutoff can legitimately return no eligible articles.

Publisher links are reused for 15 minutes within a process; recently retrieved articles can be reused for six hours. Saved content is versioned by hash, so corrections do not overwrite older evidence. Retry and concurrent inserts use stable source IDs. Publisher failures are reported; source discovery does not imply complete coverage of a syllabus or a state.

## What this does and does not establish

This builds a source-backed knowledge library. It does not train model weights. Priority scores are editorial heuristics, not predictions of future exam questions. An RSS publication date is only a discovery hint: article dates must be supported by the article itself. Event dates, planned events, answer correctness and paper suitability still need checking. Automatically saved articles remain UNVERIFIED and do not grant mock readiness.

Specific syllabus subtopics require their own matching terms; a generic subject word cannot verify a specialized topic. Recurring RBI auction notices receive a lower editorial priority. Saved articles are reranked when the selected cutoff changes; older unmatched evidence stays visible with zero priority for review. The initial automatic publishers cover national current affairs, not every state, subject, exam notification or previous paper.

The existing mock generator still uses its configured AI provider. This collector does not remove that provider requirement or claim free unlimited question generation. The next separate capability would be a locally configured language model for drafting from the saved evidence, followed by independent answer verification and a reviewed question bank. No model has been installed or trained by this change.

Generic placeholder replacements, fabricated source lineage, and automatic PASS audits were removed from the current mock-generation path. Missing evidence or exhausted validation retries now fail the generation attempt. Your administrative paper views and exports remain in place.

## Validation

```powershell
npm run lint
node --import tsx --test server/tests/autonomousResearch.test.ts server/tests/currentAffairs.test.ts server/tests/paper2Workflow.test.ts server/tests/retrieval.test.ts
npm run build
npx wrangler deploy --dry-run
```

`server/tests/autonomousLiveProbe.ts` performs a read-only publisher check and writes a compact report to `work/autonomous-research-live.json`. The web endpoint is `POST /api/current-affairs/discover` with `exam_id` and `cutoff_date`; successful responses are sent only after database writes complete.
