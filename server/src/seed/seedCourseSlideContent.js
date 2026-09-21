'use strict'

const mongoose = require('mongoose')
require('../models')
const Course = require('../models/Course')

const REAL_NSSTA_SLIDES = [
  {
    slideNumber: 1,
    title: 'Presentation on Activities of NASA',
    imageUrl: '/slides/nasa-nssta/slide-01.png',
    bulletPoints: [
      'Presentation on Activities of National Academy of Statistical Administration (NASA)',
      'GSN Murthy, DDG - NASA, MOSPI',
      'Ministry of Statistics & Programme Implementation, Government of India',
    ],
  },
  {
    slideNumber: 2,
    title: 'Outline of the Presentation',
    imageUrl: '/slides/nasa-nssta/slide-02.png',
    bulletPoints: [
      'Importance of Training',
      'Mandate / Vision / Aims & Objective of NASA',
      'Type of Training Programmes organized by NASA',
      'Resources: Personnel and Infrastructure',
      'Areas of Training Programmes',
      'Achievements and Way Forward',
    ],
  },
  {
    slideNumber: 3,
    title: 'Importance of Training',
    imageUrl: '/slides/nasa-nssta/slide-03.png',
    bulletPoints: [
      'Training is one of the critical components in the framework of Human Resource Development.',
      'Training enhances the efficiency, growth, quality of skill of new entrants and working employees as well.',
      'Increasing the potential of human capital across statistical organizations.',
    ],
  },
  {
    slideNumber: 4,
    title: 'Mandate of NASA',
    imageUrl: '/slides/nasa-nssta/slide-04.png',
    bulletPoints: [
      'National Academy of Statistical Administration (NASA) established on 13th February, 2009.',
      'Mandate: Training on official Statistics and related discipline to the statistical personnel of the Central/State Govt./PSU and neighbouring/developing countries.',
    ],
  },
  {
    slideNumber: 5,
    title: 'Vision of NASA',
    imageUrl: '/slides/nasa-nssta/slide-05.png',
    bulletPoints: [
      'To be a Centre of Excellence in imparting training on Official Statistics & Related Methodology and undertaking research activities thereto.',
    ],
  },
  {
    slideNumber: 6,
    title: 'Aims & Objective',
    imageUrl: '/slides/nasa-nssta/slide-06.png',
    bulletPoints: [
      'To strengthen the statistical system by creating trained manpower in theoretical and official statistics to manage data collection, compilation, analysis and dissemination.',
      'To create a national pool of certified statistical trainers.',
      'To facilitate and organize international training programmes for SAARC and developing nations.',
      'To assess training needs and develop capacity development strategies for statistical personnel.',
      'To promote and undertake research in official statistics.',
    ],
  },
  {
    slideNumber: 7,
    title: 'Type of Training Programmes',
    imageUrl: '/slides/nasa-nssta/slide-07.png',
    bulletPoints: [
      'Domestic: Induction Training Programmes, Refresher Training Programmes, Mandatory and Domain Specific Trainings.',
      'Other Training Programmes: Need Based Programmes, Awareness Programmes, TOT programmes, and workshops.',
      'International Training Programmes for global statistical officers.',
    ],
  },
  {
    slideNumber: 8,
    title: 'Induction Training Programmes',
    imageUrl: '/slides/nasa-nssta/slide-08.png',
    bulletPoints: [
      'Indian Statistical Service (ISS) Officers: 1.5 years academic and 6 months on the job training (total of 2 years).',
      'Promotee officers from SSS cadre to Junior Time Scale of ISS: 6 weeks (2 weeks IT, 2 weeks official & basic statistics, 1 week office procedures, 1 week field visit).',
      'Subordinate Statistical Personnel (SSS): 6-7 weeks (3 weeks at NASA, 3-4 weeks at Zonal Training Centres of FOD).',
    ],
  },
  {
    slideNumber: 9,
    title: 'Refresher Training Programmes',
    imageUrl: '/slides/nasa-nssta/slide-09.png',
    bulletPoints: [
      'Mandatory Programmes for ISS in-service Officers: On average 5 programmes annually.',
      'Domain Specific Training Programmes: For ISS officers (at least 6 programmes), SSS officials (10 programmes of 1-week duration), and State Statistical Officers from DES (6 programmes of 1-2 weeks duration).',
    ],
  },
  {
    slideNumber: 10,
    title: 'Other Training Programmes',
    imageUrl: '/slides/nasa-nssta/slide-10.png',
    bulletPoints: [
      'Training Programme for M.Stat students of ISI: 3-week training on official statistics (1 week class room lectures and 2 weeks on project work).',
      'Training Programmes for popularizing Official Statistics: 1-week programme on official statistics for Heads/Senior Professors of Departments of Statistics as TOT programme.',
    ],
  },
  {
    slideNumber: 11,
    title: 'Other Training Programmes (Contd)',
    imageUrl: '/slides/nasa-nssta/slide-11.png',
    bulletPoints: [
      'Two Training Programmes for PG Students on official Statistics (1-week duration).',
      'At least 3 one-day workshops at University Campuses.',
      'Organizing national seminars and technical symposiums.',
    ],
  },
  {
    slideNumber: 12,
    title: 'International Training Programmes',
    imageUrl: '/slides/nasa-nssta/slide-12.png',
    bulletPoints: [
      'International Statistics Education Centre (ISEC): 6-week training programme on Official Statistics & Related Methodology of ISEC participants as per requirement of ISI Kolkata/Delhi.',
      'Need Based Training Programmes based on requests received from neighbouring or SAARC countries.',
    ],
  },
  {
    slideNumber: 13,
    title: 'Resource Persons & Collaborations',
    imageUrl: '/slides/nasa-nssta/slide-13.png',
    bulletPoints: [
      'Apart from regular faculty, NASA draws specialized faculty from various Ministries.',
      'Invites senior professors from Universities, teaching and research institutions.',
      'Collaborating institutions: IIMs, ISI, JNU, ASCI, IASRI, NIFM, IIPA, IIPS, Labour Bureau, VV Giri National Labour Institute.',
    ],
  },
  {
    slideNumber: 14,
    title: 'Areas of Training: Core Statistics',
    imageUrl: '/slides/nasa-nssta/slide-14.png',
    bulletPoints: [
      'Demography & Population studies.',
      'Index Numbers, Concept of Composite Index, Development Indices.',
      'Sample Survey Methodology and designs (focus on NSSO surveys).',
      'Data Processing: Validation, imputation of missing data, analysis and preparation of survey reports.',
      'Statistical Methods & Applied Econometrics (ARIMA, ARCH, GARCH with SPSS/STATA/E-Views).',
    ],
  },
  {
    slideNumber: 15,
    title: 'Areas of Training: Official Statistics',
    imageUrl: '/slides/nasa-nssta/slide-15.png',
    bulletPoints: [
      'Fundamentals of Official Statistical System in India.',
      'System of official statistics: Agriculture, Census, Irrigation, Industry, Education, Labour, Health, MDG.',
      'Financial Statistics: Insurance, Taxation, Banking, Trade, Balance of Payments.',
      'System of National Accounts and Indian Budgeting Process.',
    ],
  },
  {
    slideNumber: 16,
    title: 'Areas of Training: IT Related',
    imageUrl: '/slides/nasa-nssta/slide-16.png',
    bulletPoints: [
      'Basic IT Module: MS Office, Internet & RDBMS.',
      'Advanced Training in IT: C++, Oracle, .NET, ASP.NET, Visual Basic.',
      'Module on the use of IT Tools: SPSS, STATA, SAS, R software.',
    ],
  },
  {
    slideNumber: 17,
    title: 'Areas of Training: Other Related Subjects',
    imageUrl: '/slides/nasa-nssta/slide-17.png',
    bulletPoints: [
      'Basics of Micro and Macro Economic Theory and its interpretation.',
      'Monetary and Fiscal Policy Concepts and understanding current economic policies.',
      'Basic Modern Management Practices with case studies.',
      'Application of Geographic Information System (GIS) & Remote Sensing.',
    ],
  },
  {
    slideNumber: 18,
    title: 'NASA - Achievements',
    imageUrl: '/slides/nasa-nssta/slide-18.png',
    bulletPoints: [
      'No. of Trainees (2009-10): 1,066 trainees.',
      'No. of Trainees (2010-11): 1,068 trainees across 65 programmes.',
      'No. of Trainees (2011-12): 1,400 trainees across 61 programmes.',
      'No. of Trainees (2012-13): 1,500 trainees across 55 programmes.',
      'NASA conducted 15 International Training Programmes during 2012-13.',
    ],
  },
  {
    slideNumber: 19,
    title: 'International Training / Workshops (2012-13)',
    imageUrl: '/slides/nasa-nssta/slide-19.png',
    bulletPoints: [
      'Data Analysis and Report Writing using STATA for Afghanistan participants.',
      'National Accounts Statistics and Price Statistics for Afghanistan CSO officers.',
      'Planning and Designing of Sample Survey followed by 1-week field attachment.',
      'Agriculture & Gender Statistics using GIS for SAARC participants.',
      'Demography & Population studies for DCS Sri Lanka and Maldives.',
    ],
  },
  {
    slideNumber: 20,
    title: 'Recent Initiatives',
    imageUrl: '/slides/nasa-nssta/slide-20.png',
    bulletPoints: [
      'Internship Scheme for University Students.',
      'Revision of Course Curriculum & preparation of Training Manuals.',
      'Training Courses for Heads of Department and Students of Statistics from Universities.',
      'Assessment of Training Needs (TNA).',
      'Participation with international and regional statistical organisations.',
    ],
  },
  {
    slideNumber: 21,
    title: 'Infrastructure Facilities at NASA',
    imageUrl: '/slides/nasa-nssta/slide-21.png',
    bulletPoints: [
      'Apex statistical training academy situated in Knowledge Park II, Greater Noida.',
      'Comprehensive integrated campus with world-class academic, administrative, and residential facilities.',
      'Dedicated power backup, high-speed campus network, and modern teaching aids.',
    ],
  },
  {
    slideNumber: 22,
    title: 'Academic Block',
    imageUrl: '/slides/nasa-nssta/slide-22.png',
    bulletPoints: [
      'Centrally Air-conditioned Auditorium with all digital and sound system (160 persons).',
      'Conference Hall (60 persons).',
      '5 Lecture/Seminar Halls with electronic modern teaching equipment and computer facilities.',
      'Sukhatme Library equipped with extensive IT facilities.',
      'Full-fledged Cafeteria and 24-hr power backup.',
    ],
  },
  {
    slideNumber: 23,
    title: 'Hostel / Residential Block',
    imageUrl: '/slides/nasa-nssta/slide-23.png',
    bulletPoints: [
      'Hostel Block: 40 single, 30 double bedded AC rooms (Total Capacity: 100 persons).',
      '6 VIP suites / Guest Rooms for visiting dignitaries and international faculty.',
      'Air-conditioned Dining Hall, Lounge with TV and entertainment facilities.',
      'Facilities for indoor and outdoor games, Yoga Centre, Gym.',
      'Residential Block: 20 residential quarters for officers & staff.',
    ],
  },
  {
    slideNumber: 24,
    title: 'Way Forward',
    imageUrl: '/slides/nasa-nssta/slide-24.png',
    bulletPoints: [
      'NASA is organizing training on official statistics to other in-service officers (IAS, IFS, IA&AS, IRS etc.).',
      'NASA will bring out an Annual Journal on Official Statistics.',
      'Setting up research and consultancy wings to enhance research activities.',
      'Enhancing infrastructure facilities to accommodate more national and international training programmes.',
    ],
  },
  {
    slideNumber: 25,
    title: 'Glimpse of NASA',
    imageUrl: '/slides/nasa-nssta/slide-25.png',
    bulletPoints: [
      'National Academy of Statistical Administration (NASA)',
      'Central Statistics Office (CSO)',
      'Ministry of Statistics & Programme Implementation (MoSPI)',
    ],
  },
  {
    slideNumber: 26,
    title: 'Administrative Block & Headquarters',
    imageUrl: '/slides/nasa-nssta/slide-26.png',
    bulletPoints: [
      'Administrative headquarters of the National Academy of Statistical Administration.',
      'Architectural facade of NASA main block at Greater Noida campus.',
    ],
  },
  {
    slideNumber: 27,
    title: 'NASA Main Entrance & Knowledge Park',
    imageUrl: '/slides/nasa-nssta/slide-27.png',
    bulletPoints: [
      'Main entrance gate at 22 Knowledge Park II, Greater Noida.',
      'Secure perimeter and landscaped approach driveway to academic blocks.',
    ],
  },
  {
    slideNumber: 28,
    title: 'Academic Block Front View',
    imageUrl: '/slides/nasa-nssta/slide-28.png',
    bulletPoints: [
      'Panoramic front view of the Academic Block.',
      'Centrally planned academic complex with circular landscaped flower beds and lawns.',
    ],
  },
  {
    slideNumber: 29,
    title: 'Campus Grounds & Hostels',
    imageUrl: '/slides/nasa-nssta/slide-29.png',
    bulletPoints: [
      'Hostel and residential complex view with paved roads and manicured greenery.',
      'Serene learning environment supporting residential participants and visiting scholars.',
    ],
  },
  {
    slideNumber: 30,
    title: 'Discussion & Queries',
    imageUrl: '/slides/nasa-nssta/slide-30.png',
    bulletPoints: [
      'Open for discussion.',
      'Seeking queries, clarifications, and collaborative institutional feedback.',
    ],
  },
  {
    slideNumber: 31,
    title: 'Thank You',
    imageUrl: '/slides/nasa-nssta/slide-31.png',
    bulletPoints: [
      'Thank you for your engagement with National Academy of Statistical Administration (NASA / NSSTA).',
      'Contact: rc.nssta.india@gmail.com',
      'Greater Noida, Uttar Pradesh, India.',
    ],
  },
]

