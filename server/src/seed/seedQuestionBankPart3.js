'use strict'
/**
 * seedQuestionBankPart3.js
 * Curated Question Bank Seeding Engine for Part 3 Diagnostic Assessment
 * Populates 131 realistic scenario-style questions across Levels 1-5 and target competencies.
 */

const mongoose = require('mongoose')
const Competency = require('../models/Competency')
const Question = require('../models/Question')
const Assessment = require('../models/Assessment')

// Target competencies definition
const REQUIRED_COMPETENCIES = [
  // Level 1
  { name: 'Digital Literacy', category: 'technical', competencyCode: 'DL-01', description: 'Fundamental operational understanding of computer hardware, OS, browsers, and digital files.' },
  { name: 'Cybersecurity Awareness', category: 'technical', competencyCode: 'CA-01', description: 'Recognizing phishing threats, malware, credential security, and safe browsing practices.' },
  { name: 'Email & Communication', category: 'behavioural', competencyCode: 'EC-01', description: 'Official email protocols, clear message framing, drafting, and respectful communication.' },
  { name: 'Government Digital Platforms', category: 'digital_governance', competencyCode: 'GDP-01', description: 'Navigating government portals, e-Office, SPARROW, PFMS, GeM, and iGOT.' },
  { name: 'Basic Document Handling', category: 'technical', competencyCode: 'BDH-01', description: 'Scanning, converting, archiving, naming, and categorizing administrative documents.' },

  // Level 2
  { name: 'MS Office/Productivity', category: 'technical', competencyCode: 'MOP-02', description: 'Spreadsheet formulas, formatted memos in Word, and structured slide preparation.' },
  { name: 'Digital Documentation', category: 'technical', competencyCode: 'DD-02', description: 'Metadata indexing, PDF signing, template management, and audit trails.' },
  { name: 'Data Entry & Validation', category: 'statistical', competencyCode: 'DEV-02', description: 'Accurate data input, outlier checks, duplicate identification, and field validation.' },
  { name: 'Email/Communication', category: 'behavioural', competencyCode: 'EC-02', description: 'Formal inter-departmental memoranda, ticketing, and query resolution.' },
  { name: 'Basic e-Governance', category: 'digital_governance', competencyCode: 'BEG-02', description: 'Workflow automation, digital signatures, citizens charter, and RTI portal handling.' },

  // Level 3
  { name: 'Data Interpretation', category: 'statistical', competencyCode: 'DI-03', description: 'Extracting actionable insights from tables, trend graphs, and variance matrices.' },
  { name: 'Digital Governance', category: 'digital_governance', competencyCode: 'DG-03', description: 'Implementing e-governance standards, citizen service delivery, and compliance rules.' },
  { name: 'Process Management', category: 'technical', competencyCode: 'PM-03', description: 'Monitoring SOP adherence, identifying bottlenecks, and optimizing turnaround time.' },
  { name: 'Information Security', category: 'technical', competencyCode: 'IS-03', description: 'Data classification, access control lists, incident escalation, and CERT-In compliance.' },
  { name: 'Problem Solving', category: 'behavioural', competencyCode: 'PS-03', description: 'Root cause analysis, collaborative troubleshooting, and contingency handling.' },

  // Level 4
  { name: 'Data-driven Decision Making', category: 'statistical', competencyCode: 'DDDM-04', description: 'Synthesizing statistical evidence, regression trends, and KPIs for executive decisions.' },
  { name: 'Digital Transformation', category: 'digital_governance', competencyCode: 'DT-04', description: 'Modernizing legacy processes, cloud migration strategies, and citizen-centric UX.' },
  { name: 'Cybersecurity Governance', category: 'technical', competencyCode: 'CSG-04', description: 'Security audit compliance, ISO 27001 standards, zero-trust framework, and threat mitigation.' },
  { name: 'Project/Process Management', category: 'technical', competencyCode: 'PPM-04', description: 'Agile/Waterfall execution, milestone tracking, resource balancing, and risk buffers.' },
  { name: 'Analytical Reasoning', category: 'statistical', competencyCode: 'AR-04', description: 'Evaluating statistical models, sampling biases, multi-criteria decision models.' },
  { name: 'Stakeholder Management', category: 'behavioural', competencyCode: 'SM-04', description: 'Inter-ministerial consensus building, public consultation, and executive briefings.' },

  // Level 5
  { name: 'Digital Transformation Strategy', category: 'digital_governance', competencyCode: 'DTS-05', description: 'Long-term enterprise vision, public digital infrastructure integration, and policy roadmap.' },
  { name: 'Policy Implementation', category: 'digital_governance', competencyCode: 'PI-05', description: 'Translating statutory mandates into national operational programs and monitoring systems.' },
  { name: 'Risk Management', category: 'behavioural', competencyCode: 'RM-05', description: 'Institutional risk registers, disaster recovery, continuity of operations, and compliance oversight.' },
  { name: 'Data-driven Governance', category: 'digital_governance', competencyCode: 'DDG-05', description: 'Establishing national data registries, open data initiatives, and evidence-based governance.' },
  { name: 'AI/Technology Awareness', category: 'technical', competencyCode: 'AITA-05', description: 'Strategic evaluation of artificial intelligence, ethical AI frameworks, LLMs, and automation.' },
]

