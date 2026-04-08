// @mostajs/cloud-middleware — Types
// Author: Dr Hamid MADANI drmdh@msn.com

export interface CloudContext {
  account: any
  apiKey: any
  plan: any
  project: any
  subscription: any
  mprojectName: string
}

export interface CloudConfig {
  /** Portal ORM dialect instance */
  dialect: any
  /** ProjectManager instance */
  pm?: any
  /** Encryption key for URI decryption (Buffer) */
  encKey?: Buffer
}

export interface CloudRequest {
  headers: Record<string, string | undefined>
  params: Record<string, string>
  query: Record<string, string>
  body?: any
  method: string
  ip?: string
  url: string
  cloud?: CloudContext
}

export interface CloudResponse {
  status: number
  body: any
}

export type CloudNext = () => Promise<void> | void

export interface CloudMiddlewareResult {
  passed: boolean
  response?: CloudResponse
  context?: CloudContext
}
