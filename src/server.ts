// @mostajs/cloud-middleware — Server-side exports
// Author: Dr Hamid MADANI drmdh@msn.com

// Main middleware
export { createCloudMiddleware } from './middleware/cloud.js'

// Auto-init from env (connect to portal DB + create middleware)
export { initCloudFromEnv } from './lib/cloud-init.js'
export type { CloudProcessRequest } from './lib/cloud-init.js'

// Rate limiter
export { RateLimiter } from './middleware/rate-limiter.js'

// CORS
export { getCorsHeaders } from './middleware/cors.js'
export type { CorsConfig } from './middleware/cors.js'

// Request context helpers
export { extractApiKey, extractProjectSlug, extractTransport, hasCloudContext } from './lib/request-context.js'

// Module info & schemas
export { getSchemas, moduleInfo } from './lib/module-info.js'

// Registration
export { cloudMiddlewareRegistration } from './register.js'
