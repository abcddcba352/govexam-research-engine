declare module 'cloudflare:node' {
  export function httpServerHandler(app: any): {
    fetch: (request: Request, env?: any, ctx?: any) => Promise<Response>;
  };
}
