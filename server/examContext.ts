import { AsyncLocalStorage } from 'node:async_hooks';
import type { ExamRecord, SourceRecord } from '../src/types.ts';

// Synchronous research/readiness code sees only this request's database snapshot.
// No database-backed exam data is shared between concurrent requests.
export const examContext = new AsyncLocalStorage<{
  exams: ExamRecord[];
  sources: SourceRecord[];
}>();
