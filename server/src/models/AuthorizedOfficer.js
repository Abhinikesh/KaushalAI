'use strict'

const mongoose = require('mongoose')

const authorizedOfficerSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    officialEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    jobRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobRole',
      default: null,
    },
    isClaimed: {
      type: Boolean,
      default: false,
      index: true,
    },
    claimedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('AuthorizedOfficer', authorizedOfficerSchema)
