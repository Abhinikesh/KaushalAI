'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const mongoose = require('mongoose')
const Course = require('../models/Course')
const Competency = require('../models/Competency')

const CURATED_COURSES = [
  {
    externalCourseId: 'igot-crs-01',
    title: 'Data Analysis with Python',
    shortDescription: 'Practical data analysis using Python, Pandas, NumPy, exploratory analysis, and data visualization techniques for government datasets.',
    description: 'Practical data analysis using Python, Pandas, NumPy, exploratory analysis, and data visualization techniques for government datasets.',
    source: 'igot',
    provider: 'Learning Resource',
    category: 'Data Analytics',
    difficulty: 'intermediate',
    language: 'English',
    durationHours: 10,
    prerequisites: 'Basic programming knowledge recommended',
    youtubeUrl: 'https://www.youtube.com/watch?v=KgCgpCIOkIs',
    defaultRating: 4.8,
    ratingCount: 780,
    targetGroup: 'Government Officials and Data Analysts',
    isPublished: true,
    competencyTags: ['Python Programming', 'Pandas', 'NumPy', 'Data Analysis', 'Data Visualization'],
    compCodes: ['TECH001', 'TECH008'],
    objectives: [
      'Use Python for practical data analysis.',
      'Work with Pandas DataFrames and NumPy arrays.',
      'Clean, transform, and inspect datasets.',
      'Perform exploratory data analysis.',
      'Create and interpret data visualizations.',
    ],
    modules: [
      { title: 'Python Foundations', durationMins: 90, youtubeUrl: 'https://www.youtube.com/watch?v=KgCgpCIOkIs' },
      { title: 'NumPy for Data Analysis', durationMins: 90, youtubeUrl: 'https://www.youtube.com/watch?v=KgCgpCIOkIs' },
      { title: 'Pandas DataFrames', durationMins: 150, youtubeUrl: 'https://www.youtube.com/watch?v=KgCgpCIOkIs' },
      { title: 'Data Cleaning & Preparation', durationMins: 90, youtubeUrl: 'https://www.youtube.com/watch?v=KgCgpCIOkIs' },
      { title: 'Exploratory Analysis & Visualization', durationMins: 120, youtubeUrl: 'https://www.youtube.com/watch?v=KgCgpCIOkIs' },
      { title: 'Data Analysis Project', durationMins: 60, youtubeUrl: 'https://www.youtube.com/watch?v=KgCgpCIOkIs' },
    ],
    resources: [
      { label: 'Python for Data Analysis Reference Guide', type: 'PDF', url: 'https://igotkarmayogi.gov.in', sizeMB: '4.2 MB' },
      { label: 'Sample Government Datasets (CSV)', type: 'Link', url: 'https://data.gov.in', sizeMB: '12.5 MB' },
    ],
  },
  {
    externalCourseId: 'igot-crs-02',
    title: 'Artificial Intelligence for Public Governance',
    shortDescription: 'Build foundational AI literacy and understand how AI can support smarter, more efficient, and citizen-centric public governance.',
    description: 'Build foundational AI literacy and understand how AI can support smarter, more efficient, and citizen-centric public governance.',
    source: 'igot',
    provider: 'Karmayogi Bharat',
    category: 'Artificial Intelligence',
    difficulty: 'intermediate',
    language: 'English',
    durationHours: 2.7,
    prerequisites: 'None',
    youtubeUrl: 'https://www.youtube.com/watch?v=Vz8zcKawwEo',
    defaultRating: 4.8,
    ratingCount: 420,
    targetGroup: 'All Government Officers & Administrators',
    isPublished: true,
    competencyTags: ['Artificial Intelligence', 'Generative AI', 'Data-Driven Decision Making', 'AI in Governance', 'Responsible AI'],
    compCodes: ['TECH009', 'DDDM-04'],
    objectives: [
      'Understand core artificial intelligence concepts.',
      'Understand how modern AI and generative AI systems work.',
      'Recognize practical AI use cases in public administration.',
      'Use AI concepts to support data-driven governance.',
      'Understand responsible and citizen-centric AI adoption.',
    ],
    modules: [
      { title: 'AI Foundations', durationMins: 40, youtubeUrl: 'https://www.youtube.com/watch?v=Vz8zcKawwEo' },
      { title: 'Generative AI & Modern Models', durationMins: 45, youtubeUrl: 'https://www.youtube.com/watch?v=Vz8zcKawwEo' },
      { title: 'AI for Public Governance', durationMins: 45, youtubeUrl: 'https://www.youtube.com/watch?v=Vz8zcKawwEo' },
      { title: 'Responsible AI & Ethics', durationMins: 32, youtubeUrl: 'https://www.youtube.com/watch?v=Vz8zcKawwEo' },
    ],
    resources: [
      { label: 'National Strategy for AI (NITI Aayog)', type: 'PDF', url: 'https://niti.gov.in', sizeMB: '3.1 MB' },
    ],
  },
  {
    externalCourseId: 'igot-crs-03',
    title: 'Sustainable Development Goals',
    shortDescription: 'Understand the SDG framework and how inclusive development, gender equality, and public policy contribute to sustainable national growth.',
    description: 'Understand the SDG framework and how inclusive development, gender equality, and public policy contribute to sustainable national growth.',
    source: 'igot',
    provider: 'Karmayogi Bharat',
    category: 'Sustainable Development',
    difficulty: 'beginner',
    language: 'English',
    durationHours: 1,
    prerequisites: 'None',
    youtubeUrl: 'https://www.youtube.com/watch?v=hTnnf9AhDLM',
    defaultRating: 4.7,
    ratingCount: 360,
    targetGroup: 'All Government Officials & Planners',
    isPublished: true,
    competencyTags: ['Sustainable Development Goals', 'SDG 5', 'Gender Equality', 'Inclusive Development', 'Public Policy'],
    compCodes: ['STAT008', 'PI-05'],
    objectives: [
      'Understand the purpose of the Sustainable Development Goals.',
      'Explain the importance of SDG 5 and gender equality.',
      'Connect inclusion and development outcomes.',
      'Recognize governance actions that support sustainable development.',
    ],
    modules: [
      { title: 'SDG Framework & 2030 Agenda', durationMins: 20, youtubeUrl: 'https://www.youtube.com/watch?v=hTnnf9AhDLM' },
      { title: 'SDG 5: Gender Equality & Empowerment', durationMins: 20, youtubeUrl: 'https://www.youtube.com/watch?v=hTnnf9AhDLM' },
      { title: 'Policy, Monitoring & Inclusive Growth', durationMins: 20, youtubeUrl: 'https://www.youtube.com/watch?v=hTnnf9AhDLM' },
    ],
    resources: [
      { label: 'SDG India Index Report Overview', type: 'PDF', url: 'https://sdgindiaindex.niti.gov.in', sizeMB: '5.4 MB' },
    ],
  },
  {
    externalCourseId: 'igot-crs-04',
    title: 'Digital Personal Data Protection Act, 2023',
    shortDescription: 'Understand the DPDP Act and the responsibilities and rights involved in personal data processing for government officers.',
    description: 'Understand the DPDP Act and the responsibilities and rights involved in personal data processing for government officers.',
    source: 'igot',
    provider: 'Karmayogi Bharat',
    category: 'Digital Governance',
    difficulty: 'beginner',
    language: 'English',
    durationHours: 1.2,
    prerequisites: 'None',
    youtubeUrl: 'https://www.youtube.com/watch?v=FUQW44EFmQQ',
    defaultRating: 4.7,
    ratingCount: 390,
    targetGroup: 'All Public Servants & Data Fiduciaries',
    isPublished: true,
    competencyTags: ['Data Protection', 'Digital Governance', 'Privacy', 'Cybersecurity', 'Data Responsibility'],
    compCodes: ['GOV002', 'GOV001'],
    objectives: [
      'Understand the purpose of the DPDP Act.',
      'Understand important data-protection terms.',
      'Recognize responsibilities of data fiduciaries.',
      'Understand rights and duties of data principals.',
      'Identify practical readiness requirements for organizations.',
    ],
    modules: [
      { title: 'DPDP Act Overview & Scope', durationMins: 18, youtubeUrl: 'https://www.youtube.com/watch?v=FUQW44EFmQQ' },
      { title: 'Key Definitions & Grounds for Processing', durationMins: 20, youtubeUrl: 'https://www.youtube.com/watch?v=FUQW44EFmQQ' },
      { title: 'Rights, Duties & Obligations', durationMins: 20, youtubeUrl: 'https://www.youtube.com/watch?v=FUQW44EFmQQ' },
      { title: 'Readiness, Compliance & Governance Controls', durationMins: 14, youtubeUrl: 'https://www.youtube.com/watch?v=FUQW44EFmQQ' },
    ],
    resources: [
      { label: 'DPDP Act 2023 Official Gazette Copy', type: 'PDF', url: 'https://meity.gov.in', sizeMB: '1.8 MB' },
    ],
  },
  {
    externalCourseId: 'igot-crs-05',
    title: 'Bharatiya Nyaya Sanhita, 2023: An Introduction',
    shortDescription: "Understand the major reforms introduced by the Bharatiya Nyaya Sanhita, 2023 and its key changes to India's criminal law framework.",
    description: "Understand the major reforms introduced by the Bharatiya Nyaya Sanhita, 2023 and its key changes to India's criminal law framework.",
    source: 'igot',
    provider: 'Karmayogi Bharat',
    category: 'Law & Governance',
    difficulty: 'beginner',
    language: 'English',
    durationHours: 1,
    prerequisites: 'None',
    youtubeUrl: 'https://www.youtube.com/watch?v=B_jQ3DlrVs4',
    defaultRating: 4.7,
    ratingCount: 400,
    targetGroup: 'All Government Officers & Legal Cadres',
    isPublished: true,
    competencyTags: ['Bharatiya Nyaya Sanhita', 'Criminal Law', 'Public Administration', 'Legal Awareness', 'Governance'],
    compCodes: ['BEH004', 'PI-05'],
    objectives: [
      'Understand the purpose and structure of the Bharatiya Nyaya Sanhita.',
      'Identify major reforms introduced by the new law.',
      'Understand selected provisions relating to women and children.',
      'Understand changes relating to public servants and offences against the State.',
      'Build practical legal awareness for public administration.',
    ],
    modules: [
      { title: 'Introduction to BNS 2023 & Key Reforms', durationMins: 15, youtubeUrl: 'https://www.youtube.com/watch?v=B_jQ3DlrVs4' },
      { title: 'Offences Relating to Women & Children', durationMins: 15, youtubeUrl: 'https://www.youtube.com/watch?v=B_jQ3DlrVs4' },
      { title: 'Offences Affecting the State & Public Authority', durationMins: 15, youtubeUrl: 'https://www.youtube.com/watch?v=B_jQ3DlrVs4' },
      { title: 'Property & Punishment Reforms', durationMins: 15, youtubeUrl: 'https://www.youtube.com/watch?v=B_jQ3DlrVs4' },
    ],
    resources: [
      { label: 'BNS 2023 Summary Handbook', type: 'PDF', url: 'https://mha.gov.in', sizeMB: '2.5 MB' },
    ],
  },
  {
    externalCourseId: 'igot-crs-06',
    title: 'Personal Finance for Karmayogis',
    shortDescription: 'Build practical financial literacy around money management, investment basics, and personal financial decision-making for government officers.',
    description: 'Build practical financial literacy around money management, investment basics, and personal financial decision-making for government officers.',
    source: 'igot',
    provider: 'Karmayogi Bharat',
    category: 'Financial Management',
    difficulty: 'beginner',
    language: 'English',
    durationHours: 1,
    prerequisites: 'None',
    youtubeUrl: 'https://www.youtube.com/watch?v=kCthkqPKySw',
    defaultRating: 4.7,
    ratingCount: 350,
    targetGroup: 'All Government Officials',
    isPublished: true,
    competencyTags: ['Financial Literacy', 'Money Management', 'Investment Basics', 'Financial Planning', 'Personal Finance'],
    compCodes: ['BEH005', 'PS-03'],
    objectives: [
      'Understand foundational personal-finance concepts.',
      'Build better money-management habits.',
      'Understand basic investment concepts.',
      'Evaluate common financial decisions.',
      'Develop a practical personal financial plan.',
    ],
    modules: [
      { title: 'Financial Foundations & Goal Setting', durationMins: 15, youtubeUrl: 'https://www.youtube.com/watch?v=kCthkqPKySw' },
      { title: 'Budgeting & Money Management', durationMins: 15, youtubeUrl: 'https://www.youtube.com/watch?v=kCthkqPKySw' },
      { title: 'Investment Vehicles & Retirement Planning', durationMins: 15, youtubeUrl: 'https://www.youtube.com/watch?v=kCthkqPKySw' },
      { title: 'Building a Long-Term Financial Plan', durationMins: 15, youtubeUrl: 'https://www.youtube.com/watch?v=kCthkqPKySw' },
    ],
    resources: [
      { label: 'Personal Finance Checklist for Civil Servants', type: 'PDF', url: 'https://igotkarmayogi.gov.in', sizeMB: '1.2 MB' },
    ],
  },
]

