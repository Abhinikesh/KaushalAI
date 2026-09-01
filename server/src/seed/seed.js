/**
 * Seed script — run once (or repeatedly, it's idempotent):
 *   node src/seed/seed.js
 *
 * Populates: Competencies, JobRoles, Courses
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const mongoose = require('mongoose')
const Competency = require('../models/Competency')
const JobRole = require('../models/JobRole')
const Course = require('../models/Course')

async function upsert(Model, filter, data) {
  return Model.findOneAndUpdate(filter, data, { upsert: true, new: true, runValidators: true })
}

const COMPETENCIES = [
  // Statistical
  { name: 'Survey Design', category: 'statistical', description: 'Design and methodology for household and establishment surveys' },
  { name: 'Sampling Theory', category: 'statistical', description: 'Probability and non-probability sampling techniques' },
  { name: 'National Accounts', category: 'statistical', description: 'Compilation and analysis of national income and expenditure accounts' },
  { name: 'Price Statistics', category: 'statistical', description: 'CPI, WPI, and inflation measurement methodologies' },
  { name: 'Data Quality Assurance', category: 'statistical', description: 'Validation, editing, and imputation frameworks for survey data' },
  // Technical
  { name: 'Python for Data Analysis', category: 'technical', description: 'Data wrangling, analysis, and visualisation using pandas, numpy, matplotlib' },
  { name: 'R Programming', category: 'technical', description: 'Statistical computing and graphics using base R and tidyverse' },
  { name: 'SQL & Databases', category: 'technical', description: 'Relational database querying, schema design, and optimisation' },
  { name: 'GIS & Spatial Analysis', category: 'technical', description: 'Geographic information systems for spatial data collection and mapping' },
  { name: 'Machine Learning', category: 'technical', description: 'Supervised and unsupervised learning algorithms and model evaluation' },
  { name: 'Data Visualisation', category: 'technical', description: 'Dashboards, infographics, and storytelling with data' },
  // Digital Governance
  { name: 'Cloud Computing', category: 'digital_governance', description: 'Cloud service models, deployment, and governance on AWS/Azure/GCP' },
  { name: 'Cybersecurity Fundamentals', category: 'digital_governance', description: 'Information security principles, threat models, and compliance' },
  { name: 'Data Privacy & Ethics', category: 'digital_governance', description: 'Data protection laws, anonymisation techniques, and ethical frameworks' },
  { name: 'Digital India Initiatives', category: 'digital_governance', description: 'e-Governance frameworks, iGOT Karmayogi, and national digital infrastructure' },
  // Behavioural
  { name: 'Leadership & Team Management', category: 'behavioural', description: 'Leading teams, decision-making, and stakeholder management' },
  { name: 'Communication & Presentation', category: 'behavioural', description: 'Effective written and oral communication for technical and non-technical audiences' },
  { name: 'Project Management', category: 'behavioural', description: 'Planning, scheduling, risk management, and delivery of statistical projects' },
  { name: 'Critical Thinking', category: 'behavioural', description: 'Analytical reasoning and evidence-based problem solving' },
  { name: 'Coordination & Collaboration', category: 'behavioural', description: 'Inter-departmental coordination and partnership building' },
]

const JOB_ROLES = [
  {
    title: 'Statistical Assistant',
    department: 'MOSPI',
    competencies: [
      ['Survey Design', 2],
      ['Sampling Theory', 2],
      ['Python for Data Analysis', 1],
      ['SQL & Databases', 2],
      ['Data Quality Assurance', 2],
      ['Communication & Presentation', 2],
    ],
  },
  {
    title: 'Statistical Officer',
    department: 'MOSPI',
    competencies: [
      ['Survey Design', 3],
      ['Sampling Theory', 3],
      ['National Accounts', 2],
      ['Price Statistics', 2],
      ['Python for Data Analysis', 2],
      ['R Programming', 2],
      ['SQL & Databases', 3],
      ['Data Quality Assurance', 3],
      ['Communication & Presentation', 3],
      ['Project Management', 2],
    ],
  },
  {
    title: 'Senior Statistical Officer',
    department: 'MOSPI',
    competencies: [
      ['Survey Design', 4],
      ['Sampling Theory', 4],
      ['National Accounts', 3],
      ['Price Statistics', 3],
      ['Python for Data Analysis', 3],
      ['R Programming', 3],
      ['Machine Learning', 2],
      ['Data Visualisation', 3],
      ['Leadership & Team Management', 3],
      ['Project Management', 3],
      ['Critical Thinking', 3],
    ],
  },
  {
    title: 'Data Analyst',
    department: 'MOSPI',
    competencies: [
      ['Python for Data Analysis', 4],
      ['R Programming', 3],
      ['SQL & Databases', 4],
      ['Machine Learning', 3],
      ['Data Visualisation', 4],
      ['Cloud Computing', 2],
      ['Cybersecurity Fundamentals', 2],
      ['Communication & Presentation', 3],
    ],
  },
  {
    title: 'Director (Statistics)',
    department: 'MOSPI',
    competencies: [
      ['National Accounts', 4],
      ['Price Statistics', 4],
      ['Survey Design', 5],
      ['Sampling Theory', 4],
      ['Data Privacy & Ethics', 3],
      ['Digital India Initiatives', 3],
      ['Leadership & Team Management', 5],
      ['Project Management', 4],
      ['Coordination & Collaboration', 4],
      ['Communication & Presentation', 4],
    ],
  },
]

const COURSES = [
  {
    title: 'Fundamentals of Survey Sampling',
    description: 'Covers probability sampling, stratification, clustering, and estimation theory for large-scale surveys.',
    source: 'nssta',
    externalCourseId: 'NSSTA-SURV-101',
    skillTags: ['Survey Design', 'Sampling Theory'],
    difficulty: 'beginner',
    durationHours: 20,
  },
  {
    title: 'Advanced Survey Methodology',
    description: 'Complex survey designs, weighting, variance estimation using GREG and bootstrap methods.',
    source: 'nssta',
    externalCourseId: 'NSSTA-SURV-301',
    skillTags: ['Survey Design', 'Sampling Theory', 'Data Quality Assurance'],
    difficulty: 'advanced',
    durationHours: 40,
  },
  {
    title: 'National Accounts Statistics: Concepts & Compilation',
    description: 'SNA 2008 framework, GDP measurement approaches, and Indian national accounts compilation.',
    source: 'nssta',
    externalCourseId: 'NSSTA-NA-201',
    skillTags: ['National Accounts'],
    difficulty: 'intermediate',
    durationHours: 30,
  },
  {
    title: 'Price Index Compilation and Analysis',
    description: 'CPI and WPI methodologies, index number theory, seasonal adjustment techniques.',
    source: 'nssta',
    externalCourseId: 'NSSTA-PRC-201',
    skillTags: ['Price Statistics'],
    difficulty: 'intermediate',
    durationHours: 25,
  },
  {
    title: 'Python for Statistical Analysis',
    description: 'Hands-on Python: pandas, numpy, scipy, and matplotlib for government data workflows.',
    source: 'igot',
    externalCourseId: 'IGOT-PY-201',
    skillTags: ['Python for Data Analysis', 'Data Visualisation'],
    difficulty: 'beginner',
    durationHours: 35,
  },
  {
    title: 'Advanced Python & ML for Data Scientists',
    description: 'scikit-learn, model selection, feature engineering, and deployment for statistical applications.',
    source: 'igot',
    externalCourseId: 'IGOT-PY-401',
    skillTags: ['Python for Data Analysis', 'Machine Learning'],
    difficulty: 'advanced',
    durationHours: 50,
  },
  {
    title: 'R for Government Statistical Work',
    description: 'Statistical modelling and report generation with R Markdown for official statistics.',
    source: 'nssta',
    externalCourseId: 'NSSTA-R-201',
    skillTags: ['R Programming', 'Data Visualisation'],
    difficulty: 'intermediate',
    durationHours: 30,
  },
  {
    title: 'SQL for Data Professionals',
    description: 'Relational databases, advanced querying, window functions, and PostgreSQL for analytics.',
    source: 'igot',
    externalCourseId: 'IGOT-SQL-101',
    skillTags: ['SQL & Databases'],
    difficulty: 'beginner',
    durationHours: 20,
  },
  {
    title: 'GIS and Spatial Statistics',
    description: 'QGIS fundamentals, spatial data collection, choropleth mapping for census and survey work.',
    source: 'nssta',
    externalCourseId: 'NSSTA-GIS-101',
    skillTags: ['GIS & Spatial Analysis'],
    difficulty: 'beginner',
    durationHours: 25,
  },
  {
    title: 'Introduction to Machine Learning',
    description: 'Regression, classification, clustering, and model evaluation for non-technical government officers.',
    source: 'igot',
    externalCourseId: 'IGOT-ML-101',
    skillTags: ['Machine Learning', 'Python for Data Analysis'],
    difficulty: 'beginner',
    durationHours: 30,
  },
  {
    title: 'Data Visualisation for Policy Communication',
    description: 'Storytelling with data, Tableau, Power BI, and accessible chart design for government reports.',
    source: 'igot',
    externalCourseId: 'IGOT-VIZ-201',
    skillTags: ['Data Visualisation', 'Communication & Presentation'],
    difficulty: 'intermediate',
    durationHours: 20,
  },
  {
    title: 'Cloud Fundamentals for Government',
    description: 'MeitY cloud policy, AWS and Azure basics, data sovereignty and NIC infrastructure.',
    source: 'igot',
    externalCourseId: 'IGOT-CLD-101',
    skillTags: ['Cloud Computing', 'Digital India Initiatives'],
    difficulty: 'beginner',
    durationHours: 15,
  },
  {
    title: 'Cybersecurity for Government Officials',
    description: 'Cyber hygiene, phishing, secure handling of sensitive statistical data, CERT-In guidelines.',
    source: 'igot',
    externalCourseId: 'IGOT-SEC-101',
    skillTags: ['Cybersecurity Fundamentals', 'Data Privacy & Ethics'],
    difficulty: 'beginner',
    durationHours: 10,
  },
  {
    title: 'Data Privacy, Ethics and the DPDP Act 2023',
    description: 'India\'s Digital Personal Data Protection Act, anonymisation standards, and ethical data use.',
    source: 'igot',
    externalCourseId: 'IGOT-PRIV-201',
    skillTags: ['Data Privacy & Ethics', 'Cybersecurity Fundamentals'],
    difficulty: 'intermediate',
    durationHours: 12,
  },
  {
    title: 'Leadership Development for Mid-Career Officers',
    description: 'Strategic thinking, team leadership, and change management for Senior Statistical Officers.',
    source: 'igot',
    externalCourseId: 'IGOT-LEAD-301',
    skillTags: ['Leadership & Team Management', 'Coordination & Collaboration'],
    difficulty: 'intermediate',
    durationHours: 24,
  },
  {
    title: 'Project Management Essentials',
    description: 'Project planning, risk management, and stakeholder communication using PM best practices.',
    source: 'igot',
    externalCourseId: 'IGOT-PM-101',
    skillTags: ['Project Management', 'Coordination & Collaboration'],
    difficulty: 'beginner',
    durationHours: 18,
  },
  {
    title: 'Effective Communication for Statistical Officers',
    description: 'Report writing, presentation skills, and translating complex statistics for policy audiences.',
    source: 'nssta',
    externalCourseId: 'NSSTA-COMM-101',
    skillTags: ['Communication & Presentation', 'Critical Thinking'],
    difficulty: 'beginner',
    durationHours: 16,
  },
  {
    title: 'Data Quality Frameworks for Official Statistics',
    description: 'GSBPM, DQAF, editing and imputation strategies for NSS and ASI survey data.',
    source: 'nssta',
    externalCourseId: 'NSSTA-DQ-301',
    skillTags: ['Data Quality Assurance', 'Survey Design'],
    difficulty: 'advanced',
    durationHours: 32,
  },
]

async function run() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB')

  // ── Competencies ──────────────────────────────────────────────────────────
  const competencyMap = {}
  for (const c of COMPETENCIES) {
    const doc = await upsert(Competency, { name: c.name }, c)
    competencyMap[c.name] = doc._id
  }
  console.log(`Seeded ${COMPETENCIES.length} competencies`)

  // ── Job Roles ─────────────────────────────────────────────────────────────
  for (const jr of JOB_ROLES) {
    const requiredCompetencies = jr.competencies.map(([name, level]) => ({
      competencyId: competencyMap[name],
      requiredLevel: level,
    }))
    await upsert(
      JobRole,
      { title: jr.title },
      { title: jr.title, department: jr.department, requiredCompetencies }
    )
  }
  console.log(`Seeded ${JOB_ROLES.length} job roles`)

  // ── Courses ───────────────────────────────────────────────────────────────
  for (const course of COURSES) {
    const skillTags = course.skillTags.map((name) => competencyMap[name]).filter(Boolean)
    const { skillTags: _tags, ...rest } = course
    await upsert(Course, { externalCourseId: rest.externalCourseId }, { ...rest, skillTags })
  }
  console.log(`Seeded ${COURSES.length} courses`)

  await mongoose.disconnect()
  console.log('Seed complete.')
}

run().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
