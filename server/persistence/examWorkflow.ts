import { examContext } from '../examContext.ts';
import { getPersistenceBackend, getRepositoryRegistry } from './index.ts';

const transientReadError = (error: unknown) => /SUPABASE_.*(QUERY|UPsert)|fetch failed|network|timeout|timed out|\b5(?:02|03|04)\b|connection reset|resource limit/i.test(String((error as any)?.message || error));

async function readWorkflowSnapshot(repository: ReturnType<typeof getRepositoryRegistry>) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await Promise.all([repository.exams.getExams(), repository.sources.getSources()]);
    } catch (error) {
      lastError = error;
      if (attempt === 2 || !transientReadError(error)) throw error;
      await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 150 : 500));
    }
  }
  throw lastError;
}

export async function withExamWorkflow<T>(work: () => T | Promise<T>): Promise<T> {
  if (getPersistenceBackend() !== 'DATABASE') return work();
  const repository = getRepositoryRegistry();
  const [exams, sources] = await readWorkflowSnapshot(repository);
  const before = new Map(exams.map(exam => [exam.exam_id, JSON.stringify(exam)]));
  const sourceIds = new Set(sources.map(source => source.source_id));
  return examContext.run({ exams, sources }, async () => {
    const result = await work();
    const state = examContext.getStore()!;
    // Persist before returning success; never silently fall back to memory.
    for (const source of state.sources) {
      if (!sourceIds.has(source.source_id)) await repository.sources.saveSource(source);
    }
    for (const exam of state.exams) {
      if (before.get(exam.exam_id) !== JSON.stringify(exam)) {
        for (const fact of Object.values(exam.fact_verifications || {})) {
          if (fact.source_url && !state.sources.some(s => s.source_id === fact.source_id && s.url === fact.source_url && s.exam_id === exam.exam_id))
            fact.source_id = state.sources.filter(s => s.url === fact.source_url && s.exam_id === exam.exam_id)
              .sort((a,b) => b.retrieved_at.localeCompare(a.retrieved_at))[0]?.source_id;
        }
        await repository.exams.saveExam(exam);
      }
    }
    return result;
  });
}
