import type { MockQuestion, QuestionDifficulty } from './types.ts';
export interface EvidenceFact {
  id:string; exam_id:string; topic:string; claim:string; answer:string;
  source_ids:string[]; source_hashes:string[]; excerpts:string[];
  kind:'CURRENT'|'REFERENCE'; event_date?:string; reviewed_at:string; reviewer:string;
  concept?:string;
}
export interface BankQuestion {
  id:string; exam_id:string; topic:string; subject:string; difficulty:QuestionDifficulty;
  question:MockQuestion; fact_id?:string; fact_family:string; template_id?:string;
  status:'REVIEW_REQUIRED'|'READY'|'REJECTED'; issues:string[];
  created_at:string; reviewed_at?:string; reviewer?:string; model:string;
  review_notes?:string;
}
export interface PaperJob {
  id:string; exam_id:string; blueprint_id?:string; mode:'FULL_LENGTH'|'SUBJECT_WISE'|'TOPIC_WISE';
  topic:string; subject:string; count:number; difficulty:QuestionDifficulty;
  topics?:string[];
  cutoff:string; state:'QUEUED'|'RUNNING'|'WAITING_FOR_EVIDENCE'|'WAITING_FOR_QUOTA'|'REVIEW_REQUIRED'|'READY'|'FAILED'|'ASSEMBLED';
  question_ids:string[]; issues:string[]; attempts:number; created_at:string; updated_at:string;
  next_run_at?:string; lease_until?:string; mock_id?:string;
  pyq_context?:string;
}
