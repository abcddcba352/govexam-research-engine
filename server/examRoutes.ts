import type { Express, Request, RequestHandler } from 'express';
import { withExamWorkflow } from './persistence/examWorkflow.ts';
import { getExams, getExamById, createExamFromIntake, getSources, saveSource, updateExamStages } from './dbService.ts';
import { allowedPublisher, collectCurrentAffairs } from './currentAffairsService.ts';
import { discoverCurrentAffairs } from './autonomousResearch.ts';
import { saveAutonomousArticles } from './autonomousPersistence.ts';
import { validDate, rankArticle, currentAffairsTopics } from '../src/currentAffairs.ts';
import { canGenerateMock, evaluatePreparationBasis } from './readinessService.ts';
import { executeResearch, isQuotaExhaustedError, classifySourceTrustLevel } from './researchService.ts';
import { generateMockTestForExam } from './mockService.ts';
import { getPersistenceBackend, getRepositoryRegistry } from './persistence/index.ts';
import type { PreparationMode } from '../src/types.ts';
import { buildCoverage, subjectsForExam, evidenceEligible } from '../src/researchCoverage.ts';
import { SUBJECT_PUBLISHERS, getSubjectPublisher, publisherApplies } from './subjectPublishers.ts';
import { discoverSubjectLinks, collectSubjectEvidence, evidenceSource } from './subjectResearch.ts';
import { fetchExamStructure } from './examStructureService.ts';
import { currentArticlePool, evidencePool } from './evidencePool.ts';

type Reply = { status?: number; body: unknown };
export function examEndpoint(work: (req: Request) => Reply | Promise<Reply>): RequestHandler {
  return async (req, res) => {
    try {
      const reply = await withExamWorkflow(() => work(req));
      res.status(reply.status || 200).json(reply.body);
    } catch (error: any) {
      console.error('[EXAM_WORKFLOW_FAILED]', error);
      const detail = String(error?.message || error || '');
      const retryable = /SUPABASE_|fetch failed|network|timeout|timed out|\b5(?:02|03|04)\b|connection reset|resource limit/i.test(detail);
      res.status(isQuotaExhaustedError(error) ? 429 : 503).json({
        error: isQuotaExhaustedError(error)
          ? 'AI quota is unavailable. Research and generation remain incomplete.'
          : retryable
            ? 'The research service is temporarily unavailable. No successful result was recorded; please retry.'
            : 'The examination workflow could not complete. No successful result was recorded. Please retry.',
        retryable,
      });
    }
  };
}

