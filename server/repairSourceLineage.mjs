import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required.');

const apply = process.argv.includes('--apply');
const db = createClient(url, key, { db: { schema: 'govexam' }, auth: { persistSession: false } });
const verifiedStatuses = new Set(['VERIFIED_OFFICIAL', 'VERIFIED_MULTIPLE_SOURCES']);
const primaryLevels = new Set(['LEVEL_5_OFFICIAL', 'LEVEL_4_GOVERNMENT']);

const [{ data: facts, error: factsError }, { data: sources, error: sourcesError }] = await Promise.all([
  db.from('exam_fact_verifications').select('verification_id,exam_id,source_id,verification_status'),
  db.from('sources').select('source_id,source_url,source_level'),
]);
if (factsError) throw new Error(`Could not read fact verifications: ${factsError.message}`);
if (sourcesError) throw new Error(`Could not read sources: ${sourcesError.message}`);

const validSourceIds = new Set((sources || [])
  .filter(source => /^https:\/\//i.test(source.source_url || '') && primaryLevels.has(source.source_level))
  .map(source => source.source_id));
const orphaned = (facts || []).filter(fact =>
  verifiedStatuses.has(fact.verification_status) && !validSourceIds.has(fact.source_id));
const examIds = [...new Set(orphaned.map(fact => fact.exam_id))];

if (apply && orphaned.length) {
  const now = new Date().toISOString();
  for (const fact of orphaned) {
    const { error } = await db.from('exam_fact_verifications').update({
      verification_status: 'UNVERIFIED', confidence: 0,
      verified_by: 'SOURCE_LINEAGE_REPAIR_2026_09_09', verified_at: now,
    }).eq('verification_id', fact.verification_id);
    if (error) throw new Error(`Could not repair ${fact.verification_id}: ${error.message}`);
  }
  if (examIds.length) {
    const [{ error: patternError }, { error: examError }] = await Promise.all([
      db.from('exam_pattern_versions').update({ verification_status: 'UNVERIFIED', updated_at: now }).in('exam_id', examIds),
      db.from('exams').update({ exam_profile_status: 'RESEARCH_REQUIRED', updated_at: now }).in('exam_id', examIds),
    ]);
    if (patternError) throw new Error(`Could not invalidate patterns: ${patternError.message}`);
    if (examError) throw new Error(`Could not invalidate exam profiles: ${examError.message}`);
  }
}

console.log(JSON.stringify({ mode: apply ? 'applied' : 'dry-run',
  verified_facts_checked: (facts || []).filter(f => verifiedStatuses.has(f.verification_status)).length,
  orphaned_fact_records: orphaned.length, affected_exam_ids: examIds }, null, 2));