async function seedQuestionBank() {
  console.log('\n================================================================')
  console.log('       DIAGNOSTIC TEST QUESTION BANK SEEDING ENGINE (PART 3)     ')
  console.log('================================================================\n')

  // 1. Ensure all competencies exist and build mapping by name
  const compMap = new Map()
  for (const item of REQUIRED_COMPETENCIES) {
    const existing = await Competency.findOne({ name: item.name })
    if (existing) {
      compMap.set(item.name, existing._id)
    } else {
      const created = await Competency.create({
        name: item.name,
        category: item.category,
        competencyCode: item.competencyCode,
        description: item.description,
      })
      compMap.set(item.name, created._id)
      console.log(`+ Created competency: ${item.name}`)
    }
  }

  // Also verify existing shared competencies from previous seeds
  const existingKeys = ['Cybersecurity', 'Communication', 'Leadership', 'Change Management']
  for (const k of existingKeys) {
    const found = await Competency.findOne({ name: k })
    if (found) compMap.set(k, found._id)
  }

  // 2. Prepare Question Bank Data
  const questionsData = [
    // ═════════════════════════════════════════════════════════════════════════
    // LEVEL 1: Support Staff (25 questions across 5 competencies)
    // ═════════════════════════════════════════════════════════════════════════
    // 1. Digital Literacy (5 questions)
    {
      level: 1,
      competency: 'Digital Literacy',
      difficulty: 'easy',
      text: 'You need to find a statistical report that you downloaded last week, but do not remember which folder it was saved to. What is the most efficient method to locate it?',
      options: [
        { id: 'opt_1', text: 'Restart the computer to restore default folders' },
        { id: 'opt_2', text: 'Use the operating system file search bar with the report name or .pdf extension' },
        { id: 'opt_3', text: 'Download the report again from the portal every time you need it' },
        { id: 'opt_4', text: 'Browse through every single folder on Drive C manually' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Using the system search bar with file extensions or title keywords allows immediate indexed retrieval without redundant downloads.'
    },
    {
      level: 1,
      competency: 'Digital Literacy',
      difficulty: 'easy',
      text: 'When a web page containing an official circular fails to load completely due to network stutter, what is the standard first action?',
      options: [
        { id: 'opt_1', text: 'Delete the web browser application immediately' },
        { id: 'opt_2', text: 'Refresh or reload the page using the refresh button or F5/Ctrl+R' },
        { id: 'opt_3', text: 'Shut down the office router manually without notice' },
        { id: 'opt_4', text: 'Disconnect the power cord from the desktop computer' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Refreshing re-initiates the HTTP request to reload cached or interrupted network assets without system interruption.'
    },
    {
      level: 1,
      competency: 'Digital Literacy',
      difficulty: 'medium',
      text: 'A colleague asks why your office computer takes several minutes to shut down and exhibits noticeable slowdowns. Which daily practice helps maintain system responsiveness?',
      options: [
        { id: 'opt_1', text: 'Closing unused background applications and restarting periodically' },
        { id: 'opt_2', text: 'Leaving 50 browser tabs open indefinitely across days' },
        { id: 'opt_3', text: 'Turning off the power switch on the UPS directly while working' },
        { id: 'opt_4', text: 'Installing third-party memory booster games from untrusted websites' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Closing dormant processes frees allocated RAM and periodic clean restarts clear volatile memory leaks.'
    },
    {
      level: 1,
      competency: 'Digital Literacy',
      difficulty: 'medium',
      text: 'You are transferring an official scanned record to an external USB storage drive provided by your IT division. What should you do before unplugging the drive?',
      options: [
        { id: 'opt_1', text: 'Pull the USB drive out as soon as the progress bar reaches 100%' },
        { id: 'opt_2', text: 'Use the "Safely Remove Hardware and Eject Media" option in the taskbar' },
        { id: 'opt_3', text: 'Format the computer main drive before disconnecting' },
        { id: 'opt_4', text: 'Switch off the monitor only' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Ejecting media ensures all write buffers are flushed to disk, preventing filesystem corruption and truncated files.'
    },
    {
      level: 1,
      competency: 'Digital Literacy',
      difficulty: 'hard',
      text: 'You notice your desktop monitor resolution has distorted the text, making tables hard to read. Where in the operating system can this setting be corrected safely?',
      options: [
        { id: 'opt_1', text: 'Display Settings under System Settings' },
        { id: 'opt_2', text: 'The browser bookmark manager' },
        { id: 'opt_3', text: 'Command prompt by running format commands' },
        { id: 'opt_4', text: 'Adjusting the power cable tension behind the desk' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Operating system Display Settings provide native resolution controls to match the monitor hardware aspect ratio.'
    },

    // 2. Cybersecurity Awareness (5 questions)
    {
      level: 1,
      competency: 'Cybersecurity Awareness',
      difficulty: 'easy',
      text: 'You receive an urgent email from an unrecognized sender claiming your email will be deactivated within 1 hour unless you click a link and enter your government password. What should you do?',
      options: [
        { id: 'opt_1', text: 'Click the link quickly and enter the password to prevent deactivation' },
        { id: 'opt_2', text: 'Forward the link to all colleagues so they can test it first' },
        { id: 'opt_3', text: 'Do not click the link; flag as phishing and report to the IT/NIC Helpdesk' },
        { id: 'opt_4', text: 'Reply to the sender asking if they are genuine' }
      ],
      correct_option_id: 'opt_3',
      explanation: 'Urgency lures requesting credentials are classic phishing attempts. Official administrators never ask for passwords via external email links.'
    },
    {
      level: 1,
      competency: 'Cybersecurity Awareness',
      difficulty: 'medium',
      text: 'Which of the following is the most secure method for handling your official portal password?',
      options: [
        { id: 'opt_1', text: 'Write it on a sticky note attached beneath the monitor' },
        { id: 'opt_2', text: 'Use a strong unique password and never share it with any colleague or vendor' },
        { id: 'opt_3', text: 'Share it with your peer so work continues while you are on leave' },
        { id: 'opt_4', text: 'Use your name or birth year as the password for easy recall' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Password confidentiality is non-negotiable under government cybersecurity guidelines; accounts represent personal accountability.'
    },
    {
      level: 1,
      competency: 'Cybersecurity Awareness',
      difficulty: 'medium',
      text: 'When leaving your workstation for a 15-minute tea break, what security action is mandatory under office cyber hygiene rules?',
      options: [
        { id: 'opt_1', text: 'Turn off the office light switch' },
        { id: 'opt_2', text: 'Lock your screen (Windows Key + L)' },
        { id: 'opt_3', text: 'Minimize all active windows so they are hidden from view' },
        { id: 'opt_4', text: 'Leave the portal open for automatic session expiry' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Locking the screen prevents unauthorized physical access and protects active sessions and official correspondence.'
    },
    {
      level: 1,
      competency: 'Cybersecurity Awareness',
      difficulty: 'hard',
      text: 'A visitor asks to plug their smartphone into your official office desktop computer to charge the battery. What should your response be?',
      options: [
        { id: 'opt_1', text: 'Permit it only if the phone appears modern' },
        { id: 'opt_2', text: 'Politely refuse and direct them to a wall socket charger instead' },
        { id: 'opt_3', text: 'Connect it to the front USB port only' },
        { id: 'opt_4', text: 'Allow it if they promise not to open any files' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Connecting unknown mobile devices via USB introduces risks of data exfiltration and malware infection (BadUSB/Juice Jacking).'
    },
    {
      level: 1,
      competency: 'Cybersecurity Awareness',
      difficulty: 'hard',
      text: 'Your computer displays a sudden pop-up window stating "Your PC is infected! Call this number immediately to clean viruses." What is the correct response?',
      options: [
        { id: 'opt_1', text: 'Call the telephone number and provide remote desktop access' },
        { id: 'opt_2', text: 'Close the browser tab/process, disconnect network if uncertain, and notify IT support' },
        { id: 'opt_3', text: 'Make an online payment using personal debit card to clear the alert' },
        { id: 'opt_4', text: 'Click "Download Cleaner Now" to fix it yourself' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Scareware browser pop-ups aim to deceive staff into surrendering remote access. Official antivirus does not request phone calls.'
    },

    // 3. Email & Communication (5 questions)
    {
      level: 1,
      competency: 'Email & Communication',
      difficulty: 'easy',
      text: 'When sending an official email to an external vendor regarding dispatch of stationery, what should always be entered in the Subject line?',
      options: [
        { id: 'opt_1', text: 'URGENT PLEASE READ NOW!!' },
        { id: 'opt_2', text: 'A concise description such as "Dispatch Status: MoSPI Stationery Order Ref #402"' },
        { id: 'opt_3', text: 'Leave it blank to save time' },
        { id: 'opt_4', text: 'Your personal nickname' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'A clear, descriptive subject line with reference numbers ensures immediate prioritization and reliable archival indexing.'
    },
    {
      level: 1,
      competency: 'Email & Communication',
      difficulty: 'medium',
      text: 'You need to send an email to a senior officer with a scanned circular attached. Before clicking "Send", which check is essential?',
      options: [
        { id: 'opt_1', text: 'Confirming that the attachment is properly attached and readable, and recipient email is correct' },
        { id: 'opt_2', text: 'Adding 10 exclamation marks to ensure prompt opening' },
        { id: 'opt_3', text: 'Changing the email font to bright red color' },
        { id: 'opt_4', text: 'CC-ing the entire ministry roster' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Verifying recipient address accuracy and opening the attached file to ensure legibility prevents communication delays.'
    },
    {
      level: 1,
      competency: 'Email & Communication',
      difficulty: 'medium',
      text: 'In an official group email thread addressed to multiple sections, when is it appropriate to use "Reply All"?',
      options: [
        { id: 'opt_1', text: 'Every time you say "Thank you" or "Acknowledged"' },
        { id: 'opt_2', text: 'Only when the response contains vital information required by everyone in the thread' },
        { id: 'opt_3', text: 'Whenever you want to show your presence to senior officers' },
        { id: 'opt_4', text: 'Never, official email systems do not allow group replies' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Reply All should be reserved for material updates needed by all participants, preventing inbox clutter.'
    },
    {
      level: 1,
      competency: 'Email & Communication',
      difficulty: 'hard',
      text: 'You drafted a response to a public grievance. What tone and format is expected in government correspondence?',
      options: [
        { id: 'opt_1', text: 'Casual, conversational text using SMS abbreviations (e.g., u, thx, plz)' },
        { id: 'opt_2', text: 'Courteous, polite, factual, and clearly referring to the grievance registration number' },
        { id: 'opt_3', text: 'Confrontational and defensive regarding office delays' },
        { id: 'opt_4', text: 'Vague statements without mentioning dates or reference numbers' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Official citizen replies must maintain professional dignity, empathy, factual precision, and statutory references.'
    },
    {
      level: 1,
      competency: 'Email & Communication',
      difficulty: 'hard',
      text: 'You received an official email marked "CONFIDENTIAL - Not for Dissemination". A colleague from another section asks you to forward it. What should you do?',
      options: [
        { id: 'opt_1', text: 'Forward it immediately because they are also a government employee' },
        { id: 'opt_2', text: 'Advise them to request it formally through their Section Head with appropriate clearance' },
        { id: 'opt_3', text: 'Post the contents on an office social media chat group' },
        { id: 'opt_4', text: 'Delete the email so neither of you has access' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Confidential records require authorized channel verification before cross-section dissemination.'
    },

    // 4. Government Digital Platforms (5 questions)
    {
      level: 1,
      competency: 'Government Digital Platforms',
      difficulty: 'easy',
      text: 'In the government e-Office application, what does "e-File" replace in conventional administrative operations?',
      options: [
        { id: 'opt_1', text: 'Physical paper files and physical green noting sheets' },
        { id: 'opt_2', text: 'The office telephone lines' },
        { id: 'opt_3', text: 'Employee attendance punch machines' },
        { id: 'opt_4', text: 'Desk furniture and chairs' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'e-Office digitizes the entire lifecycle of physical file movement, note sheets, correspondences, and approvals.'
    },
    {
      level: 1,
      competency: 'Government Digital Platforms',
      difficulty: 'medium',
      text: 'When searching for an active file in the e-Office system, which parameter gives the fastest and most accurate result?',
      options: [
        { id: 'opt_1', text: 'The exact Computer File Number / e-File Reference Number' },
        { id: 'opt_2', text: 'Randomly clicking through the "Created Files" list' },
        { id: 'opt_3', text: 'The year of birth of the dealing assistant' },
        { id: 'opt_4', text: 'The number of pages in the attachment' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'The system-generated e-File number is a globally unique index identifier across the e-Office database.'
    },
    {
      level: 1,
      competency: 'Government Digital Platforms',
      difficulty: 'medium',
      text: 'Which national platform is used by government departments for public procurement of common use goods and services?',
      options: [
        { id: 'opt_1', text: 'GeM (Government e-Marketplace)' },
        { id: 'opt_2', text: 'YouTube' },
        { id: 'opt_3', text: 'Wikipedia' },
        { id: 'opt_4', text: 'DigiLocker' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'GeM is the mandatory public procurement portal for all central government ministries and departments.'
    },
    {
      level: 1,
      competency: 'Government Digital Platforms',
      difficulty: 'hard',
      text: 'On the iGOT Karmayogi platform, what is the primary purpose of registering and completing assigned courses?',
      options: [
        { id: 'opt_1', text: 'Continuous civil service capacity building and role-based competency improvement' },
        { id: 'opt_2', text: 'Earning cash bonuses directly from the website' },
        { id: 'opt_3', text: 'Replacing regular daily office attendance' },
        { id: 'opt_4', text: 'Entering personal social media blogs' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Mission Karmayogi focuses on transition from rule-based to role-based competency capacity building.'
    },
    {
      level: 1,
      competency: 'Government Digital Platforms',
      difficulty: 'hard',
      text: 'If the biometric attendance system (AEBAS) displays "Authentication Failed" repeatedly for your entry, what is the proper immediate step?',
      options: [
        { id: 'opt_1', text: 'Force the machine open to inspect internal sensors' },
        { id: 'opt_2', text: 'Wipe finger cleanly, retry once, and if failure persists, inform the nodal officer/administrative section' },
        { id: 'opt_3', text: 'Leave the premises without informing anyone' },
        { id: 'opt_4', text: 'Have a colleague swipe their finger under your name' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Sensor cleaning resolves optical misreads; persistent biometric failure requires nodal administrative entry to avoid absence.'
    },

    // 5. Basic Document Handling (5 questions)
    {
      level: 1,
      competency: 'Basic Document Handling',
      difficulty: 'easy',
      text: 'Before scanning a 10-page paper dossier into a multi-page PDF file, what preparation is necessary?',
      options: [
        { id: 'opt_1', text: 'Remove all paperclips, pins, and staples, and verify pages are in correct sequence' },
        { id: 'opt_2', text: 'Tear each page in half to fit the scanner bed' },
        { id: 'opt_3', text: 'Wet the paper to prevent static electricity' },
        { id: 'opt_4', text: 'Color all headings with dark black marker' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Pins and staples damage automatic document feeder rollers and jam scanning mechanisms.'
    },
    {
      level: 1,
      competency: 'Basic Document Handling',
      difficulty: 'medium',
      text: 'Which file naming convention best ensures clarity and easy sorting for monthly expenditure bills in an administrative office?',
      options: [
        { id: 'opt_1', text: 'doc1_final_final(1).pdf' },
        { id: 'opt_2', text: 'MoSPI_Admin_Expenditure_July2026_Bills.pdf' },
        { id: 'opt_3', text: 'scan_new.pdf' },
        { id: 'opt_4', text: 'untitled.pdf' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Structured names including Section, Subject, Month, Year, and Document Type allow rapid cataloging.'
    },
    {
      level: 1,
      competency: 'Basic Document Handling',
      difficulty: 'medium',
      text: 'A scanned document has come out blurry and text is barely legible. Why should this scan NOT be uploaded to e-Office?',
      options: [
        { id: 'opt_1', text: 'Illegible documents cause processing delays, legal disputes, and audit objections' },
        { id: 'opt_2', text: 'The e-Office server crashes if blurry scans are uploaded' },
        { id: 'opt_3', text: 'Scanners require color photos only' },
        { id: 'opt_4', text: 'Files with blurry scans automatically get deleted within 5 minutes' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Official records must maintain evidentiary legibility to ensure reliable verification and audit validity.'
    },
    {
      level: 1,
      competency: 'Basic Document Handling',
      difficulty: 'hard',
      text: 'You are asked to convert a confidential tabular report into a standard portable format for cross-platform distribution without accidental formatting shifts. Which format is standard?',
      options: [
        { id: 'opt_1', text: 'Plain Text (.txt)' },
        { id: 'opt_2', text: 'PDF (.pdf)' },
        { id: 'opt_3', text: 'Bitmap Image (.bmp)' },
        { id: 'opt_4', text: 'Rich Text (.rtf)' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'PDF preserves layout, typography, and tabular formatting uniformly across diverse devices and operating systems.'
    },
    {
      level: 1,
      competency: 'Basic Document Handling',
      difficulty: 'hard',
      text: 'When preparing a physical file for archival preservation after digitization, what is the best practice for document binding?',
      options: [
        { id: 'opt_1', text: 'Store pages sequentially in archival file folders with docket sheets and indices' },
        { id: 'opt_2', text: 'Mix pages from different years together in one carton' },
        { id: 'opt_3', text: 'Shred all originals immediately without verification' },
        { id: 'opt_4', text: 'Wrap the stack with household adhesive tape' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Standard archival protocols mandate docket sheets, chronological indexing, and acid-free folders for physical preservation.'
    },

    // ═════════════════════════════════════════════════════════════════════════
    // LEVEL 2: Junior Assistant (26 questions across 6 competencies)
    // ═════════════════════════════════════════════════════════════════════════
    // 1. MS Office/Productivity (5 questions)
    {
      level: 2,
      competency: 'MS Office/Productivity',
      difficulty: 'easy',
      text: 'You have an Excel table with 2,000 survey entries. You need to calculate the sum of values in Column D only where Column B equals "Urban". Which formula is most appropriate?',
      options: [
        { id: 'opt_1', text: '=SUM(D:D)' },
        { id: 'opt_2', text: '=SUMIF(B:B, "Urban", D:D)' },
        { id: 'opt_3', text: '=COUNTIF(B:B, "Urban")' },
        { id: 'opt_4', text: '=AVERAGE(D:D)' }
      ],
      correct_option_id: 'opt_2',
      explanation: '=SUMIF evaluates the criteria in the range (B:B == "Urban") and aggregates the corresponding numeric entries in D:D.'
    },
    {
      level: 2,
      competency: 'MS Office/Productivity',
      difficulty: 'medium',
      text: 'In Microsoft Word, when preparing an official multi-page draft note that requires a standardized header with ministry crest and automatic page numbers (Page X of Y), where should this be configured?',
      options: [
        { id: 'opt_1', text: 'Type it manually at the top and bottom of each page' },
        { id: 'opt_2', text: 'Insert > Header & Footer tools' },
        { id: 'opt_3', text: 'Mailings tab > Labels' },
        { id: 'opt_4', text: 'Review tab > Word Count' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Header & Footer tools maintain uniform master headers and dynamic page numbering across all sections.'
    },
    {
      level: 2,
      competency: 'MS Office/Productivity',
      difficulty: 'medium',
      text: 'You need to freeze the first row of your field survey spreadsheet so that column titles remain visible while scrolling down through thousands of rows. Which feature achieves this?',
      options: [
        { id: 'opt_1', text: 'View > Freeze Panes > Freeze Top Row' },
        { id: 'opt_2', text: 'Home > Conditional Formatting' },
        { id: 'opt_3', text: 'Data > Sort Ascending' },
        { id: 'opt_4', text: 'Page Layout > Margins' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Freeze Top Row anchors row 1 to the top of the viewport during vertical scrolling.'
    },
    {
      level: 2,
      competency: 'MS Office/Productivity',
      difficulty: 'hard',
      text: 'You have two datasets: Sheet 1 has Employee ID and Name; Sheet 2 has Employee ID and Monthly Salary. Which function will bring Monthly Salary into Sheet 1 using Employee ID as the key?',
      options: [
        { id: 'opt_1', text: '=VLOOKUP or =XLOOKUP' },
        { id: 'opt_2', text: '=CONCATENATE' },
        { id: 'opt_3', text: '=STDEV.S' },
        { id: 'opt_4', text: '=PROPER' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'VLOOKUP/XLOOKUP performs relational lookups across datasets matching unique identifier keys.'
    },
    {
      level: 2,
      competency: 'MS Office/Productivity',
      difficulty: 'hard',
      text: 'In PowerPoint, when preparing an official briefing presentation for the Director, what visual design rule yields maximum executive readability?',
      options: [
        { id: 'opt_1', text: 'Fill every slide with 200 words of small text and 10 animations' },
        { id: 'opt_2', text: 'Use high-contrast legible fonts, concise bullet points, and clean supporting charts' },
        { id: 'opt_3', text: 'Use bright neon background colors with blinking transitions' },
        { id: 'opt_4', text: 'Paste raw unformatted spreadsheets across all slides' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Executive slides require high contrast, uncluttered layouts, and visual hierarchy to convey key data clearly.'
    },

    // 2. Digital Documentation (4 questions)
    {
      level: 2,
      competency: 'Digital Documentation',
      difficulty: 'medium',
      text: 'When preparing an administrative office order in PDF format for formal release, why is a Digital Signature Certificate (DSC) preferred over pasting a scanned image of a handwritten signature?',
      options: [
        { id: 'opt_1', text: 'A DSC cryptographically guarantees document integrity and non-repudiation' },
        { id: 'opt_2', text: 'A DSC makes the file size smaller' },
        { id: 'opt_3', text: 'Scanned signature images are not allowed to be saved on computers' },
        { id: 'opt_4', text: 'DSC changes the color of the text to green' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Cryptographic digital signatures (IT Act 2000 compliant) seal the document against tampering and verify identity.'
    },
    {
      level: 2,
      competency: 'Digital Documentation',
      difficulty: 'medium',
      text: 'You are archiving 50 PDF files of monthly statistical bulletins. Which metadata properties are most useful for long-term document searchability?',
      options: [
        { id: 'opt_1', text: 'Document Title, Author/Section, Subject Keywords, and Publication Date' },
        { id: 'opt_2', text: 'Color of the scanner light' },
        { id: 'opt_3', text: 'Brand of the office monitor' },
        { id: 'opt_4', text: 'Computer serial number only' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Title, Author, Subject Keywords, and Dates form Dublin Core metadata standards that power search indexing.'
    },
    {
      level: 2,
      competency: 'Digital Documentation',
      difficulty: 'hard',
      text: 'A circular drafted in Word needs to be reviewed by three section officers sequentially. Which feature allows tracking every modification and suggested wording?',
      options: [
        { id: 'opt_1', text: 'Track Changes under the Review tab' },
        { id: 'opt_2', text: 'Change font size to bold for every change' },
        { id: 'opt_3', text: 'Save as 3 different files without revision marks' },
        { id: 'opt_4', text: 'Print and rewrite by hand' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Track Changes logs deletions, additions, and inline reviewer comments with attribution and accept/reject controls.'
    },
    {
      level: 2,
      competency: 'Digital Documentation',
      difficulty: 'hard',
      text: 'When publishing an official statistical release on a public web portal, which document format ensures accessibility for citizens using screen readers?',
      options: [
        { id: 'opt_1', text: 'Scanned image PDF without OCR text layer' },
        { id: 'opt_2', text: 'Tagged searchable PDF with alt-text on charts and tables' },
        { id: 'opt_3', text: 'Screenshot captured on a mobile phone' },
        { id: 'opt_4', text: 'Password-protected compressed ZIP file' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Tagged PDFs containing selectable OCR text and table markup comply with GIGW and WCAG accessibility mandates.'
    },

    // 3. Data Entry & Validation (5 questions)
    {
      level: 2,
      competency: 'Data Entry & Validation',
      difficulty: 'easy',
      text: 'You have 500 employee records and need to identify duplicate entries. Which approach is most appropriate?',
      options: [
        { id: 'opt_1', text: 'Read all 500 rows manually on paper with a ruler' },
        { id: 'opt_2', text: 'Use Excel "Highlight Duplicates" or "Remove Duplicates" based on unique ID' },
        { id: 'opt_3', text: 'Delete alternating rows across the dataset' },
        { id: 'opt_4', text: 'Re-enter all 500 records from scratch' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Automated duplicate detection on unique keys (e.g., Employee ID or Aadhaar) eliminates human scanning errors.'
    },
    {
      level: 2,
      competency: 'Data Entry & Validation',
      difficulty: 'medium',
      text: 'In an agricultural census data entry form, a field for "Farmer Age" accepts values from 18 to 100. How can you prevent data entry operators from entering accidental typos like 250 or -5?',
      options: [
        { id: 'opt_1', text: 'Apply Excel Data Validation with Whole Number between 18 and 100' },
        { id: 'opt_2', text: 'Instruct operators to be very careful without system rules' },
        { id: 'opt_3', text: 'Sort the column alphabetically' },
        { id: 'opt_4', text: 'Change the background color to yellow' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Data validation rules enforce boundary constraints at entry time, rejecting out-of-range anomalies immediately.'
    },
    {
      level: 2,
      competency: 'Data Entry & Validation',
      difficulty: 'medium',
      text: 'You notice that in a state column, entries are entered inconsistently as "UP", "U.P.", "Uttar Pradesh", and "uttar pradesh". What is the best way to clean this?',
      options: [
        { id: 'opt_1', text: 'Standardize using Find & Replace or a lookup dictionary to a uniform value "Uttar Pradesh"' },
        { id: 'opt_2', text: 'Leave them as is because readers will understand' },
        { id: 'opt_3', text: 'Delete all rows from that state' },
        { id: 'opt_4', text: 'Combine all states into a single cell' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Standardizing categorical text through dictionary harmonization ensures reliable grouping and pivot aggregation.'
    },
    {
      level: 2,
      competency: 'Data Entry & Validation',
      difficulty: 'hard',
      text: 'While auditing field survey returns, you notice an entry showing a household monthly expenditure of Rs. 95,00,000, whereas the median is Rs. 22,000. What is the correct procedure?',
      options: [
        { id: 'opt_1', text: 'Delete the row quietly without recording the change' },
        { id: 'opt_2', text: 'Flag as an outlier, verify with original field questionnaire/investigator, and document verification' },
        { id: 'opt_3', text: 'Automatically round it down to Rs. 22,000' },
        { id: 'opt_4', text: 'Assume it is accurate and publish immediately' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Statistical outliers require systematic audit logging and verification against source schedules before data cleansing.'
    },
    {
      level: 2,
      competency: 'Data Entry & Validation',
      difficulty: 'hard',
      text: 'To ensure high quality in bulk survey digitization, what is the purpose of the "Double Data Entry" (independent keying) methodology?',
      options: [
        { id: 'opt_1', text: 'Two operators enter the same schedules independently, and software flags mismatches for resolution' },
        { id: 'opt_2', text: 'Entering the data twice in the same cell to double the value' },
        { id: 'opt_3', text: 'Halving the number of surveyed households' },
        { id: 'opt_4', text: 'Creating a backup on a second monitor' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Double entry verification identifies operator keying errors with over 99.9% accuracy by flagging divergence.'
    },

    // 4. Email/Communication (4 questions)
    {
      level: 2,
      competency: 'Email/Communication',
      difficulty: 'medium',
      text: 'You are preparing an email response to another division requesting clarification on monthly CPI data. What should you include to prevent repeated follow-up loops?',
      options: [
        { id: 'opt_1', text: 'Direct answer, the methodology link/file, exact data tables, and your contact officer details' },
        { id: 'opt_2', text: 'A single sentence: "Please check our website"' },
        { id: 'opt_3', text: 'Forward the message to your section head without any comment' },
        { id: 'opt_4', text: 'A reminder that your division is too busy to answer questions' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Comprehensive, self-contained communication with documentation and points of contact eliminates back-and-forth ambiguity.'
    },
    {
      level: 2,
      competency: 'Email/Communication',
      difficulty: 'medium',
      text: 'When communicating time-sensitive census guidelines to 30 field supervisory offices, which approach ensures prompt receipt and accountability?',
      options: [
        { id: 'opt_1', text: 'Send an official email with read receipt/acknowledgement request and upload to the division portal' },
        { id: 'opt_2', text: 'Send an informal voice note to one supervisor' },
        { id: 'opt_3', text: 'Post a paper notice on the headquarters notice board only' },
        { id: 'opt_4', text: 'Wait until next month annual review meeting' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Dual-channel communication (formal email with acknowledgement tracking plus central portal hosting) ensures accountability.'
    },
    {
      level: 2,
      competency: 'Email/Communication',
      difficulty: 'hard',
      text: 'A citizen sends an emotional RTI inquiry criticizing data delays. What standard tone should a Junior Assistant maintain when drafting the response?',
      options: [
        { id: 'opt_1', text: 'Objective, courteous, adhering strictly to RTI Act timelines and factual provisions' },
        { id: 'opt_2', text: 'An equally sarcastic reply explaining personal workloads' },
        { id: 'opt_3', text: 'Ignoring the inquiry until the 30-day deadline expires' },
        { id: 'opt_4', text: 'Forwarding the inquiry to local police' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Statutory citizen communications require strict neutrality, professional decorum, and compliance with statutory deadlines.'
    },
    {
      level: 2,
      competency: 'Email/Communication',
      difficulty: 'hard',
      text: 'You need to schedule an urgent inter-departmental technical coordination meeting for 8 participants. What is the most efficient scheduling tool?',
      options: [
        { id: 'opt_1', text: 'Send a calendar invite with agenda and video-conference link via official email calendar' },
        { id: 'opt_2', text: 'Call each of the 8 officers individually every hour until they agree' },
        { id: 'opt_3', text: 'Show up unannounced at their desks' },
        { id: 'opt_4', text: 'Send an SMS with no agenda' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Calendar invites sync availability, block time slots, and bundle agendas and video links automatically.'
    },

    // 5. Cybersecurity (4 questions)
    {
      level: 2,
      competency: 'Cybersecurity',
      difficulty: 'easy',
      text: 'A colleague asks you to install an unauthorized file compression utility from an unknown torrent site onto your official workstation. What is the rule?',
      options: [
        { id: 'opt_1', text: 'Strictly prohibited; only IT/NIC approved and whitelisted software may be installed' },
        { id: 'opt_2', text: 'Allowed as long as the download is free' },
        { id: 'opt_3', text: 'Allowed if installed on Drive D instead of Drive C' },
        { id: 'opt_4', text: 'Allowed if installed after 5:30 PM' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Government cybersecurity policies prohibit unvetted software to protect networks against trojans and spyware.'
    },
    {
      level: 2,
      competency: 'Cybersecurity',
      difficulty: 'medium',
      text: 'What is Multi-Factor Authentication (MFA/2FA) and why is it mandatory on government portals like Parichay / e-Office?',
      options: [
        { id: 'opt_1', text: 'It requires password plus an independent second factor (OTP/Token), preventing breach even if password leaks' },
        { id: 'opt_2', text: 'It requires entering your password twice in the same box' },
        { id: 'opt_3', text: 'It makes logins slower so servers do not overheat' },
        { id: 'opt_4', text: 'It requires two people to sit at the computer together' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'MFA adds an out-of-band credential verification layer, stopping 99% of automated credential stuffing attacks.'
    },
    {
      level: 2,
      competency: 'Cybersecurity',
      difficulty: 'hard',
      text: 'You notice your workstation mouse cursor moving autonomously and files opening without your input. What immediate step must you take?',
      options: [
        { id: 'opt_1', text: 'Disconnect the Ethernet network cable/disable Wi-Fi immediately, and report to IT Security' },
        { id: 'opt_2', text: 'Continue working and ignore it' },
        { id: 'opt_3', text: 'Send an email to friends about the computer ghost' },
        { id: 'opt_4', text: 'Turn off the monitor and leave the room' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Immediate network isolation severs external command-and-control communication while preserving volatile forensic memory.'
    },
    {
      level: 2,
      competency: 'Cybersecurity',
      difficulty: 'hard',
      text: 'Under government data classification rules, how must files marked "Restricted / Confidential" be transmitted over the internet?',
      options: [
        { id: 'opt_1', text: 'Via encrypted channels (HTTPS, NIC Gov email, VPN) with authorized recipient verification' },
        { id: 'opt_2', text: 'Through public social media messaging apps' },
        { id: 'opt_3', text: 'Uploaded to free public file-sharing websites' },
        { id: 'opt_4', text: 'Posted on a personal blog' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Classified government information mandates encrypted transmission over secured government enterprise channels.'
    },

    // 6. Basic e-Governance (4 questions)
    {
      level: 2,
      competency: 'Basic e-Governance',
      difficulty: 'medium',
      text: 'In the Centralized Public Grievance Redress and Monitoring System (CPGRAMS), what is the primary role of the dealing assistant?',
      options: [
        { id: 'opt_1', text: 'Examine grievance facts, assemble records, draft factual action-taken notes within mandated timelines' },
        { id: 'opt_2', text: 'Close grievances immediately without checking records' },
        { id: 'opt_3', text: 'Delete grievances from citizens in other states' },
        { id: 'opt_4', text: 'Transfer every grievance to the Prime Minister Office' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'CPGRAMS workflows require factual examination, verified action reports, and adherence to citizen charter timelines.'
    },
    {
      level: 2,
      competency: 'Basic e-Governance',
      difficulty: 'medium',
      text: 'What is the role of the Public Financial Management System (PFMS) in government expenditure management?',
      options: [
        { id: 'opt_1', text: 'Tracking fund releases, direct benefit transfers (DBT), and real-time accounting across schemes' },
        { id: 'opt_2', text: 'Conducting statistical population censuses' },
        { id: 'opt_3', text: 'Designing websites for ministries' },
        { id: 'opt_4', text: 'Booking flight tickets for official tours' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'PFMS is the national financial management platform for payment processing, DBT disbursement, and expenditure tracking.'
    },
    {
      level: 2,
      competency: 'Basic e-Governance',
      difficulty: 'hard',
      text: 'When moving a file in e-Office, what is the functional difference between "Send" and "Create Dispatch"?',
      options: [
        { id: 'opt_1', text: '"Send" moves the internal file to an officer; "Create Dispatch" issues formal correspondence externally' },
        { id: 'opt_2', text: '"Send" prints the file; "Create Dispatch" deletes it' },
        { id: 'opt_3', text: 'They are identical and can be used interchangeably' },
        { id: 'opt_4', text: '"Send" is only for emails; "Create Dispatch" is for SMS' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'File Send manages intra-departmental noting workflows, whereas Dispatch generates out-bound signed communications.'
    },
    {
      level: 2,
      competency: 'Basic e-Governance',
      difficulty: 'hard',
      text: 'How does the DigiLocker platform integrate into modern e-Governance citizen service delivery?',
      options: [
        { id: 'opt_1', text: 'Provides legally recognized digital verification of authentic certificates without physical paper copies' },
        { id: 'opt_2', text: 'Acts as a social media network for government officers' },
        { id: 'opt_3', text: 'Distributes cash loans to private companies' },
        { id: 'opt_4', text: 'Replaces municipal water meters' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'DigiLocker enables paperless governance under Rule 9A of IT Rules 2016 by treating electronic documents on par with physical originals.'
    },

    // ═════════════════════════════════════════════════════════════════════════
    // LEVEL 3: Section Officer (26 questions across 6 competencies)
    // ═════════════════════════════════════════════════════════════════════════
    // 1. Data Interpretation (5 questions)
    {
      level: 3,
      competency: 'Data Interpretation',
      difficulty: 'medium',
      text: 'A department\'s service-delivery complaints increased by 30% in three months. Which data should you examine first?',
      options: [
        { id: 'opt_1', text: 'The average typing speed of all office assistants' },
        { id: 'opt_2', text: 'Disaggregation by category, district, and stage of delay to pinpoint systemic failure points' },
        { id: 'opt_3', text: 'The weather reports for the preceding six months' },
        { id: 'opt_4', text: 'Social media follower counts of other ministries' }
      ],
      correct_option_id: 'opt_2',
      explanation: 'Disaggregated data by category, geography, and process stage isolates the root cause of service delivery degradation.'
    },
    {
      level: 3,
      competency: 'Data Interpretation',
      difficulty: 'medium',
      text: 'When reviewing survey returns from two adjacent statistical zones, Zone A reports 98% literacy while Zone B reports 42%. Both share identical demographics. What should the Section Officer investigate?',
      options: [
        { id: 'opt_1', text: 'Possible enumerator bias, definition misinterpretation, or sampling inconsistency between zones' },
        { id: 'opt_2', text: 'Immediately publish the numbers without question' },
        { id: 'opt_3', text: 'Average the two numbers to 70% and enter that for both' },
        { id: 'opt_4', text: 'Discard Zone B entirely' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Divergent metrics in homogenous cohorts indicate potential measurement error or enumerator variance needing audit.'
    },
    {
      level: 3,
      competency: 'Data Interpretation',
      difficulty: 'hard',
      text: 'In a quarterly statistical release, the headline index rose by 5%, but the median value dropped by 2%. What does this statistical divergence most likely indicate?',
      options: [
        { id: 'opt_1', text: 'Extreme high-value outliers skewed the arithmetic mean upward' },
        { id: 'opt_2', text: 'The software made a calculation error' },
        { id: 'opt_3', text: 'The mean and median are always identical in real data' },
        { id: 'opt_4', text: 'The survey sample size was too large' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Positive skewness with high outliers pulls the arithmetic mean up while the median accurately reflects distribution center.'
    },
    {
      level: 3,
      competency: 'Data Interpretation',
      difficulty: 'hard',
      text: 'You are comparing year-over-year survey response rates: 2024 had 85% on paper schedules; 2025 had 62% on mobile CAPI devices. What analytical conclusion should guide supervisory action?',
      options: [
        { id: 'opt_1', text: 'Evaluate digital platform usability, network availability in field blocks, and enumerator digital proficiency' },
        { id: 'opt_2', text: 'Revert permanently to paper without assessing digital benefits' },
        { id: 'opt_3', text: 'Penalize surveyed households for not responding' },
        { id: 'opt_4', text: 'Stop collecting data completely' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Assessing transitional operational frictions (connectivity, UX, training) identifies why digital collection experienced drop-offs.'
    },
    {
      level: 3,
      competency: 'Data Interpretation',
      difficulty: 'hard',
      text: 'A cross-tabulation table shows high correlation between rural electrification and higher female literacy. What caution must a Section Officer maintain before writing the policy summary?',
      options: [
        { id: 'opt_1', text: 'Correlation does not establish direct causation; underlying variables (e.g. household income, school access) must be controlled' },
        { id: 'opt_2', text: 'Claim that installing electricity poles automatically teaches people to read' },
        { id: 'opt_3', text: 'Reject both statistics as unrelated coincidences' },
        { id: 'opt_4', text: 'Publish that female literacy causes electricity generation' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Rigorous policy analysis avoids confounding correlation with causation without controlling for socio-economic covariates.'
    },

    // 2. Digital Governance (4 questions)
    {
      level: 3,
      competency: 'Digital Governance',
      difficulty: 'medium',
      text: 'Under the Central Secretariat Manual of Office Procedure (CSMOP), what is the maximum recommended turnaround timeline for disposing of urgent public grievance communications in e-Office?',
      options: [
        { id: 'opt_1', text: 'Within 21 to 30 days, with interim acknowledgement if delayed' },
        { id: 'opt_2', text: 'Within 6 months to 1 year' },
        { id: 'opt_3', text: 'There is no prescribed timeline' },
        { id: 'opt_4', text: 'Only when reminded by senior leadership' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'CSMOP and DARPG guidelines mandate prompt disposal within statutory timelines (typically <= 30 days) with interim replies.'
    },
    {
      level: 3,
      competency: 'Digital Governance',
      difficulty: 'medium',
      text: 'When a Section Officer approves a digital file in e-Office, what does the system audit trail log automatically?',
      options: [
        { id: 'opt_1', text: 'User ID, exact timestamp, IP address, and digital signature hash of the approval' },
        { id: 'opt_2', text: 'Only the user name without timestamp' },
        { id: 'opt_3', text: 'Nothing; audit logs are disabled by default' },
        { id: 'opt_4', text: 'Personal browsing history of the officer' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Audit trails in e-governance record immutable timestamps, digital certificates, and network identifiers for transparency.'
    },
    {
      level: 3,
      competency: 'Digital Governance',
      difficulty: 'hard',
      text: 'Your section is digitizing historical statistical records containing citizen identity information. Which compliance standard must be upheld under the DPDP Act 2023?',
      options: [
        { id: 'opt_1', text: 'Purpose limitation, data minimization, secure storage, and anonymization of identifiable personal data' },
        { id: 'opt_2', text: 'Selling the dataset to commercial advertising agencies' },
        { id: 'opt_3', text: 'Publishing full unmasked Aadhaar and phone numbers online' },
        { id: 'opt_4', text: 'Storing records on personal unencrypted pen drives' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'The Digital Personal Data Protection Act mandates purpose specification, storage security, and masking of personally identifiable data.'
    },
    {
      level: 3,
      competency: 'Digital Governance',
      difficulty: 'hard',
      text: 'What is the key objective of the Open Government Data (OGD) Platform India (data.gov.in) for statistical publications?',
      options: [
        { id: 'opt_1', text: 'Providing machine-readable, open format datasets (CSV, JSON) for public transparency, research, and innovation' },
        { id: 'opt_2', text: 'Selling government reports at commercial prices' },
        { id: 'opt_3', text: 'Restricting access exclusively to government employees' },
        { id: 'opt_4', text: 'Replacing all ministry press conferences' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'National Data Sharing and Accessibility Policy (NDSAP) requires publishing open, machine-readable datasets for public benefit.'
    },

    // 3. Process Management (4 questions)
    {
      level: 3,
      competency: 'Process Management',
      difficulty: 'medium',
      text: 'A critical quarterly statistical release consistently misses the target deadline by 4 days due to bottlenecks in inter-divisional vetting. How should the Section Officer address this?',
      options: [
        { id: 'opt_1', text: 'Map the end-to-end workflow, establish internal intermediate milestones, and track SLAs collaboratively' },
        { id: 'opt_2', text: 'Blame the other division publicly in an open email' },
        { id: 'opt_3', text: 'Skip validation checks to meet the date' },
        { id: 'opt_4', text: 'Change the release frequency to annual' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Process mapping and intermediate milestone SLAs expose systemic friction points and enable structured process improvement.'
    },
    {
      level: 3,
      competency: 'Process Management',
      difficulty: 'medium',
      text: 'When re-engineering a manual filing process into an automated workflow, what is the initial recommended step?',
      options: [
        { id: 'opt_1', text: 'Document the "As-Is" process completely to identify redundant steps and decision gates before automating' },
        { id: 'opt_2', text: 'Purchase expensive software without understanding the existing workflow' },
        { id: 'opt_3', text: 'Transfer all staff members out of the section' },
        { id: 'opt_4', text: 'Stop doing work until the software arrives' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Documenting the "As-Is" baseline reveals redundant loops and manual bottlenecks, preventing the automation of inefficient procedures.'
    },
    {
      level: 3,
      competency: 'Process Management',
      difficulty: 'hard',
      text: 'In managing section staff assignments, two team members are overloaded with complex compilations while two others have idle capacity. What supervisory action optimizes section throughput?',
      options: [
        { id: 'opt_1', text: 'Rebalance workload through task modularization and cross-skilling across statistical sub-functions' },
        { id: 'opt_2', text: 'Leave the distribution unchanged to avoid friction' },
        { id: 'opt_3', text: 'Demand that the overloaded staff work through every weekend' },
        { id: 'opt_4', text: 'Reassign all work to outside consultants' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Dynamic workload rebalancing and cross-functional capacity building ensures resilient section output and prevents burnout.'
    },
    {
      level: 3,
      competency: 'Process Management',
      difficulty: 'hard',
      text: 'What is a Key Performance Indicator (KPI) that a Section Officer should track to measure file disposal efficiency in e-Office?',
      options: [
        { id: 'opt_1', text: 'Average file pendency time and percentage of files cleared within prescribed turnaround time (TAT)' },
        { id: 'opt_2', text: 'Total number of emails sent by staff' },
        { id: 'opt_3', text: 'Number of mouse clicks per hour' },
        { id: 'opt_4', text: 'The size of the computer desktop monitor' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Average pendency time and TAT clearance percentages are standardized metrics for workflow efficiency in administrative management.'
    },

    // 4. Information Security (5 questions)
    {
      level: 3,
      competency: 'Information Security',
      difficulty: 'medium',
      text: 'A staff member in your section reports that their login password was accidentally exposed on a shared office whiteboard. What is your immediate supervisory instruction?',
      options: [
        { id: 'opt_1', text: 'Immediately change password, revoke active sessions, inspect audit logs for unauthorized logins, and erase the board' },
        { id: 'opt_2', text: 'Wait until the end of the month to change it during routine password cycles' },
        { id: 'opt_3', text: 'Tell the staff member not to worry if no one saw it' },
        { id: 'opt_4', text: 'Delete the entire user account from the server' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Immediate credential rotation and session termination neutralizes potential exploitation, followed by audit inspection.'
    },
    {
      level: 3,
      competency: 'Information Security',
      difficulty: 'medium',
      text: 'Under national cybersecurity guidelines (CERT-In), what is the mandatory protocol when an official system suffers a suspected ransomware or malware infection?',
      options: [
        { id: 'opt_1', text: 'Isolate the machine from the network, preserve event logs, and report to the designated CISO/CERT-In within mandated hours' },
        { id: 'opt_2', text: 'Pay the requested ransom immediately using personal funds' },
        { id: 'opt_3', text: 'Reformat the hard drive immediately to erase all evidence' },
        { id: 'opt_4', text: 'Keep the incident quiet to avoid management scrutiny' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'CERT-In guidelines mandate timely reporting of cyber security incidents alongside forensic evidence preservation and network isolation.'
    },
    {
      level: 3,
      competency: 'Information Security',
      difficulty: 'hard',
      text: 'Which data classification tier applies to preliminary, unreleased GDP estimates prior to official Cabinet and public dissemination?',
      options: [
        { id: 'opt_1', text: 'Market-Sensitive / Top Secret — strictly restricted access with cryptographic isolation' },
        { id: 'opt_2', text: 'Public Open Data' },
        { id: 'opt_3', text: 'Unclassified internal chatter' },
        { id: 'opt_4', text: 'Commercial promotional material' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Pre-release macroeconomic statistics are highly market-sensitive and mandate strict compartmentalized access protocols.'
    },
    {
      level: 3,
      competency: 'Information Security',
      difficulty: 'hard',
      text: 'Why does government IT policy strictly prohibit forwarding official documents from government email (@nic.in/@gov.in) to personal commercial webmail accounts?',
      options: [
        { id: 'opt_1', text: 'Commercial webmail servers are outside government perimeter control and vulnerable to data breaches and jurisdiction loss' },
        { id: 'opt_2', text: 'Commercial webmail cannot receive PDF attachments' },
        { id: 'opt_3', text: 'Personal emails cost the government extra bandwidth fees' },
        { id: 'opt_4', text: 'Personal email fonts look different' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Personal webmail services lack government security controls, sovereignty protections, and enterprise auditing frameworks.'
    },
    {
      level: 3,
      competency: 'Information Security',
      difficulty: 'hard',
      text: 'A third-party vendor contracted to maintain statistical servers requests remote desktop access from an unknown IP address. What action is required from the Section Officer?',
      options: [
        { id: 'opt_1', text: 'Deny unauthorized access; require formal security clearance, VPN gateway, and supervised remote session logging' },
        { id: 'opt_2', text: 'Provide root administrator credentials over a phone call' },
        { id: 'opt_3', text: 'Disable the firewall temporarily to allow them in' },
        { id: 'opt_4', text: 'Allow access as long as they promise to finish quickly' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Vendor access must be strictly mediated through authorized government VPNs, least-privilege principles, and monitored session logging.'
    },

    // 5. Problem Solving (4 questions)
    {
      level: 3,
      competency: 'Problem Solving',
      difficulty: 'medium',
      text: 'Three field enumerators submit survey data that conflicts with baseline municipal census figures by over 40%. How should the Section Officer methodically isolate the problem?',
      options: [
        { id: 'opt_1', text: 'Execute root cause analysis: check sample boundary maps, interview supervisors, and conduct independent re-enumeration' },
        { id: 'opt_2', text: 'Reject all survey files and reprimand the enumerators without inquiry' },
        { id: 'opt_3', text: 'Alter the baseline municipal numbers to match the survey' },
        { id: 'opt_4', text: 'Wait until the next 5-year census cycle' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Systematic root cause analysis checks geographic boundaries, survey instrument clarity, and field validation before assigning fault.'
    },
    {
      level: 3,
      competency: 'Problem Solving',
      difficulty: 'medium',
      text: 'An automated batch script aggregating price data from 80 markets crashes every Monday morning. What is the logical troubleshooting progression?',
      options: [
        { id: 'opt_1', text: 'Examine crash logs, verify Monday input data schemas/missing files, isolate edge cases, and apply exception handling' },
        { id: 'opt_2', text: 'Delete the entire database and reinstall Windows' },
        { id: 'opt_3', text: 'Stop collecting data on Mondays' },
        { id: 'opt_4', text: 'Run the script repeatedly 100 times hoping it resolves itself' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Analyzing error logs and inspecting weekend input data anomalies isolates syntax or null-pointer edge cases causing pipeline failure.'
    },
    {
      level: 3,
      competency: 'Problem Solving',
      difficulty: 'hard',
      text: 'A sudden server outage occurs two hours before an official deadline for filing an inter-ministerial report. What contingency procedure demonstrates strong Section Officer leadership?',
      options: [
        { id: 'opt_1', text: 'Activate offline contingency protocols, notify the nodal division with an interim validated brief, and coordinate with IT' },
        { id: 'opt_2', text: 'Leave the office to avoid answering phone calls' },
        { id: 'opt_3', text: 'Panic and inform leadership that the report is impossible to deliver' },
        { id: 'opt_4', text: 'Post a complaint on public social media' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Activating documented business continuity procedures and keeping leadership informed with interim verified briefs ensures institutional resilience.'
    },
    {
      level: 3,
      competency: 'Problem Solving',
      difficulty: 'hard',
      text: 'When two section team members disagree fundamentally on the statistical classification of a newly emerging gig-economy service, how should the Section Officer resolve the dispute?',
      options: [
        { id: 'opt_1', text: 'Review National Industrial Classification (NIC) guidelines, consult division methodological experts, and document rationale' },
        { id: 'opt_2', text: 'Toss a coin to decide the classification' },
        { id: 'opt_3', text: 'Choose whichever option is easier to type' },
        { id: 'opt_4', text: 'Refuse to classify the industry altogether' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Grounding technical disputes in official classification manuals (NIC) and institutional expert consensus guarantees methodological consistency.'
    },

    // 6. Communication (4 questions)
    {
      level: 3,
      competency: 'Communication',
      difficulty: 'medium',
      text: 'You need to brief the Joint Secretary on a 60-page statistical evaluation report in a 10-minute meeting. What communication structure is most effective?',
      options: [
        { id: 'opt_1', text: 'Executive summary format: key findings, statistical implications, risks, and 3 clear actionable recommendations' },
        { id: 'opt_2', text: 'Read all 60 pages aloud starting from page 1' },
        { id: 'opt_3', text: 'Show raw complex database code without explanations' },
        { id: 'opt_4', text: 'Ask the Joint Secretary to read it alone and leave' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Senior executive briefings require the BLUF principle (Bottom Line Up Front): high-level findings, strategic risks, and clear decision choices.'
    },
    {
      level: 3,
      competency: 'Communication',
      difficulty: 'medium',
      text: 'When writing a formal Cabinet Note or Inter-Ministerial Note, which stylistic rule is mandatory in government drafting?',
      options: [
        { id: 'opt_1', text: 'Numbered paragraphs, unambiguous language, clear financial implications, and explicit approval sought' },
        { id: 'opt_2', text: 'Poetic language with metaphorical descriptions' },
        { id: 'opt_3', text: 'A single continuous paragraph without punctuation' },
        { id: 'opt_4', text: 'Anonymous drafting without institutional referencing' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Cabinet Notes follow strict Secretariat conventions: numbered paragraphs, self-contained background, financial impacts, and clear proposals.'
    },
    {
      level: 3,
      competency: 'Communication',
      difficulty: 'hard',
      text: 'A parliamentary question (starred question) arrives requiring verified statistical data by tomorrow 10:00 AM. How should the Section Officer manage communication?',
      options: [
        { id: 'opt_1', text: 'Prioritize immediately, assign verified data compilation with dual-checks, and route through supervisory officers urgently' },
        { id: 'opt_2', text: 'Treat it as standard routine correspondence and answer next week' },
        { id: 'opt_3', text: 'Provide estimated guesses without checking data records' },
        { id: 'opt_4', text: 'Forward the inquiry to a junior trainee without oversight' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Parliamentary questions carry strict constitutional accountability; data must be accurate, verified, and submitted within rigid timelines.'
    },
    {
      level: 3,
      competency: 'Communication',
      difficulty: 'hard',
      text: 'During a cross-ministerial video conference, a representative from another department challenges your division\'s price index methodology aggressively. What is the appropriate professional response?',
      options: [
        { id: 'opt_1', text: 'Remain calm, state the approved international/national methodology factually, and offer a detailed technical note' },
        { id: 'opt_2', text: 'Disconnect from the call abruptly in protest' },
        { id: 'opt_3', text: 'Retaliate with personal criticisms of their department' },
        { id: 'opt_4', text: 'Concede immediately and admit failure without verification' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Maintaining composure and offering formal technical documentation upholds ministry authority and fosters inter-agency collaboration.'
    },

    // ═════════════════════════════════════════════════════════════════════════
    // LEVEL 4: Senior Officer (26 questions across 6 competencies)
    // ═════════════════════════════════════════════════════════════════════════
    // 1. Data-driven Decision Making (5 questions)
    {
      level: 4,
      competency: 'Data-driven Decision Making',
      difficulty: 'medium',
      text: 'A major national survey reveals significant non-sampling errors concentrated in two specific demographic sectors. As a Senior Officer, what strategic decision should you mandate?',
      options: [
        { id: 'opt_1', text: 'Calibrate weighting adjustments, retrain field personnel on ambiguous questionnaire modules, and institute audit callbacks' },
        { id: 'opt_2', text: 'Publish unadjusted data without methodological disclaimers' },
        { id: 'opt_3', text: 'Cancel the national survey program entirely' },
        { id: 'opt_4', text: 'Fabricate synthetic responses to fill the discrepancy' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Addressing non-sampling bias requires transparent post-stratification weighting, targeted surveyor retraining, and field audit verification.'
    },
    {
      level: 4,
      competency: 'Data-driven Decision Making',
      difficulty: 'medium',
      text: 'When evaluating whether to adopt a new statistical estimation model that promises 15% lower survey costs but 4% wider variance, what should guide the decision?',
      options: [
        { id: 'opt_1', text: 'A cost-benefit analysis against statutory precision requirements for downstream macroeconomic policy indicators' },
        { id: 'opt_2', text: 'Adopting the cheaper model automatically regardless of policy impact' },
        { id: 'opt_3', text: 'Rejecting any innovation because the old way was familiar' },
        { id: 'opt_4', text: 'Asking field enumerators to vote by show of hands' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Strategic data governance balances fiscal efficiency against statistical reliability tolerances required for national policy.'
    },
    {
      level: 4,
      competency: 'Data-driven Decision Making',
      difficulty: 'hard',
      text: 'A quarterly consumer confidence metric shows a slight dip, but industrial production shows a moderate rise. Which analytical synthesis provides sound executive guidance?',
      options: [
        { id: 'opt_1', text: 'Evaluate leading vs. lagging indicator relationships, inspect component sub-indices, and explain sector-specific dynamics' },
        { id: 'opt_2', text: 'Declare that one of the two indices is completely invalid' },
        { id: 'opt_3', text: 'Combine both numbers into a single arbitrary average' },
        { id: 'opt_4', text: 'Suppress both releases to avoid confusing the public' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Senior analysts recognize that production (supply/lagging) and confidence (demand/leading) capture distinct facets of economic cycles.'
    },
    {
      level: 4,
      competency: 'Data-driven Decision Making',
      difficulty: 'hard',
      text: 'Your division is tasked with building an early warning dashboard for food price inflation. Which data streams offer the highest predictive value?',
      options: [
        { id: 'opt_1', text: 'High-frequency mandi arrivals, rainfall deviations, transport freight rates, and wholesale market pricing feeds' },
        { id: 'opt_2', text: 'Annual population census statistics from 5 years ago' },
        { id: 'opt_3', text: 'Consumer complaints on social media alone' },
        { id: 'opt_4', text: 'Total number of agricultural officers on leave' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Early warning systems rely on high-frequency operational lead indicators (arrivals, weather deviations, wholesale logistics).'
    },
    {
      level: 4,
      competency: 'Data-driven Decision Making',
      difficulty: 'hard',
      text: 'An external academic research paper claims that your ministry\'s official employment estimates suffer from urban bias. How should a Senior Officer scientifically evaluate this claim?',
      options: [
        { id: 'opt_1', text: 'Re-examine sampling frame stratification, sample allocation formulas, response rates across rural blocks, and publish a peer review' },
        { id: 'opt_2', text: 'Dismiss the academic paper immediately as politically motivated' },
        { id: 'opt_3', text: 'Agree immediately and apologize publicly without reviewing technical proofs' },
        { id: 'opt_4', text: 'Request the academic paper to be censored' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Scientific integrity in national statistical institutes demands rigorous methodological evaluation of peer critique and open documentation.'
    },

    // 2. Digital Transformation (4 questions)
    {
      level: 4,
      competency: 'Digital Transformation',
      difficulty: 'medium',
      text: 'Your department wants to digitize a manual approval process. What should be evaluated before selecting the technology?',
      options: [
        { id: 'opt_1', text: 'Process re-engineering to remove redundant bottlenecks, user needs, security architecture, and system integration' },
        { id: 'opt_2', text: 'Which vendor has the flashiest marketing presentation' },
        { id: 'opt_3', text: 'Buying whatever technology was cheapest in the newspaper' },
        { id: 'opt_4', text: 'Digitizing the exact flawed manual steps without changing anything' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Digital transformation succeeds by streamlining business processes first, then applying interoperable and secure technology.'
    },
    {
      level: 4,
      competency: 'Digital Transformation',
      difficulty: 'medium',
      text: 'When moving departmental legacy on-premise servers to a Government Community Cloud (MeghRaj), what is the paramount operational benefit?',
      options: [
        { id: 'opt_1', text: 'High availability, automated disaster recovery, scalable computing resources, and standardized security compliance' },
        { id: 'opt_2', text: 'Allowing officers to play video games in the office' },
        { id: 'opt_3', text: 'Eliminating the need for software licenses forever' },
        { id: 'opt_4', text: 'Getting free laptop giveaways' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'GI Cloud (MeghRaj) provides elastic compute, automated backups, redundancy, and standardized CERT-In verified security posture.'
    },
    {
      level: 4,
      competency: 'Digital Transformation',
      difficulty: 'hard',
      text: 'In transitioning from paper-based survey schedules to Mobile Computer-Assisted Personal Interviewing (CAPI), what is the most critical operational change management factor?',
      options: [
        { id: 'opt_1', text: 'Comprehensive field training, offline data synchronization capabilities, intuitive UI, and real-time supervisory validation' },
        { id: 'opt_2', text: 'Purchasing tablets and handing them out without training' },
        { id: 'opt_3', text: 'Expecting field staff to learn software on their personal time' },
        { id: 'opt_4', text: 'Prohibiting field supervisors from asking questions' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'CAPI adoption hinges on hands-on surveyor training, offline caching resilience, and continuous real-time quality control checks.'
    },
    {
      level: 4,
      competency: 'Digital Transformation',
      difficulty: 'hard',
      text: 'How should a Senior Officer approach interoperability between disparate departmental databases across central ministries?',
      options: [
        { id: 'opt_1', text: 'Adopt open API standards, National Data Governance Framework (NDGFP) schemas, and secure API gateways' },
        { id: 'opt_2', text: 'Have staff copy-paste numbers manually across departmental screens' },
        { id: 'opt_3', text: 'Create separate closed databases that reject external connections' },
        { id: 'opt_4', text: 'Email spreadsheet files back and forth weekly' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'National Data Governance Framework standards mandate RESTful API integration, schema registries, and authenticated data exchanges.'
    },

    // 3. Cybersecurity Governance (5 questions)
    {
      level: 4,
      competency: 'Cybersecurity Governance',
      difficulty: 'medium',
      text: 'As a Senior Officer overseeing departmental information systems, what constitutes an effective Institutional Cyber Crisis Management Plan (CCMP)?',
      options: [
        { id: 'opt_1', text: 'Documented threat response roles, communication matrices, periodic mock drills, isolated offline backups, and CERT-In coordination' },
        { id: 'opt_2', text: 'A single antivirus software installed on the reception desk computer' },
        { id: 'opt_3', text: 'An informal agreement among assistants to unplug wires if something happens' },
        { id: 'opt_4', text: 'Hoping that state-sponsored hackers will ignore government statistical databases' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'CCMP frameworks mandate defined crisis teams, tested disaster recovery playbooks, air-gapped backups, and statutory reporting.'
    },
    {
      level: 4,
      competency: 'Cybersecurity Governance',
      difficulty: 'medium',
      text: 'What is the core principle of a "Zero Trust" cybersecurity architecture for government departmental networks?',
      options: [
        { id: 'opt_1', text: '"Never trust, always verify" — every user, device, and request is authenticated and authorized before granting access' },
        { id: 'opt_2', text: 'Trust anyone who is inside the office building automatically' },
        { id: 'opt_3', text: 'Refuse to hire any new employees' },
        { id: 'opt_4', text: 'Do not allow anyone to log in to computers at all' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Zero Trust eliminates implicit perimeter trust, requiring continuous verification, least privilege, and micro-segmentation.'
    },
    {
      level: 4,
      competency: 'Cybersecurity Governance',
      difficulty: 'hard',
      text: 'A third-party security audit flags 14 critical vulnerabilities in a citizen-facing statistical portal scheduled for launch next week. What is the Senior Officer\'s duty?',
      options: [
        { id: 'opt_1', text: 'Withhold launch until all critical vulnerabilities are remediated and a clean CERT-In / STQC security audit certificate is issued' },
        { id: 'opt_2', text: 'Launch on schedule and try to fix vulnerabilities secretly over the coming months' },
        { id: 'opt_3', text: 'Instruct the auditor to change the report findings to "Low Risk"' },
        { id: 'opt_4', text: 'Fire the auditor and hire one who asks fewer questions' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Government cybersecurity regulations strictly prohibit deploying web applications into production without clean STQC/CERT-In certification.'
    },
    {
      level: 4,
      competency: 'Cybersecurity Governance',
      difficulty: 'hard',
      text: 'Under ISO/IEC 27001 standards adopted by government IT divisions, what is the role of an Information Security Risk Assessment?',
      options: [
        { id: 'opt_1', text: 'Systematically identify data assets, evaluate threats and vulnerabilities, and implement risk treatment plans with residual risk acceptance' },
        { id: 'opt_2', text: 'Calculate the electricity cost of running server cooling fans' },
        { id: 'opt_3', text: 'Replace all desktop keyboards with waterproof models' },
        { id: 'opt_4', text: 'Count the total number of paper files in storage rooms' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'ISO 27001 risk assessments map institutional vulnerabilities, threat likelihood, and impact to establish proactive security controls.'
    },
    {
      level: 4,
      competency: 'Cybersecurity Governance',
      difficulty: 'hard',
      text: 'What legal obligation does the Digital Personal Data Protection (DPDP) Act 2023 impose on a Government Data Fiduciary regarding data breach notifications?',
      options: [
        { id: 'opt_1', text: 'Intimate the Data Protection Board of India and affected data principals promptly upon occurrence of a personal data breach' },
        { id: 'opt_2', text: 'Hide the breach from the public indefinitely' },
        { id: 'opt_3', text: 'Notify the public only after 5 years have passed' },
        { id: 'opt_4', text: 'There are no notification obligations for government entities' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'DPDP Act Section 8(6) requires data fiduciaries to give intimate notice of personal data breaches to the Board and affected citizens.'
    },

    // 4. Project/Process Management (4 questions)
    {
      level: 4,
      competency: 'Project/Process Management',
      difficulty: 'medium',
      text: 'A major national sample survey project is falling 3 weeks behind schedule across 8 states. What project management technique should the Senior Officer deploy?',
      options: [
        { id: 'opt_1', text: 'Critical Path Method (CPM) analysis to identify non-critical slack and crash key gating activities through targeted resource deployment' },
        { id: 'opt_2', text: 'Cut the survey sample size in half without methodological approval' },
        { id: 'opt_3', text: 'Send aggressive reprimand letters to all field directors without investigating reasons' },
        { id: 'opt_4', text: 'Extend the deadline by two years without informing ministry stakeholders' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Critical Path analysis isolates the longest sequence of dependent activities, focusing acceleration resources where they compress project completion.'
    },
    {
      level: 4,
      competency: 'Project/Process Management',
      difficulty: 'medium',
      text: 'In managing a multi-stakeholder statistical software procurement through GeM, how do you mitigate scope creep from evolving departmental requirements?',
      options: [
        { id: 'opt_1', text: 'Maintain a formalized Scope Baseline, clear Service Level Agreements (SLAs), and a structured Change Control Board' },
        { id: 'opt_2', text: 'Accept every verbal request from any officer at any time' },
        { id: 'opt_3', text: 'Refuse all updates and deliver an obsolete system' },
        { id: 'opt_4', text: 'Allow the vendor to write their own requirements' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Scope baselines and formalized Change Control Boards evaluate schedule and budget impacts before approving requirement modifications.'
    },
    {
      level: 4,
      competency: 'Project/Process Management',
      difficulty: 'hard',
      text: 'When adopting Agile project delivery for an internal analytics portal, what is the key advantage of 2-week Sprint cycles over traditional Waterfall delivery?',
      options: [
        { id: 'opt_1', text: 'Frequent delivery of working incremental software, continuous stakeholder feedback, and early risk discovery' },
        { id: 'opt_2', text: 'Elimination of all documentation and testing' },
        { id: 'opt_3', text: 'Software engineers can work without supervision' },
        { id: 'opt_4', text: 'The project is guaranteed to cost zero rupees' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Agile sprints provide iterative working increments, reducing the risk of building misaligned systems through continuous user feedback.'
    },
    {
      level: 4,
      competency: 'Project/Process Management',
      difficulty: 'hard',
      text: 'In public sector procurement governance, what is the role of Earnest Money Deposit (EMD) and Performance Bank Guarantee (PBG)?',
      options: [
        { id: 'opt_1', text: 'EMD deters frivolous bidders during tendering; PBG protects against vendor default or contractual failure during execution' },
        { id: 'opt_2', text: 'They are non-refundable bribes paid to the procurement committee' },
        { id: 'opt_3', text: 'They are taxes collected for the municipal corporation' },
        { id: 'opt_4', text: 'They are funds used to pay for staff office lunches' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'General Financial Rules (GFR) define EMD as bid security and PBG as contractual performance assurance against vendor default.'
    },

    // 5. Analytical Reasoning (4 questions)
    {
      level: 4,
      competency: 'Analytical Reasoning',
      difficulty: 'medium',
      text: 'An evaluation study of a national skill training scheme indicates that employed graduates earn 20% more than non-graduates. However, applicants already had higher prior education. What bias is present?',
      options: [
        { id: 'opt_1', text: 'Selection bias / Endogeneity — higher earnings may stem from pre-existing capabilities rather than training alone' },
        { id: 'opt_2', text: 'Recall bias' },
        { id: 'opt_3', text: 'Survivorship bias' },
        { id: 'opt_4', text: 'Observer expectancy effect' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Selection bias occurs when program participants differ systematically from non-participants prior to program intervention.'
    },
    {
      level: 4,
      competency: 'Analytical Reasoning',
      difficulty: 'medium',
      text: 'When designing a stratified multistage cluster sampling design for consumer expenditure surveys, what is the statistical objective of stratification?',
      options: [
        { id: 'opt_1', text: 'Minimize within-stratum variance while maximizing between-strata variance, reducing overall sampling error' },
        { id: 'opt_2', text: 'Ensure that only wealthy households are selected' },
        { id: 'opt_3', text: 'Make data calculation easier by ignoring rural areas' },
        { id: 'opt_4', text: 'Guarantee that every state has identical population figures' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Stratification groups homogeneous sampling units, maximizing between-group variance to optimize precision with smaller sample sizes.'
    },
    {
      level: 4,
      competency: 'Analytical Reasoning',
      difficulty: 'hard',
      text: 'In analyzing multi-year time-series data for Consumer Price Index (CPI), you detect seasonality in agricultural prices. Which statistical adjustment is standard before publishing trend analysis?',
      options: [
        { id: 'opt_1', text: 'Seasonal adjustment (e.g., X-12-ARIMA / X-13ARIMA-SEATS) to decompose seasonal cycles from core underlying trends' },
        { id: 'opt_2', text: 'Deleting all monsoon months from the dataset' },
        { id: 'opt_3', text: 'Multiplying every number by 10' },
        { id: 'opt_4', text: 'Assuming price spikes are permanent structural changes' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Standard macroeconomic accounting applies seasonal decomposition (X-13ARIMA) to isolate secular structural shifts from recurring weather/festival patterns.'
    },
    {
      level: 4,
      competency: 'Analytical Reasoning',
      difficulty: 'hard',
      text: 'A predictive machine learning model for detecting fraudulent tax invoice claims achieves 99% accuracy on a training dataset where only 0.1% of transactions are fraudulent. Why might this model be ineffective?',
      options: [
        { id: 'opt_1', text: 'The "Accuracy Paradox" in imbalanced datasets — a model predicting "No Fraud" 100% of the time achieves 99.9% accuracy while catching zero fraud' },
        { id: 'opt_2', text: 'Because artificial intelligence is not allowed in tax offices' },
        { id: 'opt_3', text: 'Because 99% accuracy is too high for any computer' },
        { id: 'opt_4', text: 'Because tax invoices cannot be analyzed mathematically' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'In highly imbalanced datasets, raw accuracy is deceptive; evaluators must inspect Precision, Recall, F1-Score, and AUC-ROC.'
    },

    // 6. Stakeholder Management (4 questions)
    {
      level: 4,
      competency: 'Stakeholder Management',
      difficulty: 'medium',
      text: 'During inter-ministerial consultations for a revised National Indicator Framework for Sustainable Development Goals (SDGs), several line ministries resist adopting standardized data metrics. How should a Senior Officer negotiate alignment?',
      options: [
        { id: 'opt_1', text: 'Demonstrate mutual value, offer technical integration assistance, and frame alignment around Cabinet/NITI Aayog commitments' },
        { id: 'opt_2', text: 'Threaten to remove their departments from official government press releases' },
        { id: 'opt_3', text: 'Abandon the standardization effort and let every ministry create incompatible metrics' },
        { id: 'opt_4', text: 'Issue unilateral demands without consultation' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Cross-ministerial consensus relies on collaborative value demonstration, capacity support, and grounding in shared national mandates.'
    },
    {
      level: 4,
      competency: 'Stakeholder Management',
      difficulty: 'medium',
      text: 'When releasing a sensitive statistical report that shows modest economic slowdown in certain industrial sectors, how should media communications be handled?',
      options: [
        { id: 'opt_1', text: 'Provide clear, factual press briefings with technical methodological explainers, transparent data tables, and pre-empt misinterpretations' },
        { id: 'opt_2', text: 'Refuse to speak to journalists or release any information' },
        { id: 'opt_3', text: 'Alter the statistical tables to look overly optimistic' },
        { id: 'opt_4', text: 'Blame external media outlets before they publish' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Institutional credibility rests on transparent, professional, and accessible dissemination with contextual methodology.'
    },
    {
      level: 4,
      competency: 'Stakeholder Management',
      difficulty: 'hard',
      text: 'An industry association demands raw microdata containing proprietary firm-level financial returns submitted under the Annual Survey of Industries (ASI). What is the Senior Officer\'s legal obligation?',
      options: [
        { id: 'opt_1', text: 'Protect respondent confidentiality under the Collection of Statistics Act; provide only anonymized/aggregated data' },
        { id: 'opt_2', text: 'Sell the raw identifiable data to the association for revenue' },
        { id: 'opt_3', text: 'Provide the data if the association writes a polite letter' },
        { id: 'opt_4', text: 'Publish all company secrets on the public web' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'The Collection of Statistics Act mandates strict statutory confidentiality of identifiable enterprise responses.'
    },
    {
      level: 4,
      competency: 'Stakeholder Management',
      difficulty: 'hard',
      text: 'When presenting a new digital governance portal to internal union representatives of administrative staff who fear automation job losses, how should leadership communicate?',
      options: [
        { id: 'opt_1', text: 'Engage transparently, clarify that automation eliminates repetitive drudgery, and commit to structured reskilling for higher-value roles' },
        { id: 'opt_2', text: 'Dismiss staff concerns as unprogressive' },
        { id: 'opt_3', text: 'Implement the system covertly without informing the staff' },
        { id: 'opt_4', text: 'Agree to cancel all computerization forever' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Empathetic stakeholder consultation emphasizing job enrichment, workload reduction, and retraining dismantles automation anxiety.'
    },

    // ═════════════════════════════════════════════════════════════════════════
    // LEVEL 5: Department Head (28 questions across 7 competencies)
    // ═════════════════════════════════════════════════════════════════════════
    // 1. Digital Transformation Strategy (4 questions)
    {
      level: 5,
      competency: 'Digital Transformation Strategy',
      difficulty: 'medium',
      text: 'As Department Head formulating a 5-year Digital Transformation Roadmap for MoSPI, what is the primary strategic cornerstone?',
      options: [
        { id: 'opt_1', text: 'An enterprise architecture integrating open standards, cloud infrastructure, citizen-centric data pipelines, and robust data governance' },
        { id: 'opt_2', text: 'Replacing desktop computers with expensive tablet computers every six months' },
        { id: 'opt_3', text: 'Outsourcing all ministry operations entirely to private foreign entities' },
        { id: 'opt_4', text: 'Focusing exclusively on social media follower acquisition' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Enterprise architecture (such as IndEA 2.0) creates a sustainable, federated digital foundation for interoperable national services.'
    },
    {
      level: 5,
      competency: 'Digital Transformation Strategy',
      difficulty: 'medium',
      text: 'How should a Department Head evaluate whether an emerging technology (e.g. Blockchain for land/survey records) warrants ministry-wide institutional adoption?',
      options: [
        { id: 'opt_1', text: 'Conduct a phased Proof-of-Concept (PoC) testing scalability, cost-effectiveness, statutory compliance, and operational value' },
        { id: 'opt_2', text: 'Mandate immediate nationwide rollout based on industry hype' },
        { id: 'opt_3', text: 'Ignore emerging technologies until other countries adopt them for 20 years' },
        { id: 'opt_4', text: 'Allow each section to buy different incompatible experimental systems' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Phased PoCs and rigorous business-case evaluations mitigate capital waste and validate real-world operational scalability.'
    },
    {
      level: 5,
      competency: 'Digital Transformation Strategy',
      difficulty: 'hard',
      text: 'In driving national statistical modernization, what role does India Stack (Aadhaar, DigiLocker, UPI, Data Empowerment and Protection Architecture) play in your vision?',
      options: [
        { id: 'opt_1', text: 'Acts as foundational Public Digital Infrastructure (DPI) enabling verifiable, consent-based, and friction-free data governance' },
        { id: 'opt_2', text: 'It has no relevance to statistical operations' },
        { id: 'opt_3', text: 'It is solely an online payment tool for consumer commerce' },
        { id: 'opt_4', text: 'It replaces the need for professional statistical officers' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'India Stack provides reusable digital public goods that unlock secure citizen authentication, consent-driven data sharing, and verifiable records.'
    },
    {
      level: 5,
      competency: 'Digital Transformation Strategy',
      difficulty: 'hard',
      text: 'When legacy IT systems across 20 regional offices prevent real-time data collation, what architectural approach should the Department Head champion?',
      options: [
        { id: 'opt_1', text: 'A modular, API-first microservices architecture with a centralized data lakehouse, decoupling data ingestion from presentation' },
        { id: 'opt_2', text: 'Building one massive monolithic mainframe server with proprietary protocols' },
        { id: 'opt_3', text: 'Continue using manual email spreadsheet attachments indefinitely' },
        { id: 'opt_4', text: 'Shut down all regional offices to centralize data entry in New Delhi' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Modern API-led architectures decouple data producers from consumers, allowing gradual migration of legacy silos without system paralysis.'
    },

    // 2. Policy Implementation (4 questions)
    {
      level: 5,
      competency: 'Policy Implementation',
      difficulty: 'medium',
      text: 'Following Cabinet approval of a new National Data Governance Policy, what is the Department Head\'s immediate executive responsibility?',
      options: [
        { id: 'opt_1', text: 'Formulate operational guidelines, establish institutional oversight bodies, define implementation milestones, and allocate resources' },
        { id: 'opt_2', text: 'Wait for subordinate divisions to figure out their own interpretation' },
        { id: 'opt_3', text: 'Declare the policy finished since Cabinet has already approved it' },
        { id: 'opt_4', text: 'Assign policy implementation to an external intern' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Translating statutory policy into reality requires operational guidelines, monitoring frameworks, executive committees, and budgetary allocation.'
    },
    {
      level: 5,
      competency: 'Policy Implementation',
      difficulty: 'medium',
      text: 'When a statutory audit by the Comptroller and Auditor General (CAG) identifies persistent compliance lapses in scheme fund utilization, how should the Department Head respond?',
      options: [
        { id: 'opt_1', text: 'Institute systemic internal controls, establish time-bound Action Taken Reports (ATRs), and hold division heads accountable' },
        { id: 'opt_2', text: 'Challenge the constitutional authority of the CAG publicly' },
        { id: 'opt_3', text: 'Shelve the audit report in storage without response' },
        { id: 'opt_4', text: 'Blame junior assistants for systemic fiscal flaws' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Constructive governance demands institutional ownership, formal Action Taken Notes (ATNs), and automated financial validation gates.'
    },
    {
      level: 5,
      competency: 'Policy Implementation',
      difficulty: 'hard',
      text: 'A flagship national survey faces intense public debate regarding methodology changes. What executive posture best protects the institution\'s integrity?',
      options: [
        { id: 'opt_1', text: 'Convene the National Statistical Commission (NSC) technical advisory committee, publish comprehensive methodology white papers, and engage open peer dialogue' },
        { id: 'opt_2', text: 'Suppress the report to prevent public debate' },
        { id: 'opt_3', text: 'Attack critics through anonymous press leaks' },
        { id: 'opt_4', text: 'Change the methodology back overnight without scientific review' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'National statistical credibility depends on scientific transparency, peer review through institutional oversight bodies (NSC), and open access.'
    },
    {
      level: 5,
      competency: 'Policy Implementation',
      difficulty: 'hard',
      text: 'In implementing the GIGW (Guidelines for Indian Government Websites) 3.0 across all ministry portals, what accountability mechanism ensures compliance?',
      options: [
        { id: 'opt_1', text: 'Mandating STQC certification, web accessibility audits for persons with disabilities, and tying compliance to departmental performance ratings' },
        { id: 'opt_2', text: 'Asking the web developer if they think the site looks nice' },
        { id: 'opt_3', text: 'Viewing the home page once on an office phone' },
        { id: 'opt_4', text: 'Hiring a social media influencer to promote the website' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'GIGW compliance is verified through formal STQC audits, Section 508 / WCAG 2.1 accessibility standards, and departmental governance KPIs.'
    },

    // 3. Leadership (4 questions)
    {
      level: 5,
      competency: 'Leadership',
      difficulty: 'medium',
      text: 'During a crisis where a database corruption halts national statistical reporting, how does an exemplary Department Head lead the crisis response?',
      options: [
        { id: 'opt_1', text: 'Project calm resolve, mobilize cross-functional incident response teams, establish hourly executive briefings, and focus on recovery before post-mortems' },
        { id: 'opt_2', text: 'Panic and publicly scold server administrators in front of colleagues' },
        { id: 'opt_3', text: 'Lock the office door and refuse to answer leadership calls' },
        { id: 'opt_4', text: 'Resign immediately to avoid accountability' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Executive crisis leadership demands composure, psychological safety, prioritized triage, clear communications, and blameless post-incident reviews.'
    },
    {
      level: 5,
      competency: 'Leadership',
      difficulty: 'medium',
      text: 'How should a Department Head foster an institutional culture of continuous learning and innovation among 500+ statistical and administrative officers?',
      options: [
        { id: 'opt_1', text: 'Incentivize iGOT Karmayogi completions, establish annual technical innovation awards, and sponsor advanced data science fellowships' },
        { id: 'opt_2', text: 'Reprimand any officer who suggests doing things differently from the past' },
        { id: 'opt_3', text: 'Mandate that officers only read 30-year-old paper manuals' },
        { id: 'opt_4', text: 'Cancel all training programs to maximize desk typing hours' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Mission Karmayogi thrives when leadership aligns professional growth, recognition, and advanced capability building with institutional goals.'
    },
    {
      level: 5,
      competency: 'Leadership',
      difficulty: 'hard',
      text: 'Two senior directors heading interrelated statistical divisions engage in a protracted jurisdictional conflict over who manages national economic census data. How should the Department Head resolve this?',
      options: [
        { id: 'opt_1', text: 'Define clear Terms of Reference (ToR), establish collaborative governance structures with shared KPIs, and arbitrate based on institutional synergy' },
        { id: 'opt_2', text: 'Ignore the conflict and let them fight it out in corridors' },
        { id: 'opt_3', text: 'Transfer both directors out of the ministry simultaneously' },
        { id: 'opt_4', text: 'Split the survey randomly into two broken halves' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Resolving executive friction requires clarifying organizational charters, aligning incentives around shared outcomes, and definitive structural arbitration.'
    },
    {
      level: 5,
      competency: 'Leadership',
      difficulty: 'hard',
      text: 'What leadership approach best drives ethical integrity and zero-tolerance for data manipulation within a national statistical system?',
      options: [
        { id: 'opt_1', text: 'Tone at the top: unwavering defense of methodological independence, whistleblower protections, and strict adherence to UN Fundamental Principles of Official Statistics' },
        { id: 'opt_2', text: 'Encouraging data adjustments whenever political leaders request better numbers' },
        { id: 'opt_3', text: 'Firing statisticians whose findings show economic slowdowns' },
        { id: 'opt_4', text: 'Pretending that data manipulation is impossible in government' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Executive leadership must uphold the UN Fundamental Principles of Official Statistics, safeguarding scientific independence and ethical credibility.'
    },

    // 4. Risk Management (4 questions)
    {
      level: 5,
      competency: 'Risk Management',
      difficulty: 'medium',
      text: 'As part of departmental enterprise risk management (ERM), what is the purpose of maintaining an active Departmental Risk Register?',
      options: [
        { id: 'opt_1', text: 'Documenting identified risks, likelihood and impact ratings, mitigation owners, and proactive contingency triggers' },
        { id: 'opt_2', text: 'Recording employee personal health insurance details' },
        { id: 'opt_3', text: 'A list of office furniture requiring repair' },
        { id: 'opt_4', text: 'A ledger of daily stationery expenditures' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'An institutional Risk Register tracks operational, strategic, and cyber vulnerabilities with quantified severity and mitigation ownership.'
    },
    {
      level: 5,
      competency: 'Risk Management',
      difficulty: 'medium',
      text: 'In the event of a major seismic disaster or prolonged power outage disabling the primary New Delhi data center, what ensures business continuity for critical national statistics?',
      options: [
        { id: 'opt_1', text: 'A geographically separated Disaster Recovery (DR) site with real-time replication and an automated RTO/RPO failover plan' },
        { id: 'opt_2', text: 'Keeping a paper copy of the password in the building basement' },
        { id: 'opt_3', text: 'Hoping that the power returns within a few weeks' },
        { id: 'opt_4', text: 'Calling local hardware repair shops after the disaster occurs' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Disaster Recovery protocols require distinct seismic zone replication, verified Recovery Time Objectives (RTO), and tested failover drills.'
    },
    {
      level: 5,
      competency: 'Risk Management',
      difficulty: 'hard',
      text: 'When outsourcing large-scale digital data processing to external IT vendors, what is the most significant strategic counterparty risk, and how is it mitigated?',
      options: [
        { id: 'opt_1', text: 'Vendor lock-in and intellectual property loss; mitigated by requiring open-source architectures, full source code escrow, and strict data exit clauses' },
        { id: 'opt_2', text: 'The vendor charging slightly more for printing paper' },
        { id: 'opt_3', text: 'The vendor sending too many polite festival greeting emails' },
        { id: 'opt_4', text: 'There are no risks when hiring large commercial vendors' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Vendor lock-in is neutralized through open standards, source code ownership, data portability rights, and structured transition obligations.'
    },
    {
      level: 5,
      competency: 'Risk Management',
      difficulty: 'hard',
      text: 'How should a Department Head evaluate operational risks arising from artificial intelligence algorithms generating administrative notices or processing welfare eligibility?',
      options: [
        { id: 'opt_1', text: 'Mandate algorithmic bias audits, explainability standards, strict human-in-the-loop oversight, and formal appeals mechanisms' },
        { id: 'opt_2', text: 'Allow the AI to operate completely unsupervised without human review' },
        { id: 'opt_3', text: 'Ban all automated computing systems forever' },
        { id: 'opt_4', text: 'Blame the algorithm if citizens suffer unconstitutional exclusions' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Ethical public sector AI requires human-in-the-loop safeguards, algorithmic explainability, auditability, and constitutional rights protection.'
    },

    // 5. Data-driven Governance (4 questions)
    {
      level: 5,
      competency: 'Data-driven Governance',
      difficulty: 'medium',
      text: 'What is the institutional purpose of establishing a "Single Source of Truth" (SSOT) data repository for national economic indicators?',
      options: [
        { id: 'opt_1', text: 'Eliminates conflicting discrepancies across ministries, ensuring unified, authoritative statistical baselines for national planning' },
        { id: 'opt_2', text: 'Restricts data access so only one person in the country can read it' },
        { id: 'opt_3', text: 'Ensures that all statistics never change over time' },
        { id: 'opt_4', text: 'Replaces all academic research with government press releases' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'A verified SSOT guarantees harmonized master data across federal entities, preventing conflicting policy decisions based on divergent numbers.'
    },
    {
      level: 5,
      competency: 'Data-driven Governance',
      difficulty: 'medium',
      text: 'How should a Department Head institutionalize real-time dashboard monitoring for national developmental welfare schemes (e.g. PRAGATI / PM GatiShakti)?',
      options: [
        { id: 'opt_1', text: 'Automate API data pipes from executing agencies, enforce geospatial tracking, and establish exception-based alert thresholds for delayed projects' },
        { id: 'opt_2', text: 'Ask local officers to write manual letters whenever they feel like it' },
        { id: 'opt_3', text: 'Rely on rumors published in regional newspapers' },
        { id: 'opt_4', text: 'Update the dashboard once every 5 years' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'High-impact executive governance dashboards rely on automated API ingestion, GIS spatial overlays, and variance threshold alerts.'
    },
    {
      level: 5,
      competency: 'Data-driven Governance',
      difficulty: 'hard',
      text: 'When reconciling administrative records (GSTN, EPFO, MCA-21) with traditional household survey statistics for GDP estimation, what strategic methodology governs success?',
      options: [
        { id: 'opt_1', text: 'Statistical data linkage frameworks, deduplication algorithms, coverage gap analysis, and unified enterprise registry identification' },
        { id: 'opt_2', text: 'Discarding survey data entirely because administrative tax data is always 100% complete' },
        { id: 'opt_3', text: 'Discarding tax data because surveys are older' },
        { id: 'opt_4', text: 'Averaging the total numbers without checking definitions' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Modern National Accounts combine administrative big data with probabilistic survey sampling through systematic entity resolution and coverage controls.'
    },
    {
      level: 5,
      competency: 'Data-driven Governance',
      difficulty: 'hard',
      text: 'Under the National Data Governance Framework Policy (NDGFP), what is the objective of establishing the India Datasets Program for non-personal data?',
      options: [
        { id: 'opt_1', text: 'Creating an anonymized, high-quality public research database to fuel domestic AI research, startup innovation, and evidence-based governance' },
        { id: 'opt_2', text: 'Selling citizen data to overseas data brokers for profit' },
        { id: 'opt_3', text: 'Restricting all government research to government officers only' },
        { id: 'opt_4', text: 'Deleting all non-personal data after 30 days' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'The India Datasets platform democratizes access to anonymized non-personal data to catalyze domestic AI and evidence-based research.'
    },

    // 6. Change Management (4 questions)
    {
      level: 5,
      competency: 'Change Management',
      difficulty: 'medium',
      text: 'When leading an institutional shift from legacy paper files to 100% digital e-Office across 10,000 pan-India staff, what change management framework ensures enduring success?',
      options: [
        { id: 'opt_1', text: 'ADKAR model: building Awareness, Desire, Knowledge, Ability, and Reinforcement through champions, training, and positive recognition' },
        { id: 'opt_2', text: 'Issuing a punitive threat memo on Friday evening stating everyone will be suspended if not digital by Monday' },
        { id: 'opt_3', text: 'Removing all paper from the building without providing computers or training' },
        { id: 'opt_4', text: 'Telling employees that digital transformation is optional' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Prosci\'s ADKAR model addresses human emotional transitions, building competence and behavioral reinforcement alongside technological deployment.'
    },
    {
      level: 5,
      competency: 'Change Management',
      difficulty: 'medium',
      text: 'During a major departmental reorganization merging two statistical wings, how should leadership address entrenched resistance and anxiety among cadre officers?',
      options: [
        { id: 'opt_1', text: 'Conduct transparent town halls, establish parity transition committees, address seniority concerns openly, and clarify unified mission goals' },
        { id: 'opt_2', text: 'Ignore staff concerns and refuse to meet officer associations' },
        { id: 'opt_3', text: 'Threaten officers with remote transfers if they ask questions' },
        { id: 'opt_4', text: 'Declare that the merger was an accident' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Transparent communication, fair representation in transition planning, and structured cadre harmonization dissolves organizational resistance.'
    },
    {
      level: 5,
      competency: 'Change Management',
      difficulty: 'hard',
      text: 'How does a Department Head institutionalize a culture where junior officers feel psychologically safe to flag statistical anomalies or errors without fear of reprisal?',
      options: [
        { id: 'opt_1', text: 'Model humility, celebrate error detection as quality assurance victories, and replace blame-seeking with blameless systemic investigations' },
        { id: 'opt_2', text: 'Issue official disciplinary charges whenever an officer detects a typo in an approved draft' },
        { id: 'opt_3', text: 'Reward officers who sweep data problems under the rug' },
        { id: 'opt_4', text: 'Prohibit junior officers from reviewing senior officers\' calculations' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'High-reliability institutions foster psychological safety, where discovering errors early is celebrated as vital quality assurance.'
    },
    {
      level: 5,
      competency: 'Change Management',
      difficulty: 'hard',
      text: 'What is the role of "Change Champions" when rolling out complex enterprise digital platforms across district statistical offices?',
      options: [
        { id: 'opt_1', text: 'Enthusiastic local peer leaders trained deeply to provide on-ground handholding, gather feedback, and demonstrate peer success' },
        { id: 'opt_2', text: 'External actors hired to give motivational speeches once a year' },
        { id: 'opt_3', text: 'Officers appointed to monitor other employees\' bathroom breaks' },
        { id: 'opt_4', text: 'Marketing mascots who wear branded costumes' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Local peer change champions provide relatable, continuous on-the-ground support, dramatically speeding up adoption and feedback loops.'
    },

    // 7. AI/Technology Awareness (4 questions)
    {
      level: 5,
      competency: 'AI/Technology Awareness',
      difficulty: 'medium',
      text: 'Your department plans to introduce an AI-based citizen service system. Which factor should be prioritized before large-scale deployment?',
      options: [
        { id: 'opt_1', text: 'Data privacy, algorithmic fairness, hallucination safeguards, cybersecurity compliance, and human verification fallbacks' },
        { id: 'opt_2', text: 'Whether the AI has a friendly cartoon avatar' },
        { id: 'opt_3', text: 'Deploying immediately without testing because AI never makes mistakes' },
        { id: 'opt_4', text: 'Allowing the AI to make irreversible legal decisions without human appeal' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Responsible government AI requires data protection, rigorous evaluation for hallucinations/bias, and mandatory human-in-the-loop governance.'
    },
    {
      level: 5,
      competency: 'AI/Technology Awareness',
      difficulty: 'medium',
      text: 'When considering Generative AI (LLMs) to assist officers in drafting routine circulars and summaries, what security constraint is non-negotiable for official data?',
      options: [
        { id: 'opt_1', text: 'Ensuring models run on sovereign secure infrastructure without sending sensitive internal notes to public external model training pipelines' },
        { id: 'opt_2', text: 'Allowing officers to paste confidential cabinet drafts into free commercial web chatbots' },
        { id: 'opt_3', text: 'Banning all computers and returning to manual typewriters' },
        { id: 'opt_4', text: 'Publishing internal prompts on public websites' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Sovereign deployment on government cloud (e.g. Bhashini / NIC AI) prevents unvetted exfiltration of sensitive government data into public AI training sets.'
    },
    {
      level: 5,
      competency: 'AI/Technology Awareness',
      difficulty: 'hard',
      text: 'What is the role of Computer Vision and Remote Sensing Satellite Imagery in modernizing agricultural crop yield estimation for national statistics?',
      options: [
        { id: 'opt_1', text: 'Provides objective, scalable, real-time vegetation index (NDVI) assessments, augmenting traditional crop-cutting experiments (CCEs)' },
        { id: 'opt_2', text: 'Replaces all farmers with agricultural robots' },
        { id: 'opt_3', text: 'Takes high-resolution photos of individual farmers\' personal homes' },
        { id: 'opt_4', text: 'It has proven to be completely useless for agricultural statistics' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Geospatial satellite telemetry (NDVI/SAR) combined with stratified ground truth CCEs yields robust, timely crop production estimates.'
    },
    {
      level: 5,
      competency: 'AI/Technology Awareness',
      difficulty: 'hard',
      text: 'How can Natural Language Processing (NLP) and Optical Character Recognition (OCR) enhance efficiency in processing multi-lingual citizen feedback under Project Bhashini?',
      options: [
        { id: 'opt_1', text: 'Automates translation across 22 Scheduled Indian Languages, sentiment categorization, and automated routing to concerned nodal desks' },
        { id: 'opt_2', text: 'Translates all citizen queries into ancient Latin' },
        { id: 'opt_3', text: 'Deletes grievances that are written in regional languages' },
        { id: 'opt_4', text: 'Replies to every citizen with an automated poem' }
      ],
      correct_option_id: 'opt_1',
      explanation: 'Project Bhashini provides language AI models for seamless Indian language translation, acoustic recognition, and accessible public service delivery.'
    }
  ]

  // 3. Clear legacy questions with level 1-5 to ensure fresh, clean, robust diagnostic question bank
  const deleteResult = await Question.deleteMany({ level: { $in: [1, 2, 3, 4, 5] }, quizId: null })
  console.log(`Cleaned up ${deleteResult.deletedCount} legacy unlinked questions.`)

  // 4. Insert curated questions
  let insertedCount = 0
  for (const q of questionsData) {
    const compId = compMap.get(q.competency)
    if (!compId) {
      console.warn(`! Competency not mapped: ${q.competency}`)
    }

    const optIndex = q.options.findIndex((o) => o.id === q.correct_option_id)

    await Question.create({
      text: q.text,
      options: q.options,
      correct_option_id: q.correct_option_id,
      correctOptionIndex: optIndex >= 0 ? optIndex : 0,
      competency_id: compId || null,
      level: q.level,
      difficulty: q.difficulty,
      explanation: q.explanation,
      quizId: null,
    })
    insertedCount++
  }

  console.log(`\n✓ Successfully seeded ${insertedCount} diagnostic questions across 5 cadre levels!`)

  // 5. Ensure master Diagnostic Assessment records exist for Levels 1 to 5
  for (let lvl = 1; lvl <= 5; lvl++) {
    const tierNames = [
      '',
      'Support Staff',
      'Junior Assistant',
      'Section Officer',
      'Senior Officer',
      'Department Head',
    ]
    await Assessment.findOneAndUpdate(
      { level: lvl, type: 'diagnostic' },
      {
        name: `Cadre Level ${lvl} Diagnostic Assessment (${tierNames[lvl]})`,
        type: 'diagnostic',
        level: lvl,
        total_questions: 15,
      },
      { upsert: true, new: true }
    )
    console.log(`✓ Verified Assessment entity for Level ${lvl}: ${tierNames[lvl]}`)
  }

  console.log('\n================================================================')
  console.log('       PART 3 QUESTION BANK SEEDING COMPLETED SUCCESSFULLY      ')
  console.log('================================================================\n')
}

module.exports = seedQuestionBank

if (require.main === module) {
  require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kaushalai'
  mongoose
    .connect(mongoUri)
    .then(() => seedQuestionBank())
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Diagnostic Question Bank seed failed:', err)
      process.exit(1)
    })
}