export function registerExamRoutes(app: Express) {
  app.get('/api/research/coverage/:examId',examEndpoint(req=>{
    const exam=getExamById(req.params.examId);if(!exam) return {status:404,body:{error:'Examination not found.'}};
    const cutoff=req.query.cutoff_date||new Date().toISOString().slice(0,10);
    if(!validDate(cutoff)||cutoff>new Date().toISOString().slice(0,10)) return {status:400,body:{error:'Invalid cutoff date.'}};
    const sources=getSources();
    const normalized=evidencePool(exam,sources,cutoff).map(e=>({...sources.find(s=>s.source_id===e.source_id)!,research_evidence:e}));
    const coverage=buildCoverage(exam,normalized,cutoff);
    return {body:{...coverage,publishers:SUBJECT_PUBLISHERS.filter(p=>publisherApplies(p,exam))
      .map(({title_filter,...p})=>p)}};
  }));
  app.post('/api/research/collect-subject',examEndpoint(async req=>{
    const {exam_id,publisher_id,cutoff_date}=req.body||{};
    const exam=typeof exam_id==='string'?getExamById(exam_id):undefined;
    const publisher=typeof publisher_id==='string'?getSubjectPublisher(publisher_id):undefined;
    if(!exam||!publisher) return {status:404,body:{error:'Select a registered examination and publisher.'}};
    if(!validDate(cutoff_date)||cutoff_date>new Date().toISOString().slice(0,10)) return {status:400,body:{error:'Invalid cutoff date.'}};
    if(publisher.mode==='UNAVAILABLE'||!publisherApplies(publisher,exam)) return {status:409,body:{error:'This publisher is not available for the selected paper.'}};
    try {
      const sources=getSources();const seen=sources.flatMap(s=>s.research_evidence?[s.research_evidence]:[]);
      const links=(await discoverSubjectLinks(publisher)).filter(l=>!l.publication_date||evidenceEligible({kind:publisher.kind,publication_date:l.publication_date} as any,cutoff_date));
      const link=links.find(l=>!seen.some(e=>(e.url===l.url||e.requested_url===l.url)&&Date.now()-Date.parse(e.retrieved_at)<publisher.refresh_hours*3600000));
      if(!link) return {body:{status:'NO_NEW_EVIDENCE',saved:0,model_calls:0,message:'No new eligible links found. Existing evidence remains available.'}};
      const evidence=await collectSubjectEvidence(publisher,link.url);
      if(!evidenceEligible(evidence,cutoff_date)) return {body:{status:'OUTSIDE_WINDOW',saved:0,model_calls:0,message:'Retrieved article falls outside the selected cutoff window.'}};
      const source=evidenceSource(evidence);const exists=sources.some(s=>s.source_id===source.source_id);
      if(!exists) saveSource(source);
      return {body:{status:'REVIEW_REQUIRED',saved:exists?0:1,model_calls:0,evidence}};
    }catch(error:any){return {status:502,body:{status:'SOURCE_UNAVAILABLE',error:error.message,saved:0,model_calls:0}};}
  }));
  app.post('/api/current-affairs/discover', examEndpoint(async req => {
    const { exam_id, cutoff_date } = req.body || {};
    const exam=typeof exam_id==='string' ? getExamById(exam_id) : undefined;
    if(!exam) return {status:404,body:{error:'Select an examination first.'}};
    if(!validDate(cutoff_date) || cutoff_date>new Date().toISOString().slice(0,10))
      return {status:400,body:{error:'Use a valid cutoff date no later than today.'}};
    const existing=getSources(exam_id).filter(s=>s.exam_id===exam_id);
    const result=await discoverCurrentAffairs(exam,cutoff_date,{existing:existing.flatMap(s=>s.collected_article?[s.collected_article]:[])});
    const saved=saveAutonomousArticles(exam_id,result);
    return {body:{...result,saved_articles:saved}};
  }));
  app.get('/api/current-affairs/:examId', examEndpoint(req => {
    const exam=getExamById(req.params.examId);
    if(!exam) return {status:404,body:{error:'Examination not found.'}};
    const cutoff=req.query.cutoff_date ?? new Date().toISOString().slice(0,10);
    if(!validDate(cutoff) || cutoff>new Date().toISOString().slice(0,10)) return {status:400,body:{error:'Invalid cutoff date.'}};
    const articles=currentArticlePool(exam,getSources(),cutoff);
    return {body:{articles}};
  }));
  app.post('/api/current-affairs/collect', examEndpoint(async req => {
    const { exam_id, urls, cutoff_date } = req.body || {};
    const exam = typeof exam_id === 'string' ? getExamById(exam_id) : undefined;
    if (!exam) return { status: 404, body: { error: 'Select an examination first.' } };
    if (!validDate(cutoff_date) || cutoff_date > new Date().toISOString().slice(0, 10))
      return { status: 400, body: { error: 'Use a valid cutoff date no later than today.' } };
    if (!Array.isArray(urls) || !urls.length || urls.length > 10 || urls.some(url => typeof url !== 'string' || !allowedPublisher(url)))
      return { status: 400, body: { error: 'Supply one to ten HTTPS article URLs from government or supported international institutions.' } };
    const result = await collectCurrentAffairs(exam, urls, cutoff_date);
    const existing = getSources(exam_id);
    for (const article of result.articles) {
      if (existing.some(s => s.collected_article?.content_hash === article.content_hash)) continue;
      saveSource({ exam_id, title: article.title, url: article.url, domain: new URL(article.url).hostname,
        source_level: classifySourceTrustLevel(article.url), document_type: 'SECONDARY', verification_status: 'UNVERIFIED',
        publication_date: article.publication_date, is_current: article.status === 'REVIEW_REQUIRED', collected_article: article,
      });
    }
    return { body: result };
  }));
  app.get('/api/exams', examEndpoint(() => ({ body: getExams() })));
  app.get('/api/exams/:id', examEndpoint(req => {
    const exam = getExamById(req.params.id);
    return exam ? { body: exam } : { status: 404, body: { error: 'Exam not found' } };
  }));
  app.get('/api/exams/:id/readiness', examEndpoint(req => ({
    body: canGenerateMock(req.params.id, req.query.mode as PreparationMode | undefined),
  })));
  app.get('/api/exams/:id/preparation-basis', examEndpoint(req => ({
    body: evaluatePreparationBasis(req.params.id, req.query.mode as PreparationMode | undefined),
  })));
  app.post('/api/intake/create', examEndpoint(req => {
    const input = req.body;
    if (!input || typeof input !== 'object') {
      return { status: 400, body: { error: 'Request body is required.' } };
    }
    if (typeof input.title !== 'string' || !input.title.trim()) {
      return { status: 400, body: { error: 'Examination Title is required.' } };
    }
    if (typeof input.commission !== 'string' || !input.commission.trim()) {
      return { status: 400, body: { error: 'Recruiting Commission / Authority is required.' } };
    }

    input.title = input.title.trim();
    input.commission = input.commission.trim();
    input.post = typeof input.post === 'string' && input.post.trim() ? input.post.trim() : input.title;
    input.paper = typeof input.paper === 'string' && input.paper.trim() ? input.paper.trim() : 'Paper-I';
    input.recruitment_cycle = typeof input.recruitment_cycle === 'string' && input.recruitment_cycle.trim() ? input.recruitment_cycle.trim() : 'Current Notification';
    input.stage = typeof input.stage === 'string' && input.stage.trim() ? input.stage.trim() : 'Written Examination';
    input.state_or_central = typeof input.state_or_central === 'string' && input.state_or_central.trim() ? input.state_or_central.trim() : 'State';

    for (const key of ['total_questions', 'duration_minutes', 'marks_per_question', 'negative_marking_rate']) {
      if (input[key] !== undefined && (!Number.isFinite(input[key]) || input[key] < 0)) {
        return { status: 400, body: { error: `Invalid ${key}.` } };
      }
    }
    // Retrying the same intake must not create duplicate exams.
    const existing = getExams().find(e => e.title === input.title && e.commission === input.commission &&
      e.paper === input.paper && e.recruitment_cycle === input.recruitment_cycle);
    if (existing) return { body: { success: true, exam: existing, existing: true } };
    return { status: 201, body: { success: true, exam: createExamFromIntake(input) } };
  }));
  app.post('/api/research/run', examEndpoint(async req => {
    const payload = req.body;
    if (!payload || typeof payload.exam_query !== 'string' || !payload.exam_query.trim() ||
      (payload.exam_id !== undefined && typeof payload.exam_id !== 'string')) {
      return { status: 400, body: { error: 'A valid exam query and optional exam ID are required.' } };
    }
    payload.research_mode ||= 'HYBRID';
    if (!['HYBRID', 'DIRECT_WEB', 'GOOGLE_API'].includes(payload.research_mode))
      return { status: 400, body: { error: 'Unsupported research mode.' } };
    if (payload.exam_id && !getExamById(payload.exam_id))
      return { status: 404, body: { error: 'Selected examination no longer exists.' } };
    if (payload.user_provided_urls !== undefined && (!Array.isArray(payload.user_provided_urls) ||
      payload.user_provided_urls.length > 10 || payload.user_provided_urls.some((url: unknown) => typeof url !== 'string')))
      return { status: 400, body: { error: 'Supply at most ten source URLs.' } };
    return { body: await executeResearch(payload) };
  }));
  app.post('/api/mocks/generate', examEndpoint(async req => {
    if(process.env.AI_PROVIDER==='cloudflare')return {status:409,body:{error:'Open Syllabus Coverage → Question bank & paper builder. Queue questions, review evidence and answers, then assemble the checked paper. No unchecked paper was generated.'}};
    const { exam_id, blueprint_id, question_count, difficulty, preparation_mode } = req.body || {};
    let target = exam_id;
    if (!target && blueprint_id) target = (await getRepositoryRegistry().blueprints.getBlueprintById(blueprint_id))?.exam_id;
    if (!target) return { status: 400, body: { error: 'A valid exam or blueprint is required.' } };
    if (!getExamById(target)) return { status: 404, body: { error: 'Exam not found.' } };
    const readiness = canGenerateMock(target, preparation_mode);
    if (!readiness.can_generate) return { status: 409, body: {
      error: 'Generation is blocked until the preparation basis is verified.', readiness,
    } };
    const mock = await generateMockTestForExam({ exam_id: target, blueprint_id,
      desiredQuestionCount: question_count, difficulty, preparation_mode });
    if (getPersistenceBackend() === 'DATABASE') await getRepositoryRegistry().mocks.saveMock(mock);
    return { body: { success: true, mock } };
  }));
  app.post('/api/research/exam-structure', examEndpoint(async req => {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!query) {
      return { status: 400, body: { error: 'query is required.' } };
    }
    const structure = await fetchExamStructure(query);
    return { body: { success: true, structure } };
  }));
  app.post('/api/exams/:id/stages', examEndpoint(async req => {
    const { stages, structure_scheme } = req.body || {};
    if (!Array.isArray(stages)) return { status: 400, body: { error: 'stages must be an array' } };
    const updatedExam = updateExamStages(req.params.id, stages, structure_scheme);
    if (!updatedExam) return { status: 404, body: { error: 'Exam not found' } };
    return { body: { success: true, exam: updatedExam } };
  }));
}
