/**
 * updateCourseThumbnails.js — Updates thumbnailUrl for all courses in KaushalAI MongoDB.
 * Usage: node server/src/seed/updateCourseThumbnails.js
 */

'use strict'

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const mongoose = require('mongoose')
const Course = require('../models/Course')

const COURSE_TITLE_THUMBNAILS = {
  // Technology & Coding
  'Software Development Practices for Government Applications':
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=640&auto=format&fit=crop&q=80',
  'Python for Government Data Analysis':
    'https://img.youtube.com/vi/KgCgpCIOkIs/mqdefault.jpg',
  'Cybersecurity for Software Developers':
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=640&auto=format&fit=crop&q=80',
  'SQL for Government Databases':
    'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=640&auto=format&fit=crop&q=80',
  'Machine Learning Fundamentals for Public Services':
    'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=640&auto=format&fit=crop&q=80',
  'APIs and System Integration':
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=640&auto=format&fit=crop&q=80',
  'Cloud Computing Fundamentals for Government':
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=640&auto=format&fit=crop&q=80',
  'Data Engineering Fundamentals':
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=640&auto=format&fit=crop&q=80',
  'Artificial Intelligence Fundamentals':
    'https://img.youtube.com/vi/Vz8zcKawwEo/mqdefault.jpg',
  'Data Visualization with Python':
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=640&auto=format&fit=crop&q=80',
  'Introduction to DevOps':
    'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=640&auto=format&fit=crop&q=80',
  'Web Application Development Fundamentals':
    'https://images.unsplash.com/photo-1547658719-da2b51169166?w=640&auto=format&fit=crop&q=80',
  'Cybersecurity Awareness for Officials':
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=640&auto=format&fit=crop&q=80',
  'Data Privacy and Protection in Government':
    'https://img.youtube.com/vi/FUQW44EFmQQ/mqdefault.jpg',
  'Digital Signatures and Electronic Records':
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=640&auto=format&fit=crop&q=80',
  'e-Governance and Digital Public Services':
    'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=640&auto=format&fit=crop&q=80',
  'GIS for Government Applications':
    'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=640&auto=format&fit=crop&q=80',
  'Digital Identity and Authentication':
    'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=640&auto=format&fit=crop&q=80',
  'Open Data and Data Sharing in Government':
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=640&auto=format&fit=crop&q=80',
  'Responsible Use of Generative AI in Government':
    'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=640&auto=format&fit=crop&q=80',
  'Digital Accessibility for Public Services':
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=640&auto=format&fit=crop&q=80',
  'Blockchain Fundamentals for Public Administration':
    'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=640&auto=format&fit=crop&q=80',
  'Information Security Management Basics':
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=640&auto=format&fit=crop&q=80',
  'Digital Service Design for Citizens':
    'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=640&auto=format&fit=crop&q=80',

  // Curated Foundation & Karmayogi Courses
  'Data Analysis with Python':
    'https://img.youtube.com/vi/KgCgpCIOkIs/mqdefault.jpg',
  'Artificial Intelligence for Public Governance':
    'https://img.youtube.com/vi/Vz8zcKawwEo/mqdefault.jpg',
  'Sustainable Development Goals':
    'https://img.youtube.com/vi/hTnnf9AhDLM/mqdefault.jpg',
  'Digital Personal Data Protection Act, 2023':
    'https://img.youtube.com/vi/FUQW44EFmQQ/mqdefault.jpg',
  'Bharatiya Nyaya Sanhita, 2023: An Introduction':
    'https://img.youtube.com/vi/B_jQ3DlrVs4/mqdefault.jpg',
  'Personal Finance for Karmayogis':
    'https://img.youtube.com/vi/kCthkqPKySw/mqdefault.jpg',

  // Soft Skills & Public Administration
  'Effective Communication in Public Service':
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=640&auto=format&fit=crop&q=80',
  'Effective Leadership in Public Service':
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=640&auto=format&fit=crop&q=80',
  'Problem Solving and Decision Making':
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=640&auto=format&fit=crop&q=80',
  'Teamwork and Collaboration':
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=640&auto=format&fit=crop&q=80',
  'Ethics and Integrity in Public Service':
    'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=640&auto=format&fit=crop&q=80',
  'Time Management and Workplace Productivity':
    'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=640&auto=format&fit=crop&q=80',
  'Negotiation and Stakeholder Management':
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=640&auto=format&fit=crop&q=80',
  'Presentation Skills for Government Officials':
    'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=640&auto=format&fit=crop&q=80',
  'Emotional Intelligence at the Workplace':
    'https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=640&auto=format&fit=crop&q=80',
  'Change Management in Government':
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=640&auto=format&fit=crop&q=80',
  'Critical Thinking for Public Policy and Administration':
    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=640&auto=format&fit=crop&q=80',
  'Stress Management and Resilience at Work':
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=640&auto=format&fit=crop&q=80',

  // NSSTA & Official Statistics Courses
  'Official Statistics Awareness Programme for University Professors and PG Students':
    '/slides/nasa-nssta/slide-01.png',
  'Official Statistics & Related Methodology (ISEC)':
    '/slides/nasa-nssta/slide-02.png',
  'Index Numbers and Price Statistics in India':
    '/slides/nasa-nssta/slide-03.png',
  'Social Statistics':
    '/slides/nasa-nssta/slide-04.png',
  'National Accounts Statistics':
    '/slides/nasa-nssta/slide-05.png',
  'Sampling Methods and Techniques used in Large Scale Sample Surveys':
    '/slides/nasa-nssta/slide-06.png',
  'Demography and Population Studies':
    '/slides/nasa-nssta/slide-07.png',
  'Training of Trainers (TOT) - Index Numbers and Price Statistics':
    '/slides/nasa-nssta/slide-08.png',
  'Training of Trainers (TOT) - National Accounts Statistics':
    '/slides/nasa-nssta/slide-09.png',
  'Planning and Designing of Large Scale Sample Surveys':
    '/slides/nasa-nssta/slide-10.png',
  'Handling Large Scale Data & Data Analysis using R':
    '/slides/nasa-nssta/slide-11.png',
  'Big Data Analysis':
    '/slides/nasa-nssta/slide-12.png',
  'Poverty Analysis and measuring Inequality':
    '/slides/nasa-nssta/slide-13.png',
  'Labour Force and Employment Statistics':
    '/slides/nasa-nssta/slide-14.png',
  'Artificial Intelligence (AI) and Concept of Block Chain':
    '/slides/nasa-nssta/slide-15.png',
  'Communication Skill Development':
    '/slides/nasa-nssta/slide-16.png',
  'Python Training for Statisticians':
    '/slides/nasa-nssta/slide-17.png',
  'Data Analysts and Data Ware House':
    '/slides/nasa-nssta/slide-18.png',
  'Advanced Sampling Techniques with practical examples from NSSO surveys, Health surveys etc.':
    '/slides/nasa-nssta/slide-19.png',
  'Data Mining Techniques and Data Analysis':
    '/slides/nasa-nssta/slide-20.png',
  'Training on Artificial Intelligence and Machine Learning':
    '/slides/nasa-nssta/slide-21.png',
  'Current Economic Issues':
    '/slides/nasa-nssta/slide-22.png',
  'Induction Training Programme for New Recruits - Subordinate Statistical Service (SSS)':
    '/slides/nasa-nssta/slide-23.png',
  'Sample Survey Methodology & Estimation':
    '/slides/nasa-nssta/slide-24.png',
}

