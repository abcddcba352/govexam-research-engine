import type { ExamRecord } from './types.ts';

export function buildExamResearchQuery(exam: Pick<ExamRecord, 'title' | 'commission' | 'stage' | 'paper' | 'recruitment_cycle' | 'active_cycle'>): string {
  return [exam.commission, exam.title, exam.stage, exam.paper, exam.active_cycle || exam.recruitment_cycle]
    .filter(Boolean).join(' — ');
}
