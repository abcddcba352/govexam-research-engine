import { examContext } from '../examContext.ts';
import { getPersistenceBackend, getRepositoryRegistry } from './index.ts';

export async function withExamWorkflow<T>(work: () => T | Promise<T>): Promise<T> {
  if (getPersistenceBackend() !== 'DATABASE') return work();
  const repository = getRepositoryRegistry();
  const [exams, sources] = await Promise.all([
    repository.exams.getExams(), repository.sources.getSources(),
  ]);
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
