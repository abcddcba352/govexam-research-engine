import { BlueprintQuestionSlot, SourceLineage, ExamRecord, MockBlueprintRecord } from '../src/types.ts';
import { getSources } from './dbService.ts';

export interface EvidencePackage {
  slot_id: string; subject: string; topic: string; subtopic?: string; core_concept: string;
  cutoff_date?: string; is_current_affairs: boolean; source_lineage: SourceLineage[];
  authoritative_context: string; legal_jurisdiction?: string; effective_statutes?: string[];
  historical_context_only?: boolean;
}

// Only source text actually collected by the server belongs in an evidence package.
// Syllabus labels, registry URLs, and built-in summaries cannot establish an answer.
export function retrieveSlotEvidencePackage(slot: BlueprintQuestionSlot, exam: ExamRecord, blueprint: MockBlueprintRecord): EvidencePackage {
  const articles = getSources(exam.exam_id).flatMap(source => source.collected_article ? [source.collected_article] : [])
    .filter(article => article.matched_topics.includes(slot.topic));
  const isCurrentAffairs = slot.static_current !== 'STATIC' || /current affairs/i.test(slot.subject + ' ' + slot.topic);
  return {
    slot_id: slot.slot_id, subject: slot.subject, topic: slot.topic, subtopic: slot.subtopic,
    core_concept: slot.core_concept_target, cutoff_date: blueprint.current_affairs_cutoff,
    is_current_affairs: isCurrentAffairs,
    source_lineage: articles.map(article => ({ source_url: article.url, source_title: article.title,
      publication_date: article.publication_date, retrieved_at: article.retrieved_at, evidence_snippet: article.text.slice(0, 4000) })),
    authoritative_context: articles.length ? JSON.stringify(articles.map(article => ({ url: article.url, text: article.text.slice(0, 12000) }))) :
      'No retrieved source text supports this slot yet. Evidence verification is incomplete.',
    legal_jurisdiction: exam.state_or_central,
    effective_statutes: [], historical_context_only: slot.static_current === 'STATIC',
  };
}
