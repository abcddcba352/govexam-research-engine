import { DatabaseHealthStatus, StorageHealthStatus } from '../../src/types.ts';
import { getExecutionEnvironment, getPersistenceBackend } from './repository.ts';
import { getSupabaseClient, isSupabaseConfigured, getSupabaseConfig } from './supabaseClient.ts';
import { checkStorageHealth, GOVEXAM_STORAGE_BUCKETS } from './storageService.ts';

export const REQUIRED_GOVEXAM_TABLES = [
  'exams',
  'exam_pattern_versions',
  'exam_fact_verifications',
  'preparation_bases',
  'sources',
  'source_documents',
  'previous_papers',
  'pyq_questions',
  'pyq_analysis_runs',
  'pyq_question_analysis',
  'exam_intelligence_profiles',
  'mock_series',
  'blueprints',
  'blueprint_slots',
  'mocks',
  'mock_questions',
  'question_audits',
  'duplicate_ledger',
  'research_runs',
  'audit_logs',
  'ai_usage'
] as const;

export async function checkProductionPersistence(): Promise<DatabaseHealthStatus> {
  const environment = getExecutionEnvironment();
  const backend = getPersistenceBackend();

  if (backend !== 'DATABASE') {
    return {
      healthy: true,
      environment,
      backend,
      schema_exists: true,
      tables_checked: 0,
      tables_missing: [],
      rpc_available: true,
      buckets_checked: 0,
      buckets_missing: [],
      read_write_verified: true
    };
  }

  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return {
      healthy: false,
      environment,
      backend,
      schema_exists: false,
      tables_checked: 0,
      tables_missing: [...REQUIRED_GOVEXAM_TABLES],
      rpc_available: false,
      buckets_checked: 0,
      buckets_missing: [...GOVEXAM_STORAGE_BUCKETS],
      read_write_verified: false,
      error: 'Supabase credentials missing: SUPABASE_URL or SUPABASE_SECRET_KEY not set.'
    };
  }

  const startTime = Date.now();

  try {
    const supabase = getSupabaseClient();

    // 1. Check database connectivity and schema tables
    const missingTables: string[] = [];
    for (const table of REQUIRED_GOVEXAM_TABLES) {
      const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        missingTables.push(table);
      }
    }

    // 2. Check storage buckets
    const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
    const existingBuckets = (buckets || []).map(b => b.name);
    const missingBuckets = GOVEXAM_STORAGE_BUCKETS.filter(b => !existingBuckets.includes(b));

    // 3. Check read/write capability via audit ping
    let readWriteVerified = false;
    const pingId = `ping_${Date.now()}`;
    const { error: insertErr } = await supabase.from('audit_logs').insert({
      audit_id: pingId,
      audit_type: 'HEALTH_CHECK_PING',
      entity_type: 'SYSTEM',
      entity_id: 'SYSTEM_HEALTH',
      reason: 'Automated persistence health check verification'
    });

    if (!insertErr) {
      const { data: readData, error: readErr } = await supabase
        .from('audit_logs')
        .select('audit_id')
        .eq('audit_id', pingId)
        .maybeSingle();

      if (!readErr && readData?.audit_id === pingId) {
        readWriteVerified = true;
      }
      // Clean up ping record
      await supabase.from('audit_logs').delete().eq('audit_id', pingId);
    }

    const latencyMs = Date.now() - startTime;
    const isHealthy = missingTables.length === 0 && readWriteVerified;

    return {
      healthy: isHealthy,
      environment,
      backend,
      schema_exists: missingTables.length === 0,
      tables_checked: REQUIRED_GOVEXAM_TABLES.length,
      tables_missing: missingTables,
      rpc_available: true,
      buckets_checked: GOVEXAM_STORAGE_BUCKETS.length,
      buckets_missing: missingBuckets,
      read_write_verified: readWriteVerified,
      latency_ms: latencyMs,
      error: isHealthy ? undefined : `Missing ${missingTables.length} tables: ${missingTables.join(', ')}`
    };
  } catch (err: any) {
    return {
      healthy: false,
      environment,
      backend,
      schema_exists: false,
      tables_checked: REQUIRED_GOVEXAM_TABLES.length,
      tables_missing: [...REQUIRED_GOVEXAM_TABLES],
      rpc_available: false,
      buckets_checked: GOVEXAM_STORAGE_BUCKETS.length,
      buckets_missing: [...GOVEXAM_STORAGE_BUCKETS],
      read_write_verified: false,
      latency_ms: Date.now() - startTime,
      error: err?.message || String(err)
    };
  }
}

export { checkStorageHealth };
