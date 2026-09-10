# GovExam: free cloud research and mock-paper plan

Prepared: 10 September 2026. Status: proposed design based on the current local code; this document does not implement or deploy it.

## Objective and limits

Run with the owner's PC switched off, require no manual PDF uploads, cover every subject in supported exam syllabi, and produce both full papers and subject/topic practice papers. Target zero additional service spend within existing free allowances. This does not mean unlimited processing, guaranteed access to every website, or zero editorial effort.

The core design is: collect once, retain evidence, validate questions, and assemble many papers from the resulting bank. Research should fill measured syllabus gaps instead of repeatedly searching the entire web for each paper. Model training is not required for the first version: retrieve relevant stored evidence and give it to a hosted model when drafting.

## What the code already provides

- `wrangler.jsonc` configures a ten-minute Cron Trigger and a research-state KV binding.
- `server/cloudResearch.ts` runs one discovery or article task per invocation, retains progress, and limits article retries. Its discovery path currently loads all exams and sources; replace this with bounded database queries as the corpus grows.
- `server/subjectPublishers.ts` includes sports, schemes, science, economics, environment, international affairs, and some state references. Several educational, statutory, and history adapters are explicitly unavailable. A registered source is not working coverage.
- `server/subjectResearch.ts` stores `research_evidence`, while the current-affairs branch of `server/mockService.ts` selects `collected_article`. Connect these through one evidence repository and eligibility policy.
- `server/geminiConfig.ts` and production generation depend on Gemini credentials. Cloudflare AI is not configured in the checked Wrangler file.
- Existing blueprint, prior-paper reference, duplicate-ledger, and admin master-paper views provide a foundation to extend.

These are local-code findings, not a claim that every path was tested on staging.

## 1. Define what each exam needs

Maintain a versioned map: exam → cycle → stage → paper → subject → chapter → concept. Store the source of question counts, section requirements, duration, language and marking rules separately from question content.

If a new notification is unavailable, retain the previous cycle as a historical reference and label any practice blueprint provisional. Do not silently carry forward negative marking or another old rule. Available previous papers inform topic frequency, formats and reasoning depth; they do not establish the current notification's rules.

For every concept show required question slots, usable evidence, validated questions and outstanding gaps. Support all relevant subjects in the data model; enable actual generation subject by subject as evidence and question coverage pass checks.

## 2. Collect information without asking the admin for materials

Use a source registry with subject, jurisdiction, language, content type, access method, refresh interval, provenance, reuse terms, last success and health state. Prefer public HTML chapters/articles, documented APIs, RSS/Atom and sitemaps. Search is a fallback to find missing sources. A PDF may be an optional automatic input when a supported parser is available; neither uploads nor heavy PDF processing is a prerequisite for this plan.

| Subject family | Collection and question approach |
| --- | --- |
| Arithmetic, algebra, data interpretation | Reviewed concept/formula library; generate values under constraints; calculate answers and distractors using code. |
| Logical and analytical reasoning | Reviewed problem templates with explicit rules; solve arrangements and constraints to prove a unique answer. |
| English and Telugu | Accessible educational references and reviewed language rules; original passages; language-specific review for ambiguity and translation. |
| History, geography, culture, general science | Accessible textbook chapters, educational institutions, museums and reference articles; map chapter level to the exam syllabus. |
| Polity, law, governance | Versioned statutory and constitutional text; explanatory references for teaching context; amendment and effective-date checks. |
| Economy, banking, statistics | Concepts plus dated releases and reports; preserve units, reference period and revision status. |
| Engineering and specialist subjects | Discipline-specific educational references and reviewed numerical templates; unit and formula checks; diagrams where needed. |
| State affairs | State and district reporting, regional journalism, departments, universities and local event organizers; separate Telangana and Andhra Pradesh entities and language aliases. |
| Sports | Competition organizers and federations plus sports reporting; identify event, year, discipline, gender/category and completed result. |
| Schemes, appointments, awards, reports, environment, international affairs | Departments and issuing organizations together with reliable journalism; distinguish announcements from implementation and scheduled events from completed events. |

OpenStax provides free online textbooks that can supply selected science, mathematics and economics concepts. Map them to the Indian exam level and inspect each resource's license; they do not cover all Indian/state subjects. [OpenStax](https://openstax.org/higher-education), [licensing](https://help.openstax.org/s/article/Licensing-information-of-OpenStax-textbooks).

For regional journalism, evaluate candidate publishers such as The Indian Express and Telugu-language outlets individually. Enable an adapter only after checking accessible content, dates, article extraction, and permitted use. A homepage or search result is not evidence of a specific claim.

Keep DuckDuckGo as an optional discovery path. Durable collection should use known publishers directly; search failure should leave a coverage gap and retry state rather than break the entire paper workflow.

