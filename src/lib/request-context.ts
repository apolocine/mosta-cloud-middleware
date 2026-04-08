// @mostajs/cloud-middleware — Request context helpers
// Author: Dr Hamid MADANI drmdh@msn.com

import type { CloudContext } from '../types/index.js'

export function extractApiKey(headers: Record<string, string | undefined>): string | undefined {
  return headers['x-api-key'] ?? headers['X-Api-Key'] ?? undefined
}

export function extractProjectSlug(path: string): string | undefined {
  // URL pattern: /v1/{project}/{transport}/{entity?}
  const match = path.match(/^\/v1\/([^/]+)\//)
  return match?.[1]
}

export function extractTransport(path: string): string | undefined {
  // URL pattern: /v1/{project}/{transport}/{entity?}
  const match = path.match(/^\/v1\/[^/]+\/([^/]+)/)
  return match?.[1]
}

export function hasCloudContext(req: any): req is { cloud: CloudContext } {
  return req?.cloud?.account != null && req?.cloud?.apiKey != null
}
