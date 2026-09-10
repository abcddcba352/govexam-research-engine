import { httpServerHandler } from 'cloudflare:node';
import { createApp } from './serverApp.ts';
import { runCloudResearch, readCloudResearchState } from './cloudResearch.ts';

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
    await runCloudResearch(env.GOVEXAM_RESEARCH_STATE,event.scheduledTime);
  },
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      applyEnvironment(env);
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