async function seedCuratedIgotCourses() {
  console.log('[seedCuratedIgotCourses] Checking and syncing 6 curated iGOT courses into MongoDB...')

  // Fetch all competencies to map compCodes to ObjectIds
  const allComps = await Competency.find({}, 'competencyCode _id')
  const codeToId = new Map()
  for (const c of allComps) {
    if (c.competencyCode) codeToId.set(c.competencyCode.toUpperCase(), c._id)
  }

  let inserted = 0
  let updated = 0

  for (const item of CURATED_COURSES) {
    const { compCodes, ...courseData } = item

    // Resolve skillTags ObjectIds
    const skillTags = (compCodes || [])
      .map((code) => codeToId.get(code.toUpperCase()))
      .filter(Boolean)

    const doc = {
      ...courseData,
      skillTags,
    }

    // Match by externalCourseId or by exact title
    const filter = {
      $or: [
        { externalCourseId: item.externalCourseId },
        { title: item.title, source: 'igot' },
      ],
    }

    const existing = await Course.findOne(filter)

    await Course.findOneAndUpdate(
      filter,
      { $set: doc },
      { upsert: true, new: true, runValidators: true }
    )

    if (existing) {
      updated++
    } else {
      inserted++
    }
  }

  const totalCourses = await Course.countDocuments()
  const igotCourses = await Course.countDocuments({ source: 'igot' })
  console.log(`[seedCuratedIgotCourses] Done: ${inserted} inserted, ${updated} updated. Total DB courses: ${totalCourses} (iGOT: ${igotCourses}).`)
  return { inserted, updated, totalCourses, igotCourses }
}

if (require.main === module) {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kaushalai'
  mongoose.connect(mongoUri)
    .then(async () => {
      await seedCuratedIgotCourses()
      await mongoose.disconnect()
      process.exit(0)
    })
    .catch((err) => {
      console.error('[seedCuratedIgotCourses] Failed:', err)
      process.exit(1)
    })
}

module.exports = seedCuratedIgotCourses