YouTube is an optional lead source for concepts and linked references. Metadata alone does not establish the video's claims. The official caption-download API requires permission to edit the video, so arbitrary coaching-video transcripts cannot be assumed available. [YouTube caption API](https://developers.google.com/youtube/v3/docs/captions/download).

## 3. Store claims with traceable evidence

Use one shared evidence store across exams; associate each fact with multiple syllabus concepts instead of duplicating article text per exam.

Each claim needs: normalized entities, claim text, subject and concept IDs, jurisdiction, language, source URL, publisher, short supporting excerpt, publication date, event/reference date, retrieved date, effective/expiry dates where relevant, content hash, source family, verification status and reviewer history.

Suggested states: discovered → extracted → corroborated → reviewed → eligible; also conflicting, superseded and expired. The model's confidence or a high relevance score cannot advance a claim to verified.

Apply different evidence rules to different claims:

- Current exam structure and legal rules require the applicable authoritative document. Journalism can help discover it.
- Current events can use reliable independent reporting when an issuing organization's site is late. Require agreement on the exact claim and editorial review before use. Two copies of the same wire report count as one source family.
- A first-party result or announcement supports only what that source establishes. It does not automatically validate related statistics or implementation claims.
- Formula questions use reviewed rules and independent computation. Static concepts need appropriate references but do not expire just because the webpage is old.

When a fact changes, create a new version and mark affected unpublished questions for recheck. Preserve the evidence snapshot and cutoff for papers already issued. Show corrections for material errors.

## 4. Select relevant current affairs

First apply eligibility gates: syllabus relevance, supported answer, correct jurisdiction, known dates within the chosen window, no unresolved contradiction, and completed versus planned event status.

Then rank eligible events. A starting editorial score out of 100 is:

- Syllabus match: 35.
- Prior-paper concept relevance: 20.
- State/national scope match: 15.
- Recency within the paper's selected window: 15.
- Significance and connection to a teachable concept: 10.
- Contribution to an undercovered category: 5.

These are proposed tunable weights, not probabilities of an exam question appearing. If prior papers are unavailable, mark the evidence gap and use a documented syllabus-only weighting instead of inventing frequency data.

Apply section/category quotas after ranking. Limit repeated coverage of one event, publisher, district or sport. Do not let a high-volume feed crowd out schemes, state affairs, awards or other syllabus topics. Store publication date separately from event date: a newly posted article about an old event is not automatically a new current affair. For rankings, budgets and awards preserve the edition/reference year.

Use an explicitly selected current-affairs window; do not describe a six- or twelve-month default as an official exam rule. Static-subject ranking should use concept coverage and difficulty instead of recency.

## 5. Build original, reusable questions

Use two generation methods:

1. Numerical/reasoning templates: vary meaningful parameters or constraints, compute the solution, and produce distractors based on common mistakes. Reject impossible or ambiguous variants. Changing numbers alone does not guarantee useful novelty.
2. Evidence-based drafting: retrieve only relevant reviewed claims and chapter excerpts, then ask the hosted model for an original question, answer, explanation and evidence IDs. Treat all returned questions as drafts.

Generate small batches and retain valid questions instead of regenerating the entire paper after one failure. Reserve model work for gaps, language and synthesis. Do not train on previous papers or copy their wording; analyze available papers for patterns and maintain the sample size and cycle provenance.

For technical figures, generate SVG from validated geometry, labels and values. Use the same parameters as the solver. This supports sharp print output without an image-generation charge; complex diagrams require a supported template and review.

Required checks include exactly one defensible correct option, distinct and plausible alternatives, explanation-answer agreement, units, source support, date/cycle consistency, language clarity and appropriate difficulty. Use code for solvable math/logic checks and editorial review for semantic judgments. A second model response is not proof of correctness.

Compare normalized wording, option sets, facts, templates and concept families against the ledger. Exact hashing alone cannot detect paraphrases. Keep related variants tagged so one paper cannot fill with the same underlying problem.

## 6. Assemble full and subject-wise papers

Both modes use the same validated question bank and duplicate ledger.

| Mode | Admin input | Assembly rule |
| --- | --- | --- |
| Full paper | Exam, cycle/stage/paper, cutoff, series | Match the verified blueprint, section counts, duration and applicable marking. |
| Subject paper | Subject, optional chapters, 10/25/50 or custom count, difficulty | Balance selected chapters; explicitly label practice settings. |
| Topic drill | One concept, count and difficulty | Use distinct questions/approaches within that concept. |
| State current-affairs paper | State, date window, count | Cover applicable categories and districts; avoid repeated events. |

Use a constraint-based selector: fill required slots, enforce topic and difficulty distribution, exclude ineligible/used questions, and apply fact/template repetition limits. Aim for several validated candidates per slot. For example, a 150-question paper can initially target a pool of at least 450 appropriately distributed questions; total size alone is insufficient.

