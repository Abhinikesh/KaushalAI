'use strict'

const mongoose = require('mongoose')

const auditLogSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action:     { type: String, required: true, index: true },   // e.g. 'LOGIN_FAILED', 'QUIZ_PUBLISHED'
    targetType: { type: String, default: null },                  // e.g. 'Quiz', 'Material'
    targetId:   { type: mongoose.Schema.Types.ObjectId, default: null },
    ipAddress:  { type: String, default: null },
    meta:       { type: mongoose.Schema.Types.Mixed, default: {} }, // extra safe context — never log passwords
    timestamp:  { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
)

module.exports = mongoose.model('AuditLog', auditLogSchema)
