// @mostajs/cloud-middleware — CORS helper
// Author: Dr Hamid MADANI drmdh@msn.com

export interface CorsConfig {
  origins?: string[]
  methods?: string[]
  headers?: string[]
  credentials?: boolean
  maxAge?: number
}

const DEFAULT_CORS: CorsConfig = {
  origins: ['*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization', 'X-Api-Key'],
  credentials: false,
  maxAge: 86400,
}

export function getCorsHeaders(config?: CorsConfig): Record<string, string> {
  const c = { ...DEFAULT_CORS, ...config }
  return {
    'Access-Control-Allow-Origin': c.origins?.join(', ') ?? '*',
    'Access-Control-Allow-Methods': c.methods?.join(', ') ?? '*',
    'Access-Control-Allow-Headers': c.headers?.join(', ') ?? '*',
    'Access-Control-Allow-Credentials': String(c.credentials ?? false),
    'Access-Control-Max-Age': String(c.maxAge ?? 86400),
  }
}
