// @mostajs/cloud-middleware — Module registration
// Author: Dr Hamid MADANI drmdh@msn.com

import { moduleInfo, getSchemas } from './lib/module-info.js'

export const cloudMiddlewareRegistration = {
  name: moduleInfo.name,
  label: moduleInfo.label,
  description: moduleInfo.description,
  version: moduleInfo.version,
  priority: 50,
  getSchemas,
}
