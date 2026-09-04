'use strict'

const mongoose = require('mongoose')

const SystemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global_config',
    },
    platformName: {
      type: String,
      default: 'KaushalAI',
    },
    platformTagline: {
      type: String,
      default: 'AI Enabled Learning Platform for Official Statistics',
    },
    timeZone: {
      type: String,
      default: '(GMT+05:30) Asia/Kolkata',
    },
    defaultLanguage: {
      type: String,
      default: 'English',
    },
    dateFormat: {
      type: String,
      default: 'DD MMM YYYY (02 Jun 2026)',
    },
    currency: {
      type: String,
      default: 'INR (₹)',
    },
    passwordPolicy: {
      minLength: { type: Number, default: 8 },
      requireUppercase: { type: Boolean, default: true },
      requireLowercase: { type: Boolean, default: true },
      requireNumbers: { type: Boolean, default: true },
      requireSpecialChars: { type: Boolean, default: true },
      expiryDays: { type: Number, default: 90 },
    },
    sessionSettings: {
      timeoutMinutes: { type: String, default: '30 Minutes' },
      idleWarning: { type: String, default: '5 Minutes before timeout' },
      maxConcurrentSessions: { type: Number, default: 3 },
      rememberMeDuration: { type: String, default: '7 Days' },
    },
    contentSettings: {
      maxUploadSize: { type: String, default: '50 MB' },
      allowedTypes: {
        type: [String],
        default: ['PDF', 'DOC', 'DOCX', 'PPT', 'XLS', 'XLSX', 'MP4'],
      },
      requireApproval: { type: Boolean, default: true },
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('SystemSetting', SystemSettingSchema)
