// @mostajs/cloud-middleware — Server-side exports
// Author: Dr Hamid MADANI drmdh@msn.com

// Main middleware
export { createCloudMiddleware } from './middleware/cloud.js'

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
