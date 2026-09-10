import { httpServerHandler } from 'cloudflare:node';
import { createApp } from './serverApp.ts';
import { runCloudResearch, readCloudResearchState } from './cloudResearch.ts';
export { FreeEngineObject } from './freeCloudEngine.ts';

function applyEnvironment(env:any) {
  for(const [key,value] of Object.entries(env||{})) if(typeof value==='string') process.env[key]=value;
  process.env.PERSISTENCE_BACKEND ||= 'DATABASE';
  process.env.APP_ENV=env?.APP_ENV||env?.ENVIRONMENT||env?.NODE_ENV||'staging';
}

let handler: { fetch: (request: Request, env?: any, ctx?: any) => Promise<Response> } | null = null;

export default {
  async scheduled(event:{scheduledTime:number},env:any):Promise<void> {
    applyEnvironment(env);
    if(!env.GOVEXAM_RESEARCH_STATE) throw Error('Cloud research state binding is missing.');
    if(env.FREE_ENGINE) {
      const engine=env.FREE_ENGINE.get(env.FREE_ENGINE.idFromName('govexam-free-engine-v1'));
      const result=await engine.fetch('https://engine/tick',{method:'POST'});
      if(!result.ok)console.error('FREE_ENGINE_TICK_FAILED',result.status);
    } else await runCloudResearch(env.GOVEXAM_RESEARCH_STATE,event.scheduledTime);
  },
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      applyEnvironment(env);
      const path=new URL(request.url).pathname;
      if(env.FREE_ENGINE&&(path.startsWith('/api/research/coverage/')||path==='/api/research/collect-subject')) {
        const target=new URL(request.url);
        if(path.startsWith('/api/research/coverage/')){
          if(request.method!=='GET')return Response.json({error:'Method not allowed.'},{status:405});
          target.pathname='/coverage';target.searchParams.set('exam_id',decodeURIComponent(path.slice('/api/research/coverage/'.length)));target.searchParams.set('cutoff',target.searchParams.get('cutoff_date')||new Date().toISOString().slice(0,10));
        } else {
          if(request.method!=='POST'||!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'JSON POST required.'},{status:405});
          target.pathname='/collect';
        }
        const engine=env.FREE_ENGINE.get(env.FREE_ENGINE.idFromName('govexam-free-engine-v1'));
        const response=await engine.fetch(new Request(target,request));const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');
        return new Response(response.body,{status:response.status,headers});
      }
      if(path.startsWith('/api/free-engine/')) {
        if(!env.FREE_ENGINE)return Response.json({error:'Free cloud engine is not configured.'},{status:503});
        const endpoint=path.slice('/api/free-engine'.length);
        if(!['/overview','/check-ai','/jobs','/facts/review','/questions/review','/assemble'].includes(endpoint))return Response.json({error:'Not found.'},{status:404});
        if(request.method!=='GET'&&(!request.headers.get('content-type')?.includes('application/json') || (request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)))return Response.json({error:'Use the admin site to submit this request.'},{status:403});
        if(Number(request.headers.get('content-length')||0)>18000)return Response.json({error:'Request too large.'},{status:413});
        const engine=env.FREE_ENGINE.get(env.FREE_ENGINE.idFromName('govexam-free-engine-v1'));
        const target=new URL(request.url);target.pathname=endpoint;
        const response=await engine.fetch(new Request(target,request));
        const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');
        return new Response(response.body,{status:response.status,headers});
      }
      if(new URL(request.url).pathname==='/api/research/schedule' && request.method==='GET') {
        const state=await readCloudResearchState(env?.GOVEXAM_RESEARCH_STATE);
        return Response.json({configured:Boolean(env?.GOVEXAM_RESEARCH_STATE),interval_minutes:10,state},{headers:{'Cache-Control':'no-store'}});
      }
      if (env) {
        for (const [key, value] of Object.entries(env)) {
          if (typeof value === 'string') {
            process.env[key] = value;
          }
        }
      }
      if (!process.env.PERSISTENCE_BACKEND) {
        process.env.PERSISTENCE_BACKEND = 'DATABASE';
      }
      if (env?.APP_ENV || env?.ENVIRONMENT || env?.NODE_ENV) {
        process.env.APP_ENV = env.APP_ENV || env.ENVIRONMENT || env.NODE_ENV;
      }

      if (!handler) {
        const app = createApp();
        const server = app.listen(3000);
        handler = httpServerHandler(server);
      }

      return await handler.fetch(request, env, ctx);
    } catch (err: any) {
      console.error('[WORKER_FATAL_ERROR]', err);
      return new Response(JSON.stringify({
        ok: false,
        error: err?.message || String(err),
        stack: err?.stack || null
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
