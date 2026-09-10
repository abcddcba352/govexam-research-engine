# GovExam prepared fix deployment and live retest

Date: 9 September 2026

## Applied
- Read the supplied README and executed Apply-Fix.ps1 successfully.
- All 12 installed files match the supplied updated SHA-256 checksums.
- Backup: .codex-backups/research-fix-7614d05dee2f4693b13f74fa6290c048
- Temporary edits to setup_and_generate_appsc_mock.ts were restored from backup; that helper was never executed.

## Checks
- 15/15 research regression tests passed using node --import tsx --test, outside the sandbox after the sandbox runner failed with uv_os_get_passwd ENOMEM.
- npm run build passed (frontend and server bundle); existing chunk-size warning remains.
- npm run lint is blocked by pre-existing errors in setup_and_generate_appsc_mock.ts: invalid INDIA_WIDE, MEDIUM and HARD enum values. Correcting those temporarily exposed further missing required blueprint fields; helper restored to preserve scope.
- A broader application-only type check (tsconfig.research-verification.json) found another existing error: server/persistence/supabase/index.ts:1170 accesses MockTestRecord.language, which is not declared. Full type verification remains incomplete.

## Deployment
- Existing Cloudflare Worker: govexam-staging
- URL: https://govexam-staging.govexam-staging.workers.dev
- Version: 4583b055-3c0c-4e69-9a55-007a66b5df4f
- Wrangler reported successful deployment.
- Browser confirmed the deployed application loads.
- Persistence health reported healthy, DATABASE, 21 tables and 6 buckets present.

## Live APPSC EO Grade III Paper I retest
- Query: APPSC Executive Officer Grade III Paper I General Studies and Mental Ability
- HYBRID run: run_1788929101507_zqpa8
- Exact APPSC EO Paper I identity retained, no TGPSC substitution.
- No cycle was supplied or available in the staging intake; result correctly reports Unknown cycle.
- Status: RESEARCH_PARTIAL_QUOTA_EXHAUSTED
- Primary gemini-3.8-flash and fallback gemini-3.1-flash-lite both attempted; fallback_applied=true.
- 2 pages visited; 0 documents retrieved; 0 evidence-backed facts; all 12 critical fields unresolved.
- Raw result: staging-eo-hybrid.json

## Remaining blockers
- Official EO verification is incomplete: live model quota unavailable, no official documents retrieved, notification cycle unspecified.
- The existing EO intake is absent from the staging exam endpoint. It returned only three built-in exams; the browser confirmed this. server/dbService.ts getExams/saveExams use filesystem/in-memory storage, despite the DATABASE health result. Therefore a retest against the original selected intake and its notification cycle could not be completed. Query-only research was tested instead.
- No Auditor Sign-Off used and no mocks generated.
