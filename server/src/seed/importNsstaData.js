/**
 * importNsstaData.js
 * ─────────────────────────────────────────────────────────────────────────────
 * STAGE 1 of 2 in the NSSTA real-data pipeline.
 *
 * Downloads NSSTA Training Calendar PDFs from public MoSPI/NSSTA URLs,
 * extracts candidate course entries using a HEURISTIC TEXT PARSER (no LLM),
 * and writes the raw candidates to seed/data/nssta_extracted_raw.json for
 * HUMAN REVIEW before any MongoDB insertion.
 *
 * THIS SCRIPT IS A ONE-TIME DATA PREPARATION UTILITY.
 * It must never be imported or called from the live application.
 *
 * Usage:
 *   cd server && node src/seed/importNsstaData.js
 *
 * Output:
 *   server/src/seed/data/nssta_extracted_raw.json   ← review this manually
 *
 * After review, clean the entries into nssta_courses_reviewed.json format
 * and run applyReviewedNsstaCourses.js to insert into MongoDB.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict'

const axios   = require('axios')
const pdfParse = require('pdf-parse')
const fs      = require('fs')
const path    = require('path')

// ─────────────────────────────────────────────────────────────────────────────
// ▼▼▼  PASTE YOUR NSSTA TRAINING CALENDAR PDF URLS HERE  ▼▼▼
// Each entry: { label: 'human-readable name', url: 'https://...' }
// Example URLs from mospi.gov.in/nssta/training-calendar:
// ─────────────────────────────────────────────────────────────────────────────
const PDF_SOURCES = [
  {
    label: 'NSSTA Training Calendar 2024-25',
    url:   'PASTE_URL_HERE',   // e.g. https://mospi.gov.in/sites/default/files/nssta/training-calendar-2024-25.pdf
  },
  {
    label: 'NSSTA Training Calendar 2023-24',
    url:   'PASTE_URL_HERE',
  },
  // Add more as needed
]
// ─────────────────────────────────────────────────────────────────────────────

const OUT_PATH = path.join(__dirname, 'data', 'nssta_extracted_raw.json')

// ── Known target-group keywords that appear in NSSTA calendars ───────────────
const TARGET_GROUP_KEYWORDS = ['ISS', 'SSS', 'State DES', 'University', 'International', 'In-service', 'Officers']

// ── Duration patterns ─────────────────────────────────────────────────────────
const DURATION_PATTERNS = [
  /(\d+)\s*week[s]?/i,
  /(\d+)\s*day[s]?/i,
  /(\d+)\s*month[s]?/i,
]

/**
 * Convert a matched duration string to approximate hours.
 * Known limitation: relies on the surrounding match text — doesn't understand
 * partial weeks or combined expressions like "1 week 3 days".
 */
function parseDurationHours(matchText) {
  const weekMatch  = matchText.match(/(\d+)\s*week[s]?/i)
  const dayMatch   = matchText.match(/(\d+)\s*day[s]?/i)
  const monthMatch = matchText.match(/(\d+)\s*month[s]?/i)
  if (weekMatch)  return parseInt(weekMatch[1],  10) * 5 * 6   // 5 days × 6 hrs
  if (monthMatch) return parseInt(monthMatch[1], 10) * 20 * 6
  if (dayMatch)   return parseInt(dayMatch[1],   10) * 6
  return null
}

/**
 * Heuristic course extractor from raw PDF text.
 *
 * ASSUMPTIONS (document clearly — will fail if PDF layout differs):
 *   1. Course titles appear as their own line or at the start of a line,
 *      typically followed within the next 3 lines by duration text.
 *   2. Lines that are mostly uppercase and longer than 15 chars are
 *      candidate course titles (NSSTA calendar convention).
 *   3. Target-group information appears either on the same line as the
 *      title or within the next 4 lines.
 *   4. Table headers (e.g. "S.No", "Course Title", "Duration") and page
 *      footers are filtered by known marker strings.
 *
 * KNOWN LIMITATIONS:
 *   - Courses split across page boundaries will be missed.
 *   - Multi-column PDF layouts may produce interleaved text that confuses
 *     line-based parsing (pdf-parse reads left-to-right, column order varies).
 *   - Entries formatted differently across calendar years (e.g., 2021-22 vs
 *     2024-25) may not be captured consistently.
 *   - This is best-effort extraction — always review nssta_extracted_raw.json
 *     before running applyReviewedNsstaCourses.js.
 */
