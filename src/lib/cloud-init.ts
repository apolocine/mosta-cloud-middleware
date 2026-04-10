// @mostajs/cloud-middleware — Auto-initialization from environment variables
// Author: Dr Hamid MADANI drmdh@msn.com
//
// Usage:
//   const processRequest = await initCloudFromEnv(pm)
//   if (processRequest) { /* cloud middleware active */ }
//
// Env vars:
//   PORTAL_DB_DIALECT=postgres
//   PORTAL_DB_URI=postgresql://user:pass@localhost:5432/octonet_cloud
//   MOSTA_CLOUD=true (optional, auto-detected if PORTAL_DB_URI set)

import { createCloudMiddleware } from '../middleware/cloud.js'

// Account schema (same as octonet-cloud portal)
const AccountSchema = {
  name: 'Account',
  collection: 'accounts',
  timestamps: true,
  fields: {
    email: { type: 'string', required: true },
    name: { type: 'string', required: true },
    password: { type: 'string', required: true },
    role: { type: 'string', default: 'user' },
    verified: { type: 'boolean', default: false },
    banned: { type: 'boolean', default: false },
    stripeCustomerId: { type: 'string' },
    locale: { type: 'string', default: 'fr' },
  },
  relations: {},
  indexes: [{ fields: { email: 'asc' }, unique: true }],
}

export type CloudProcessRequest = (
  rawKey: string | undefined,
  projectSlug: string,
  transport: string,
  method: string,
  body?: any,
  ip?: string,
) => Promise<{ passed: boolean; response?: any; context?: any }>

/**
 * Initialize cloud middleware from environment variables.
 *
 * Connects to the portal database, imports required schemas,
 * and returns the processRequest function.
 *
 * @param pm - ProjectManager instance (optional, for project routing)
 * @returns processRequest function, or null if not configured
 *
 * @example
 *   import { initCloudFromEnv } from '@mostajs/cloud-middleware/server'
 *   const processRequest = await initCloudFromEnv(pm)
 */
export async function initCloudFromEnv(pm?: any): Promise<CloudProcessRequest | null> {
  const portalUri = process.env.PORTAL_DB_URI
  if (!portalUri) {
    console.log('  Cloud middleware: PORTAL_DB_URI not set — disabled')
    return null
  }

  const portalDialect = process.env.PORTAL_DB_DIALECT ?? 'postgres'

  // Import portal schemas from peer modules
  const schemas: any[] = [AccountSchema]
  try {
    const subPlan = await import('@mostajs/subscriptions-plan')
    schemas.push(subPlan.PlanSchema, subPlan.SubscriptionSchema)
    if (subPlan.InvoiceSchema) schemas.push(subPlan.InvoiceSchema)
    if (subPlan.UsageLogSchema) schemas.push(subPlan.UsageLogSchema)
  } catch (e: any) {
    console.warn(`  Cloud middleware: @mostajs/subscriptions-plan not found — ${e.message}`)
    return null
  }

  try {
    const apiKeys = await import('@mostajs/api-keys')
    schemas.push(apiKeys.ApiKeySchema)
  } catch (e: any) {
    console.warn(`  Cloud middleware: @mostajs/api-keys not found — ${e.message}`)
    return null
  }

  try {
    const projectLife = await import('@mostajs/project-life')
    schemas.push(projectLife.ProjectSchema)
  } catch {
    // project-life is optional for cloud middleware
  }

  // Connect to portal database (isolated from consumer's own DB)
  try {
    const { createIsolatedDialect } = await import('@mostajs/orm')
    const portalDb = await createIsolatedDialect(
      { dialect: portalDialect as any, uri: portalUri, schemaStrategy: 'none' },
      schemas,
    )

    const mw = createCloudMiddleware(portalDb, pm)
    console.log(`  Cloud middleware: ready (portal: ${portalDialect}, ${schemas.length} schemas)`)
    return mw.processRequest
  } catch (e: any) {
    console.warn(`  Cloud middleware: init failed — ${e.message}`)
    return null
  }
}
