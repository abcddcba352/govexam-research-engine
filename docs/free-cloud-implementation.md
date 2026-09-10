# Free cloud engine implementation — 10 September 2026

Staging: https://govexam-staging.govexam-staging.workers.dev/

Deployed Worker version: `adc2a9bf-0d80-4143-b1bd-61b6a05b9c2d`.

## Implemented

- Scheduled source collection and persistent question jobs run on Cloudflare, without a running personal computer. The existing ten-minute schedule processes bounded work.
- A SQLite Durable Object stores fact reviews, question candidates, paper requests, usage reservations and retry checkpoints. Supabase remains the exam/source/paper repository.
- Workers AI uses hosted Gemma with a conservative 6,000-neuron daily application reservation cap. Failed calls retain their reservation. There is no paid/Gemini fallback in cloud mode. This cap is an estimate, not an account-wide billing guarantee; other applications share Cloudflare's allowance.
- Existing article collections and subject evidence now feed the same question workflow. Source snapshots are hashed. Changed evidence, wrong states and unsuitable dates invalidate eligibility.
- Added readable Telangana Today, New Indian Express Telangana/AP and two OpenStax chapter adapters. Existing sports, scheme, science, economics and international publishers remain available. Broad current-affairs section names now include sports, schemes, awards and reports in discovery.
- Secondary reporting requires matching excerpts from two independent publisher domains and a human fact review. Identical copied reports do not count as independent evidence.
- Admins can request subject/topic papers or use a locked full-paper blueprint. Question candidates need independent answer selection and review notes before assembly. Missing evidence stays a visible gap. Previous-paper aggregate statistics are references, not current notification rules.
- Three basic numerical templates cover percentages, simple interest and linear equations at EASY difficulty. They still require review. Other subjects need reviewed source facts and hosted drafting.
- Visual questions use a structured, print-safe grayscale renderer. It supports bar/line charts, right triangles, circle tangents, two-set Venn diagrams and inclined manometers. Values, labels and units must be stated in the question; the renderer never invents sample data or puts the calculated answer in the figure. A required or inconsistent figure blocks approval until a reviewer checks it.
- Assembly requires all selected slots, appropriate difficulty/concept, reviewed questions and duplicate checks. Persistent reservations make uncertain database-write retries stable. Assembled papers still need paper-level audit; nothing automatically receives Auditor Sign-Off.
- Existing master paper views, filtering, printing and exports are retained. Subject paper print metrics use the paper's own duration/marks. A shortcut opens the new question bank from Master Papers & Audit.

## Admin workflow

1. Open **Syllabus Coverage**, then select the examination and cutoff date.
2. Inspect coverage and collect a source where needed. Review the actual article/chapter and its date.
3. Under **Question bank & paper builder**, select a subject/topic. Open **Review a supporting fact**, provide the exact excerpt, supported answer, reviewer and an independent second source when required.
4. Queue a subject/topic request, or select a verified locked full-paper blueprint. Incomplete exam verification blocks the request. The cloud scheduler drafts small batches and pauses for evidence, review or quota.
5. Independently check candidates and record answer/review notes. Assemble only when the request is ready. Inspect the resulting paper in **Master Papers & Audit**.

Subject practice explicitly uses one mark/minute per question and zero penalty; those defaults do not assert the official examination scheme. Full papers use their locked blueprint.

## Verification performed

- TypeScript check and production build pass. Wrangler deployment builds without the previous native canvas `.node` loader error.
- 66 targeted automated tests passed across free-engine, current-affairs, subject-research, autonomous-research and quota-fallback suites (64 original checks plus two new regression checks). The directly affected free-engine and subject-research suites were rerun after the final source-matching change: 27 passed.
- Live staging overview and coverage endpoints return successfully. Durable Object persistence and the 6,000 reservation cap are configured.
- Hosted Gemma answered the connection test on staging at 08:28 UTC. An initial 32-token test returned no readable answer; using the documented completion-token limit with a 256-token allowance resolved it. The test generated only a connection response, not a question.
- Live Cloudflare collection saved a dated New Indian Express Telangana article and an OpenStax biology chapter in Supabase with `REVIEW_REQUIRED` and zero model calls. Local read-only probes also extracted Telangana Today, New Indian Express AP and OpenStax percentage material.
- Browser checks showed the question-bank controls, coverage gaps and disabled queue button for the unverified Telangana Police record. No review/sign-off was submitted.
- Staging retained seven existing papers and zero papers from the new bank during these checks. No new live mock or candidate was generated. The positive assembly/retry test used isolated synthetic fixtures only.

## Limits and remaining work

This is a bounded, review-assisted cloud engine, not a fully trained autonomous examination expert. A functioning collector is not comprehensive subject coverage or verified answers. There are still gaps in static subjects, specialist curricula, some state sources, and exact chapter mappings. Extend adapters and independently reviewed facts to fill the actual blueprint slots before generating a live paper.

Existing exam readiness flags were not recertified by this deployment. In particular, the Telangana Police 2026 record remains blocked; historical notifications must not silently establish 2026 rules. No current-cycle negative-marking claim was approved.

The evidence working set considers the latest 200 records and up to 500 bank entries per exam. Expansion needs retention/pagination and free-tier storage monitoring. Small scheduled jobs trade throughput for bounded resource usage. Difficulty labels and editorial priority are estimates, not measured question difficulty or predictions of the commission's paper.

Full live question drafting, review, assembly and print/export validation remain pending a sufficiently reviewed pilot corpus and exam/blueprint verification. See [the design plan](./free-cloud-mock-plan.md) for the remaining acceptance criteria.
