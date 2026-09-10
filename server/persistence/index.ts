import { PersistenceBackend, ExecutionEnvironment } from '../../src/types.ts';
import { RepositoryRegistry } from './interfaces.ts';
import { createLocalRegistry } from './local/index.ts';
import { createSupabaseRegistry } from './supabase/index.ts';
import { getPersistenceBackend, getExecutionEnvironment, assertCanMutate } from './repository.ts';

export * from './interfaces.ts';
export * from './supabaseClient.ts';
export * from './storageService.ts';
export * from './repository.ts';

let activeRegistryOverride: RepositoryRegistry | null = null;

export function setRepositoryRegistryOverride(registry: RepositoryRegistry | null): void {
  activeRegistryOverride = registry;
}

export function getRepositoryRegistry(): RepositoryRegistry {
  if (activeRegistryOverride) {
    return activeRegistryOverride;
  }

  const backend = getPersistenceBackend();
  if (backend === 'DATABASE') {
    return createSupabaseRegistry();
  }

  return createLocalRegistry();
}
