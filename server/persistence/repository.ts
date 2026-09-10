import fs from 'fs';
import path from 'path';
import {
  ExecutionEnvironment,
  PersistenceBackend,
  ExamRecord,
  SourceRecord,
  MockTestRecord,
  DuplicateLedgerEntry,
  PreparationBasis,
  GenerationAuditLog
} from '../../src/types.ts';

/**
 * Determines current execution environment
 */
export function getExecutionEnvironment(): ExecutionEnvironment {
  const env = (
    process.env.APP_ENV ||
    process.env.ENVIRONMENT ||
    process.env.DEPLOYMENT_ENV ||
    process.env.NODE_ENV ||
    'development'
  ).toUpperCase();
  if (env.includes('STAGE') || env.includes('STAGING')) return 'STAGING';
  if (env.includes('PROD')) return 'PRODUCTION';
  if (env.includes('TEST')) return 'TEST';
  return 'DEVELOPMENT';
}

/**
 * Determines configured persistence backend
 */
export function getPersistenceBackend(): PersistenceBackend {
  const configured = process.env.PERSISTENCE_BACKEND?.toUpperCase();
  if (configured === 'DATABASE') return 'DATABASE';
  if (configured === 'JSON_FIXTURE') return 'JSON_FIXTURE';
  if (configured === 'LOCAL_FILE') return 'LOCAL_FILE';

  const env = getExecutionEnvironment();
  if (env === 'TEST') return 'JSON_FIXTURE';
  if (env === 'PRODUCTION' || env === 'STAGING') return 'LOCAL_FILE'; // Triggers PRODUCTION_PERSISTENCE_INVALID unless DATABASE is set
  return 'LOCAL_FILE';
}

export interface PersistenceValidationResult {
  isValid: boolean;
  environment: ExecutionEnvironment;
  backend: PersistenceBackend;
  status: 'VALID' | 'PRODUCTION_PERSISTENCE_INVALID';
  message: string;
}

/**
 * Validates whether the current persistence configuration is safe for the environment.
 * Rule: PRODUCTION and STAGING require DATABASE for mutable application state.
 */
export function validatePersistenceConfiguration(): PersistenceValidationResult {
  const environment = getExecutionEnvironment();
  const backend = getPersistenceBackend();

  if (environment === 'PRODUCTION' || environment === 'STAGING') {
    if (backend !== 'DATABASE') {
      return {
        isValid: false,
        environment,
        backend,
        status: 'PRODUCTION_PERSISTENCE_INVALID',
        message: `${environment} deployment requires PERSISTENCE_BACKEND='DATABASE' for mutable application state. Current backend is '${backend}'. Mutable operations and mock finalization are strictly blocked.`
      };
    }
  }

  return {
    isValid: true,
    environment,
    backend,
    status: 'VALID',
    message: `Persistence configured safely for ${environment} using ${backend}.`
  };
}

/**
 * Ensures write operations obey persistence safety rules.
 * Throws PRODUCTION_PERSISTENCE_INVALID if running in production without DATABASE.
 */
export function assertCanMutate(operationName: string): void {
  const validation = validatePersistenceConfiguration();
  if (!validation.isValid) {
    throw new Error(`[${validation.status}] Cannot execute '${operationName}': ${validation.message}`);
  }
}