Preserve the master-paper view, slot inspector, answer table, filters, JSON/CSV exports and candidate print mode. Do not restore student quiz mechanics. Rotate answer positions only when option wording permits it, and update the key atomically. Exact A/B/C/D balance and equal difficulty thirds are not evidence of quality.

If only 23 of 25 eligible questions exist, show the two missing slots and queue work. Do not insert filler, silently reuse blocked questions or call the paper complete. While verification is incomplete, keep mock generation and Auditor Sign-Off blocked as instructed.

After a question bank and exam blueprint have passed validation, assembling additional papers need not call an AI model. Exhausted AI quota pauses new drafting; it need not prevent serving existing validated papers.

## 7. Stay within the free cloud budget

Use the existing Cloudflare scheduler, Workers AI for hosted inference, Supabase for evidence/questions/jobs, and current research-state infrastructure. No Ollama server or continuously running PC is required.

Workers AI currently includes 10,000 Neurons/day; usage varies by model and tokens, and some models require paid billing. Select a model available under the account's free allowance, benchmark it on reviewed questions, and impose a conservative internal budget before each request. The documented Gemma model is one candidate, not a quality guarantee. [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).

Cloudflare Workers Free currently permits 100,000 requests/day with a 10 ms CPU limit per invocation. Waiting for network I/O is different from CPU work. Small jobs still need measurement; asynchronous code does not remove the CPU limit. Avoid heavy HTML/PDF parsing and full-table scans inside the request path. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

Supabase Free currently includes a 500 MB database, 1 GB file storage and 5 GB egress; free projects can pause after a week of inactivity. Store compact claims and short evidence excerpts, deduplicate, paginate and monitor growth. [Supabase pricing](https://supabase.com/pricing).

Initial operating targets, to adjust after measurement:

- Keep the existing ten-minute scheduler tick; do one bounded job or no work when nothing is due.
- Collect roughly 20–40 new candidate pages per day across active exam subjects, prioritizing gaps. This is a work cap, not a promise of accepted facts.
- Refresh active news sources every 6–24 hours where useful; refresh stable reference content much less often.
- Start AI drafting at 3–5 questions per bounded batch; adapt to observed CPU, tokens and output quality.
- Reserve roughly 40% of the AI allowance for checking, retries and other account workloads. Count all usage and reserve quota atomically before dispatch.
- Set finite fetch/AI retries, request-size limits, timeouts and a cooldown for failing publishers. Save completed work before advancing the job.
- Cache unchanged pages using content hashes and conditional HTTP requests where supported. Retrieve only the selected question bank subset and evidence needed for each job.
- Disable automatic paid-provider fallback. At quota exhaustion show pending work and the next reset; retain reviewed papers for use.

Use database transactions or equivalent atomic operations for job leases, duplicate prevention and usage reservations. Do not use eventually consistent KV as the sole hard quota lock. A queue table processed by the existing scheduler avoids adding another paid service dependency.

The free target is feasible for a bounded pilot. Throughput, availability, database growth and review effort must be measured; this plan cannot promise unlimited free papers or comprehensive automatic web access.

## 8. Implementation sequence and acceptance criteria

1. Unify evidence and readiness. Bridge both evidence formats through the database repository; enforce the same source/date rules across full, subject and pre-notification modes. Acceptance: a reviewed sports/state fact can reach the correct slot, while an unreviewed or wrong-state fact cannot.
2. Add hosted AI and limits. Introduce a provider interface, Cloudflare AI binding, persistent jobs and atomic budget reservations. Acceptance: quota failure resumes safely and does not duplicate questions or enable paid fallback.
3. Complete source adapters and topic coverage. Add accessible static references and independently sourced state news. Acceptance: each enabled subject has real extracted evidence, working date/claim checks and visible source failures.
4. Build templates and reviewed bank. Add math/reasoning solvers, evidence-backed drafting and semantic duplicate checks. Acceptance: independently checked answers, no unresolved ambiguity and traceable evidence for sampled factual questions.
5. Assemble subject and full papers. Add the slot selector, gap reporting and concise admin workflow. Acceptance: exact requested counts/blueprint, correct practice labels, coherent keys/explanations and clean print/export output.
6. Evaluate the pilot. Use a separate reviewed evaluation set spanning subjects; measure factual/answer error, ambiguity, topic coverage, repeat rate, review rejection, CPU, source freshness and AI cost per accepted question. Difficulty labels remain estimates until supported by response data; use external pilot feedback only if later available, without changing the admin studio into a student simulator.

No new mock should be generated until its required evidence and blueprint checks are complete. No Auditor Sign-Off should substitute for missing verification.
