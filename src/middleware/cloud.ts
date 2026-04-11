// @mostajs/cloud-middleware — Main middleware (10 steps)
// Author: Dr Hamid MADANI drmdh@msn.com

import type { CloudContext, CloudMiddlewareResult } from '../types/index.js'

// Read operations (for usage tracking)
const READ_OPS = ['GET', 'findAll', 'findOne', 'findById', 'findByIdWithRelations',
  'findWithRelations', 'count', 'search', 'aggregate', 'distinct']

function isReadOp(method: string, body?: any): boolean {
  const op = body?.op ?? method
  return READ_OPS.includes(op)
}

/**
 * Create the cloud middleware function.
 *
 * Requires repos for: Account, ApiKey, Subscription, Plan, UsageLog, Project
 * These come from the peer dependencies (@mostajs/api-keys, subscriptions-plan, project-life).
 */
export function createCloudMiddleware(dialect: any, pm?: any) {
  // Import repos lazily to avoid circular deps
  let apiKeysModule: any = null
  let subsModule: any = null

  async function loadModules() {
    if (!apiKeysModule) {
      // @ts-ignore — peer dep, resolved at runtime
        try { apiKeysModule = await import('@mostajs/api-keys/server') } catch { apiKeysModule = null }
    }
    if (!subsModule) {
      // @ts-ignore — peer dep, resolved at runtime
        try { subsModule = await import('@mostajs/subscriptions-plan/server') } catch { subsModule = null }
    }
  }

  /**
   * Process a request through the 10-step cloud middleware pipeline.
   * Returns { passed: true, context } on success or { passed: false, response } on rejection.
   */
  async function processRequest(
    rawKey: string | undefined,
    projectSlug: string,
    transport: string,
    method: string,
    body?: any,
    ip?: string,
  ): Promise<CloudMiddlewareResult> {
    await loadModules()

    // Step 1 & 2 — HTTPS handled by Apache (infra)
    // Step 3 — Extract and resolve API key
    if (!rawKey) {
      return { passed: false, response: { status: 401, body: { error: 'API_KEY_REQUIRED', message: 'Header X-Api-Key requis' } } }
    }

    if (!apiKeysModule) {
      return { passed: false, response: { status: 500, body: { error: 'API_KEYS_MODULE_NOT_AVAILABLE' } } }
    }

    const apiKey = await apiKeysModule.resolveApiKey(dialect, rawKey)
    if (!apiKey) {
      return { passed: false, response: { status: 401, body: { error: 'INVALID_API_KEY' } } }
    }

    // Step 4 — User/Account lookup + check status
    const { BaseRepository, getSchema } = await import('@mostajs/orm')
    // Support both User (rbac) and Account (legacy) schemas
    const userSchema = getSchema('User') ?? getSchema('Account')
    if (!userSchema) {
      return { passed: false, response: { status: 500, body: { error: 'USER_SCHEMA_NOT_REGISTERED' } } }
    }
    const userRepo = new BaseRepository(userSchema, dialect)
    const account = await userRepo.findById(apiKey.accountId ?? apiKey.account) as any

    if (!account) {
      return { passed: false, response: { status: 403, body: { error: 'ACCOUNT_NOT_FOUND' } } }
    }
    // Check status (rbac: status field) or banned (legacy: banned field)
    if (account.status === 'disabled' || account.status === 'locked' || account.banned) {
      return { passed: false, response: { status: 403, body: { error: 'ACCOUNT_SUSPENDED' } } }
    }

    // Step 5 — Subscription + Plan + limits
    if (!subsModule) {
      return { passed: false, response: { status: 500, body: { error: 'SUBSCRIPTIONS_MODULE_NOT_AVAILABLE' } } }
    }

    const subRepo = subsModule.getSubscriptionRepo(dialect)
    const subs = await subRepo.findAll({ account: account.id ?? account._id, status: 'active' })
    if (!subs || subs.length === 0) {
      // Check trialing
      const trialSubs = await subRepo.findAll({ account: account.id ?? account._id, status: 'trialing' })
      if (!trialSubs || trialSubs.length === 0) {
        return { passed: false, response: { status: 403, body: { error: 'NO_ACTIVE_SUBSCRIPTION' } } }
      }
    }
    const subscription = (subs && subs.length > 0) ? subs[0] : null

    const planRepo = subsModule.getPlanRepo(dialect)
    const plan = subscription ? await planRepo.findById((subscription as any).plan ?? (subscription as any).planId) : null
    const limits = plan ? (typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits) : {}

    // Step 6 — Quota check (usage today)
    const today = new Date().toISOString().slice(0, 10)
    const usageRepo = subsModule.getUsageLogRepo(dialect)
    let usageLogs = await usageRepo.findAll({ account: account.id ?? account._id, date: today })
    let usage = usageLogs.length > 0 ? usageLogs[0] as any : null

    if (!usage) {
      usage = await usageRepo.create({
        account: account.id ?? account._id,
        date: today,
        requests: 0, reads: 0, writes: 0, errors: 0, bandwidth: 0,
      } as any) as any
    }

    if (limits.requestsPerDay && limits.requestsPerDay !== -1 && usage.requests >= limits.requestsPerDay) {
      return { passed: false, response: { status: 429, body: {
        error: 'DAILY_LIMIT_REACHED',
        limit: limits.requestsPerDay,
        current: usage.requests,
        resetAt: today + 'T23:59:59Z',
      } } }
    }

    // Step 7 — Permission check (project, operations, transport)
    if (!apiKeysModule.isProjectAuthorized(apiKey.permissions, projectSlug)) {
      return { passed: false, response: { status: 403, body: { error: 'PROJECT_NOT_AUTHORIZED' } } }
    }

    const opType = isReadOp(method, body) ? 'read' : 'write'
    if (!apiKeysModule.isOperationAuthorized(apiKey.permissions, opType)) {
      return { passed: false, response: { status: 403, body: { error: 'OPERATION_NOT_AUTHORIZED' } } }
    }

    if (!apiKeysModule.isTransportAuthorized(apiKey.permissions, transport)) {
      return { passed: false, response: { status: 403, body: { error: 'TRANSPORT_NOT_AUTHORIZED' } } }
    }

    // Step 8 — Route to project
    // Look up project in DB
    // @ts-ignore — peer dep, resolved at runtime
    const projectRepo = (await import('@mostajs/project-life/server')).getProjectRepo(dialect)
    const projects = await projectRepo.findAll({
      account: account.id ?? account._id,
      slug: projectSlug,
      status: 'active'
    })

    if (!projects || projects.length === 0) {
      return { passed: false, response: { status: 404, body: { error: 'PROJECT_NOT_FOUND' } } }
    }
    const project = projects[0] as any

    // Build context
    const context: CloudContext = {
      account,
      apiKey,
      plan,
      project,
      subscription,
      mprojectName: project.mprojectName,
    }

    // Step 9 — Execute handled by caller (via context.mprojectName → PM)

    // Step 10 — Usage tracking (fire-and-forget)
    const read = isReadOp(method, body)
    usageRepo.update(usage.id ?? usage._id, {
      requests: (usage.requests ?? 0) + 1,
      reads: read ? (usage.reads ?? 0) + 1 : usage.reads,
      writes: !read ? (usage.writes ?? 0) + 1 : usage.writes,
    } as any).catch(() => {})

    // Touch API key (fire-and-forget)
    apiKeysModule.touchApiKey(dialect, apiKey.id ?? apiKey._id, ip).catch(() => {})

    return { passed: true, context }
  }

  return { processRequest }
}
