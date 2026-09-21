'use strict'

const mongoose = require('mongoose')
const Course = require('../models/Course')

const REAL_NSSTA_SLIDES = [
  {
    slideNumber: 1,
    title: 'About NASA / NSSTA',
    bulletPoints: [
      'National Academy of Statistical Administration (NASA) was established in 2009 under the Ministry of Statistics and Programme Implementation (MoSPI), Government of India.',
      'Subsequently rechristened as National Statistical Systems Training Academy (NSSTA) to reflect its broader mandate in official statistical systems.',
      'Located in Greater Noida, Uttar Pradesh, serving as the premier apex training institute in official statistics.',
      'Mandated to cater to the capacity building and statistical training needs of India and developing nations.',
    ],
  },
  {
    slideNumber: 2,
    title: 'Aims & Objectives',
    bulletPoints: [
      'Human resource development in official statistics for Central and State Governments, public sector undertakings, and academia.',
      'Impart intensive induction and in-service training to Indian Statistical Service (ISS) and Subordinate Statistical Service (SSS) officers.',
      'Popularise official statistics and foster statistical literacy among university faculty, research scholars, and postgraduate students.',
      'Build capability in modern survey methodologies, national accounts, data analytics, and statistical governance.',
      'Serve as a centre of excellence for international participants from SAARC, Commonwealth, and developing countries.',
    ],
  },
  {
    slideNumber: 3,
    title: 'Types of Training Programmes',
    bulletPoints: [
      'Induction Training Programmes: Long-term foundational training for newly recruited ISS and SSS probationary officers.',
      'Refresher Training Programmes: In-service domain-specific refresher modules for serving statistical officers.',
      'Awareness Programmes: Specialised workshops for university professors, lecturers, and postgraduate students to bridge academia and official statistics.',
      'Training of Trainers (TOT): Building institutional capacity and pedagogical skills for state statistical trainers.',
      'Workshops & Seminars: National and international technical seminars on emerging statistical domains and methodologies.',
    ],
  },
  {
    slideNumber: 4,
    title: 'Areas of Training',
    bulletPoints: [
      'Core Statistics: Probability theory, sampling techniques, estimation procedures, and statistical inference.',
      'Official Statistical System: Indian statistical system architecture, national accounts, price statistics, index numbers, and SDG monitoring.',
      'IT-related Training: Statistical computing and packages including R, Python, SPSS, SAS, and database query languages.',
      'Other Subjects: Administrative rules, financial management, public procurement, governance, and soft skills.',
    ],
  },
  {
    slideNumber: 5,
    title: 'Achievements',
    bulletPoints: [
      'Substantial year-on-year growth in officers, researchers, and students trained across government cadres and universities.',
      '2009–10: 1,066 participants trained across foundational and specialized courses.',
      '2010–11: 1,068 participants trained across national and international batches.',
      '2011–12: 1,400 participants trained with expanded academic and departmental outreach.',
      '2012–13: 1,500 participants trained, reflecting expanding nationwide institutional outreach.',
    ],
  },
  {
    slideNumber: 6,
    title: 'Infrastructure',
    bulletPoints: [
      'State-of-the-art fully air-conditioned Auditorium equipped with advanced acoustics and audio-visual presentation systems.',
      'Modern residential Hostel Block providing comfortable on-campus accommodation for national and international trainees.',
      'Comprehensive Library facilities with extensive collections of statistical reports, journals, manuals, and digital resources.',
      'Hi-tech computer laboratories with high-speed internet, dedicated statistical software workstations, and smart classrooms.',
    ],
  },
  {
    slideNumber: 7,
    title: 'Enrollment',
    bulletPoints: [
      'Contact Email: rc.nssta.india@gmail.com',
      'Training programmes for university professors and postgraduate students are conducted completely free of cost.',
      'Residential programme with boarding and lodging provided at the NSSTA Greater Noida campus.',
      'Nominations invited through university heads of department and competent academic authorities.',
    ],
  },
]

async function seedCourseSlideContent() {
  const courseTitleRegex = /Official Statistics Awareness Programme for University Professors and PG Students/i
  const course = await Course.findOne({ title: courseTitleRegex })

  if (!course) {
    console.log('[seedCourseSlideContent] Course "Official Statistics Awareness Programme" not found in DB. Skipping.')
    return null
  }

  // Update course with real slides, ensure no youtubeUrl, and update modules
  course.youtubeUrl = '' // No video - slide-based content
  course.slides = REAL_NSSTA_SLIDES

  // Ensure modules have slides
  course.modules = [
    {
      title: 'Module 1: NSSTA Overview & Institutional Mandate',
      durationMins: 30,
      youtubeUrl: '',
      slides: REAL_NSSTA_SLIDES.slice(0, 2),
    },
    {
      title: 'Module 2: Training Architecture & Curricula',
      durationMins: 45,
      youtubeUrl: '',
      slides: REAL_NSSTA_SLIDES.slice(2, 4),
    },
    {
      title: 'Module 3: Institutional Achievements & Growth',
      durationMins: 30,
      youtubeUrl: '',
      slides: REAL_NSSTA_SLIDES.slice(4, 5),
    },
    {
      title: 'Module 4: Infrastructure & Academic Facilities',
      durationMins: 30,
      youtubeUrl: '',
      slides: REAL_NSSTA_SLIDES.slice(5, 6),
    },
    {
      title: 'Module 5: Enrollment, Participation & Guidelines',
      durationMins: 20,
      youtubeUrl: '',
      slides: REAL_NSSTA_SLIDES.slice(6, 7),
    },
  ]

  await course.save()
  console.log(`[seedCourseSlideContent] Successfully seeded 7 real slides to "${course.title}" (${course._id}).`)
  return course
}

// Standalone execution support
if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kaushalai'
  mongoose.connect(uri)
    .then(async () => {
      await seedCourseSlideContent()
      process.exit(0)
    })
    .catch((err) => {
      console.error('Error running seedCourseSlideContent:', err)
      process.exit(1)
    })
}

module.exports = { seedCourseSlideContent, REAL_NSSTA_SLIDES }