function resolveThumbnail(title = '') {
  const trimmed = title.trim()
  if (COURSE_TITLE_THUMBNAILS[trimmed]) {
    return COURSE_TITLE_THUMBNAILS[trimmed]
  }

  const s = trimmed.toLowerCase()
  if (/python|pandas|numpy/i.test(s)) return 'https://img.youtube.com/vi/KgCgpCIOkIs/mqdefault.jpg'
  if (/software dev|code|git|testing|developer/i.test(s)) return 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=640&auto=format&fit=crop&q=80'
  if (/cyber|security|privacy|phish|vulnerability/i.test(s)) return 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=640&auto=format&fit=crop&q=80'
  if (/sql|database|relational|query/i.test(s)) return 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=640&auto=format&fit=crop&q=80'
  if (/machine learning|ml|deep learning|neural/i.test(s)) return 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=640&auto=format&fit=crop&q=80'
  if (/ai|artificial intelligence|generative ai|llm/i.test(s)) return 'https://img.youtube.com/vi/Vz8zcKawwEo/mqdefault.jpg'
  if (/cloud|aws|azure|virtualization/i.test(s)) return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=640&auto=format&fit=crop&q=80'
  if (/data engineering|pipeline|etl|warehouse/i.test(s)) return 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=640&auto=format&fit=crop&q=80'
  if (/visuali[sz]ation|chart|graph|dashboard|bi/i.test(s)) return 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=640&auto=format&fit=crop&q=80'
  if (/devops|ci\/cd|deploy|docker|kubernetes/i.test(s)) return 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=640&auto=format&fit=crop&q=80'
  if (/web app|frontend|backend|fullstack|javascript|html/i.test(s)) return 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=640&auto=format&fit=crop&q=80'
  if (/gis|spatial|mapping|remote sensing/i.test(s)) return 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=640&auto=format&fit=crop&q=80'
  if (/blockchain|distributed ledger/i.test(s)) return 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=640&auto=format&fit=crop&q=80'
  if (/api|rest|integration/i.test(s)) return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=640&auto=format&fit=crop&q=80'
  if (/identity|aadhaar|auth/i.test(s)) return 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=640&auto=format&fit=crop&q=80'
  if (/open data|data sharing/i.test(s)) return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=640&auto=format&fit=crop&q=80'
  if (/accessib|inclusive/i.test(s)) return 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=640&auto=format&fit=crop&q=80'
  if (/ui|ux|service design|citizen/i.test(s)) return 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=640&auto=format&fit=crop&q=80'
  if (/communicat|presentation|speaking/i.test(s)) return 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=640&auto=format&fit=crop&q=80'
  if (/leader|manage|supervis/i.test(s)) return 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=640&auto=format&fit=crop&q=80'
  if (/problem solving|decision|critical thinking/i.test(s)) return 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=640&auto=format&fit=crop&q=80'
  if (/team|collab/i.test(s)) return 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=640&auto=format&fit=crop&q=80'
  if (/ethic|integrity|conduct/i.test(s)) return 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=640&auto=format&fit=crop&q=80'
  if (/time|productiv/i.test(s)) return 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=640&auto=format&fit=crop&q=80'
  if (/negotiat|stakeholder/i.test(s)) return 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=640&auto=format&fit=crop&q=80'
  if (/emotion|eq|empathy/i.test(s)) return 'https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=640&auto=format&fit=crop&q=80'
  if (/change management/i.test(s)) return 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=640&auto=format&fit=crop&q=80'
  if (/stress|resilience|wellness/i.test(s)) return 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=640&auto=format&fit=crop&q=80'
  if (/sustainable|sdg/i.test(s)) return 'https://img.youtube.com/vi/hTnnf9AhDLM/mqdefault.jpg'
  if (/data protection|dpdp/i.test(s)) return 'https://img.youtube.com/vi/FUQW44EFmQQ/mqdefault.jpg'
  if (/nyaya sanhita|bns|law|legal/i.test(s)) return 'https://img.youtube.com/vi/B_jQ3DlrVs4/mqdefault.jpg'
  if (/finance|karmayogi|invest/i.test(s)) return 'https://img.youtube.com/vi/kCthkqPKySw/mqdefault.jpg'
  if (/statistic|survey|sampling|national accounts|price|cpi|wpi|nssta|mospi|des|nsso/i.test(s)) return '/slides/nasa-nssta/slide-01.png'

  return 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=640&auto=format&fit=crop&q=80'
}

async function run() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected.')

    const courses = await Course.find({})
    console.log(`Found ${courses.length} courses to update.`)

    let updatedCount = 0
    for (const course of courses) {
      const thumb = resolveThumbnail(course.title)
      if (thumb && course.thumbnailUrl !== thumb) {
        course.thumbnailUrl = thumb
        if (!course.thumbnail) course.thumbnail = thumb
        await course.save()
        updatedCount++
      }
    }

    console.log(`Successfully updated ${updatedCount} courses with permanent thumbnails in MongoDB.`)
    if (require.main === module) process.exit(0)
  } catch (err) {
    console.error('Update failed:', err)
    if (require.main === module) process.exit(1)
  }
}

if (require.main === module) {
  run()
}

module.exports = {
  resolveThumbnail,
  COURSE_TITLE_THUMBNAILS,
}
