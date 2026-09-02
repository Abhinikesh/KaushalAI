'use strict'

const AuditLog = require('../models/AuditLog')

/**
 * Log a sensitive action. Fire-and-forget — never throws so a logging
 * failure never breaks the primary request path.
 *
 * @param {Object} opts
 * @param {string}   opts.action      - Action constant, e.g. 'LOGIN_FAILED'
 * @param {Object}   [opts.req]       - Express request (for userId + ip)
 * @param {string}   [opts.targetType]
 * @param {*}        [opts.targetId]
 * @param {Object}   [opts.meta]      - Extra context. NEVER include passwords or secrets.
 */
async function audit({ action, req, targetType, targetId, meta = {} }) {
  try {
    await AuditLog.create({
      userId:     req?.user?.id ?? null,
      action,
      targetType: targetType ?? null,
      targetId:   targetId   ?? null,
      ipAddress:  req?.ip ?? req?.socket?.remoteAddress ?? null,
      meta,
    })
  } catch (_err) {
    // Silent — audit failure must not break the request
  }
}

module.exports = { audit }