async function seedCourseSlideContent() {
  const course = await Course.findOne({
    title: { $regex: /Official Statistics Awareness Programme/i },
  })

  if (!course) {
    console.warn('[seedCourseSlideContent] Course "Official Statistics Awareness Programme" not found.')
    return
  }

  // Ensure YouTube URL is cleared so learner fallback uses the slide viewer
  course.youtubeUrl = ''
  course.slides = REAL_NSSTA_SLIDES

  if (course.modules && course.modules.length > 0) {
    // Distribute slides across modules
    const chunkSize = Math.ceil(REAL_NSSTA_SLIDES.length / course.modules.length)
    course.modules.forEach((mod, idx) => {
      mod.youtubeUrl = ''
      const start = idx * chunkSize
      const end = start + chunkSize
      mod.slides = REAL_NSSTA_SLIDES.slice(start, end)
    })
  }

  await course.save()
  console.log(`[seedCourseSlideContent] Successfully seeded ${REAL_NSSTA_SLIDES.length} visual slides for "${course.title}" (ID: ${course._id})`)
}

module.exports = { seedCourseSlideContent, REAL_NSSTA_SLIDES }

if (require.main === module) {
  require('dotenv').config()
  const { connectDB } = require('../config/db')

  connectDB()
    .then(async () => {
      await seedCourseSlideContent()
      await mongoose.disconnect()
      process.exit(0)
    })
    .catch((err) => {
      console.error('[seedCourseSlideContent] Error:', err)
      process.exit(1)
    })
}
