'use strict'

// Pre-register all Mongoose models in a deterministic order
// to prevent any MissingSchemaError when .populate() is called across models.

const AuditLog = require('./AuditLog')
const AuthorizedOfficer = require('./AuthorizedOfficer')
const Competency = require('./Competency')
const Course = require('./Course')
const Enrollment = require('./Enrollment')
const JobRole = require('./JobRole')
const Question = require('./Question')
const Quiz = require('./Quiz')
const QuizAttempt = require('./QuizAttempt')
const RefreshToken = require('./RefreshToken')
const UploadedMaterial = require('./UploadedMaterial')
const Notification = require('./Notification')
const Certificate = require('./Certificate')
const User = require('./User')
const UserCompetency = require('./UserCompetency')

// Part 1: Real-data models
const Department = require('./Department')
const Role = require('./Role')
const FunctionalArea = require('./FunctionalArea')
const RoleCompetency = require('./RoleCompetency')
const Assessment = require('./Assessment')
const AssessmentAttempt = require('./AssessmentAttempt')
const AssessmentResponse = require('./AssessmentResponse')
const SkillGap = require('./SkillGap')
const CourseCompetency = require('./CourseCompetency')
const Recommendation = require('./Recommendation')
const LearningPath = require('./LearningPath')
const LearningPathItem = require('./LearningPathItem')
const LearningProgress = require('./LearningProgress')

module.exports = {
  AuditLog,
  AuthorizedOfficer,
  Certificate,
  Competency,
  Course,
  Enrollment,
  JobRole,
  Notification,
  Question,
  Quiz,
  QuizAttempt,
  RefreshToken,
  UploadedMaterial,
  User,
  UserCompetency,
  Department,
  Role,
  FunctionalArea,
  RoleCompetency,
  Assessment,
  AssessmentAttempt,
  AssessmentResponse,
  SkillGap,
  CourseCompetency,
  Recommendation,
  LearningPath,
  LearningPathItem,
  LearningProgress,
}
