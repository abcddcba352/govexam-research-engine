# Cloud subject research

The existing Cloudflare staging Worker now includes Syllabus Coverage and scheduled research. No local background process is needed. No AI calls are made by this collector, and it does not create questions, mock papers or verification approvals.

## How it runs

A Cloudflare Cron Trigger runs every ten minutes. Each invocation either discovers links for one publisher or retrieves one queued article. Cloudflare KV stores the queue, publisher outcomes, due times and last completed task. Supabase stores each distinct subject evidence text once, with a stable hash-based source ID and UNVERIFIED status. All registered papers can use this shared research library, but coverage is computed against each selected paper's scope.

The scheduler prioritizes subjects with less collected evidence among publishers whose refresh time has elapsed. Each discovery queues at most two articles. Failed article jobs get two attempts, then the failure stays visible in publisher status. Database writes complete before checkpoints advance; retries use the same source ID. References refresh weekly, news sources every 6–24 hours. One scheduler tick does not mean every publisher or subject was refreshed.

The KV checkpoint assumes one scheduled writer. Do not run parallel manual scheduler invocations against the same production namespace. The source upserts are idempotent, but KV is not a transactional queue. Cron changes can take time to propagate. Check the last-run timestamp instead of assuming a configured schedule is working.

## Coverage and collectors

The dashboard lists every registered section and syllabus topic, plus relevant subject groups. It reports missing evidence and missing dates, and distinguishes broad section matches from topic hints. It never equates article counts with syllabus completeness, approved questions or mock readiness. Question verification is shown as **Not assessed**.

Tested subject adapters include ICC cricket news, FIDE chess news, PM India scheme-related announcements and the PM-KISAN description/exclusions. Existing PIB, RBI and ISRO collection is also scheduled. Sports extraction is limited to the connected sports; it is not comprehensive sports coverage. Announcements are research leads, not proof of current scheme eligibility or benefits. PM-KISAN has no reliably identified publication date and remains reference material requiring a version check.

Reference adapters also collect the National Portal's physical geography page, Telangana's formation/profile and Vizianagaram district's profile. These are initial geography/history/state references, not complete subject libraries. State references are filtered by the selected examination's jurisdiction. Undated references remain flagged; census years and administrative boundaries require checking. PM-KISAN timed out from Cloudflare during staging verification despite working locally; PM India scheme announcements were successfully collected from staging.

NCERT, India Code and myScheme are listed with explicit adapter gaps. State-specific, specialist, mathematics and English evidence/generators are not made complete by this release. All their registered topics remain visible. No fabricated questions or automatic PASS audits fill these gaps.

## Operations

- Open **Syllabus Coverage**, choose a paper and cutoff, then inspect subjects, topics, publishers and retrieved text.
- **Collect one source** reads at most one new eligible article from the selected publisher. Manual collection also requires review.
- `GET /api/research/schedule` shows the cloud checkpoint and publisher outcomes.
- `GET /api/research/coverage/:examId?cutoff_date=YYYY-MM-DD` reports the selected paper's evidence coverage.
- To pause cloud research, remove the cron from `wrangler.jsonc` and deploy. Do not delete source evidence or the KV namespace just to pause.
- Cloudflare and database free-plan limits still apply. No paid plan was enabled. Runtime and storage usage should be monitored as the library grows.

Tests: `node --import tsx --test server/tests/subjectResearch.test.ts`. `server/tests/subjectResearchLiveProbe.ts` tests public publishers without database writes. `server/tests/subjectStagingProbe.mjs` verifies staging persistence and unchanged readiness without generating mocks.
