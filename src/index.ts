// @mostajs/cloud-middleware — Client-safe exports
// Author: Dr Hamid MADANI drmdh@msn.com

// Types
export type {
  CloudContext,
  CloudConfig,
  CloudRequest,
  CloudResponse,
  CloudNext,
  CloudMiddlewareResult,
} from './types/index.js'

// CORS types
export type { CorsConfig } from './middleware/cors.js'

// Module info
export { moduleInfo } from './lib/module-info.js'
