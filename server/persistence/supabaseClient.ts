import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

import { getExecutionEnvironment, getPersistenceBackend } from './repository.ts';

let clientInstance: SupabaseClient<any, any> | null = null;

export function getSupabaseConfig(): {
  url: string | undefined;
  secretKey: string | undefined;
  isConfigured: boolean;
} {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    url,
    secretKey,
    isConfigured: Boolean(url && secretKey)
  };
}

export function validateSupabaseConfiguration(): void {
  const env = getExecutionEnvironment();
  const backend = getPersistenceBackend();
  const config = getSupabaseConfig();

  if ((env === 'PRODUCTION' || env === 'STAGING') && backend === 'DATABASE') {
    if (!config.isConfigured) {
      throw new Error(
        `PRODUCTION_DATABASE_CONFIGURATION_INVALID: PERSISTENCE_BACKEND is set to DATABASE in ${env}, but required Supabase credentials (SUPABASE_URL and SUPABASE_SECRET_KEY) are missing.`
      );
    }
  }
}

export function getSupabaseClient(): SupabaseClient<any, any> {
  validateSupabaseConfiguration();

  if (clientInstance) {
    return clientInstance;
  }

  const config = getSupabaseConfig();
  if (!config.url || !config.secretKey) {
    throw new Error(
      'SUPABASE_CLIENT_NOT_CONFIGURED: SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required to initialize the database client.'
    );
  }

  // Schema-isolated server client using administrative secret key
  clientInstance = createClient(config.url, config.secretKey, {
    db: {
      schema: 'govexam'
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  return clientInstance;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().isConfigured;
}

export function resetSupabaseClientInstance(): void {
  clientInstance = null;
}