function extractCoursesFromText(text, sourceLabel) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // Filter obvious noise lines
  const NOISE_MARKERS = [
    'S.No', 'S. No', 'Sl. No', 'Course Title', 'Duration', 'Target Group',
    'NATIONAL STATISTICAL SYSTEMS TRAINING ACADEMY', 'NSSTA', 'Page ', 'Annexure',
    'Ministry of Statistics', 'MoSPI', 'Training Calendar', 'Government of India',
  ]
  const isNoise = (line) => NOISE_MARKERS.some((m) => line.startsWith(m) || line === m)

  const candidates = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isNoise(line)) continue

    // Heuristic: line is a candidate title if:
    //   - 15+ chars long
    //   - Not a pure number (serial numbers)
    //   - Not a standalone keyword
    //   - Has at least 2 words
    const isCandidateTitle =
      line.length >= 15 &&
      !/^\d+$/.test(line) &&
      line.split(/\s+/).length >= 2

    if (!isCandidateTitle) continue

    // Look ahead up to 5 lines for duration and target group
    const lookahead = lines.slice(i + 1, i + 6).join(' ')
    const combined  = line + ' ' + lookahead

    // Must have a duration marker nearby to be treated as a real course entry
    const hasDuration = DURATION_PATTERNS.some((re) => re.test(combined))
    if (!hasDuration) continue

    // Extract duration
    let durationText = null
    let durationHours = null
    for (const re of DURATION_PATTERNS) {
      const m = combined.match(re)
      if (m) { durationText = m[0]; durationHours = parseDurationHours(m[0]); break }
    }

    // Extract target groups
    const targetGroups = TARGET_GROUP_KEYWORDS.filter((kw) =>
      combined.toLowerCase().includes(kw.toLowerCase())
    )

    // Build a rough description from the surrounding lines
    const descLines = lines.slice(i + 1, i + 4)
      .filter((l) => !isNoise(l) && l.length > 10)
    const description = descLines.join(' ').slice(0, 300) || ''

    candidates.push({
      title:        line,
      description,
      durationText,
      durationHours,
      targetGroups: targetGroups.length ? targetGroups : ['General'],
      source:       sourceLabel,
      // These will be filled during manual review:
      skillTags:    [],
      difficulty:   null,
    })
  }

  return candidates
}

async function downloadPdf(url) {
  const resp = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60_000,
    headers: { 'User-Agent': 'KaushalAI-DataImport/1.0 (research; contact: admin@kaushalai)' },
  })
  return Buffer.from(resp.data)
}

async function main() {
  const placeholder = PDF_SOURCES.filter((s) => s.url === 'PASTE_URL_HERE')
  if (placeholder.length === PDF_SOURCES.length) {
    console.error('\n❌  No URLs configured.')
    console.error('   Open server/src/seed/importNsstaData.js and fill in the PDF_SOURCES array.')
    process.exit(1)
  }

  const allCandidates = []

  for (const src of PDF_SOURCES) {
    if (src.url === 'PASTE_URL_HERE') {
      console.warn(`⚠️  Skipping "${src.label}" — URL not configured.`)
      continue
    }

    console.log(`\n⬇  Downloading: ${src.label}`)
    console.log(`   URL: ${src.url}`)

    let pdfBuffer
    try {
      pdfBuffer = await downloadPdf(src.url)
      console.log(`   Downloaded: ${(pdfBuffer.length / 1024).toFixed(0)} KB`)
    } catch (err) {
      console.error(`   ❌ Download failed: ${err.message}`)
      continue
    }

    let text
    try {
      const parsed = await pdfParse(pdfBuffer)
      text = parsed.text
      console.log(`   Extracted: ${text.length} chars, ${text.split('\n').length} lines`)
    } catch (err) {
      console.error(`   ❌ PDF parsing failed: ${err.message}`)
      continue
    }

    const candidates = extractCoursesFromText(text, src.label)
    console.log(`   📋 Found: ${candidates.length} candidate course entries (heuristic — review required)`)
    allCandidates.push(...candidates)
  }

  // Deduplicate by title (case-insensitive)
  const seen = new Set()
  const unique = allCandidates.filter((c) => {
    const key = c.title.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify(unique, null, 2), 'utf-8')

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`✅  Extraction complete.`)
  console.log(`   Total candidates:   ${allCandidates.length}`)
  console.log(`   After dedup:        ${unique.length}`)
  console.log(`   Output:             ${OUT_PATH}`)
  console.log(`\n⚠️  NEXT STEPS — REQUIRED BEFORE DB INSERT:`)
  console.log(`   1. Open seed/data/nssta_extracted_raw.json`)
  console.log(`   2. Delete/merge bad entries (noise, duplicates, split titles)`)
  console.log(`   3. Fill in: skillTags (string array), difficulty (beginner/intermediate/advanced)`)
  console.log(`   4. Copy cleaned entries to seed/data/nssta_courses_reviewed.json`)
  console.log(`   5. Run: node src/seed/applyReviewedNsstaCourses.js`)
  console.log(`${'─'.repeat(60)}\n`)
}

main().catch((err) => { console.error(err); process.exit(1) })
