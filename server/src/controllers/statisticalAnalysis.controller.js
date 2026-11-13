'use strict'

const multer = require('multer')
const {
  parseDataset,
  parseExcelBuffer,
  buildDatasetFromRows,
  computeDescriptiveStats,
  computeCorrelationMatrix,
  computeLinearRegression,
  computeHypothesisTest,
  getSampleSurveyDataset,
} = require('../services/statisticalAnalysis.service')

// ── Multer: in-memory only, strictly no disk writes ───────────────────────────
// Accept CSV, TSV, plain-text AND Excel (.xlsx) files.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB maximum
  },
  fileFilter(_req, file, cb) {
    const original = (file.originalname || '').toLowerCase()
    const mime = file.mimetype || ''

    const isCsv =
      mime === 'text/csv' ||
      mime === 'application/vnd.ms-excel' ||
      mime === 'text/plain' ||
      mime === 'text/tab-separated-values' ||
      original.endsWith('.csv') ||
      original.endsWith('.tsv') ||
      original.endsWith('.txt')

    const isXlsx =
      mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mime === 'application/octet-stream' ||
      original.endsWith('.xlsx')

    if (isCsv || isXlsx) {
      cb(null, true)
    } else {
      cb(new Error(
        'Invalid file format. Please upload a CSV, TSV, or Excel (.xlsx) dataset. ' +
        'Legacy .xls format is not supported — please re-save as .xlsx.'
      ))
    }
  },
}).single('file')

function runMulterUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE'
          ? 'File exceeds 10 MB upload limit. Please upload a smaller dataset.'
          : err.message
        const e = new Error(message)
        e.status = 400
        reject(e)
      } else if (err) {
        const e = new Error(err.message)
        e.status = 400
        reject(e)
      } else {
        resolve()
      }
    })
  })
}

/**
 * Detect if a buffer is an Excel OOXML (.xlsx) file by its ZIP magic bytes (PK).
 */
function isXlsxBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 4 &&
    buf[0] === 0x50 && buf[1] === 0x4b
}

/**
 * Validates ZIP / OOXML archive structure against decompression bombs.
 * Scans local file headers to verify total uncompressed size and compression ratio.
 */
function validateXlsxArchive(buf, maxUncompressedBytes = 50 * 1024 * 1024, maxRatio = 50) {
  if (!Buffer.isBuffer(buf) || buf.length < 30) {
    return { valid: false, error: 'File is too small to be a valid spreadsheet archive.' }
  }
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
    return { valid: false, error: 'File does not have valid ZIP / OOXML archive header.' }
  }

  let totalUncompressed = 0
  let offset = 0

  while (offset < buf.length - 4) {
    const sig = buf.readUInt32LE(offset)
    if (sig === 0x04034b50) { // Local file header PK\x03\x04
      if (offset + 30 > buf.length) break
      const uncomp = buf.readUInt32LE(offset + 22)
      const fnLen = buf.readUInt16LE(offset + 26)
      const extraLen = buf.readUInt16LE(offset + 28)
      totalUncompressed += uncomp
      if (totalUncompressed > maxUncompressedBytes) {
        return {
          valid: false,
          error: `Decompression bomb protection triggered: uncompressed content exceeds ${maxUncompressedBytes / 1024 / 1024} MB limit.`,
        }
      }
      offset += 30 + fnLen + extraLen
    } else if (sig === 0x02014b50) { // Central directory PK\x01\x02
      break
    } else {
      offset++
    }
  }

  const ratio = totalUncompressed / Math.max(1, buf.length)
  if (ratio > maxRatio) {
    return {
      valid: false,
      error: `Decompression bomb protection triggered: compression ratio ${ratio.toFixed(1)}:1 exceeds safety limit of ${maxRatio}:1.`,
    }
  }

  return { valid: true, totalUncompressed, ratio }
}

/**
 * Run computeDescriptiveStats across all columns and computeCorrelationMatrix.
 */
function runAnalysis(parsed) {
  const statistics = {}
  for (const h of parsed.headers) {
    statistics[h] = computeDescriptiveStats(parsed.columns[h], parsed.columnTypes[h])
  }
  const correlation = computeCorrelationMatrix(parsed)
  return { statistics, correlation }
}

// ── POST /api/statistical-analysis/upload ─────────────────────────────────────
/**
 * Analyzes uploaded CSV, TSV, or Excel (.xlsx) dataset.
 *
 * Body options (multipart):
 *   file           — uploaded file (CSV/TSV/XLSX)
 *   sheetName      — (xlsx only) sheet name to parse; defaults to first visible sheet
 *   sheetIndex     — (xlsx only) 1-based sheet index to parse
 *   useSample      — when "true", ignores file and returns MoSPI sample analysis
 *   csvText        — raw CSV string (alternative to file upload)
 *   filename       — optional filename label for csvText uploads
 */
async function analyzeDataset(req, res, next) {
  try {
    await runMulterUpload(req, res)

    // ── 1. Resolve the data source ────────────────────────────────────────────
    if (req.body?.useSample === 'true' || req.body?.useSample === true) {
      const sample = getSampleSurveyDataset()
      const parsed = parseDataset(sample.content)
      const { statistics, correlation } = runAnalysis(parsed)
      return res.json({
        success: true,
        filename: sample.filename,
        fileType: 'csv',
        metadata: buildMetadata(parsed),
        sampleRows: parsed.sampleRows,
        statistics,
        correlation,
        provenance: sample.provenance,
        csvText: parsed.csvText,
      })
    }

    if (req.file) {
      const filename = req.file.originalname || 'dataset'
      const buf = req.file.buffer

      // ── Excel path ──────────────────────────────────────────────────────────
      if ((filename.toLowerCase().endsWith('.xlsx') || req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') && !isXlsxBuffer(buf)) {
        const err = new Error('File does not appear to be a valid .xlsx workbook. Legacy .xls binary format is not supported — please save as .xlsx.')
        err.status = 400
        throw err
      }

      if (isXlsxBuffer(buf)) {
        const zipCheck = validateXlsxArchive(buf)
        if (!zipCheck.valid) {
          const err = new Error(zipCheck.error)
          err.status = 400
          throw err
        }

        // Resolve optional sheet selector from body
        let sheetSelector = null
        if (req.body?.sheetName) sheetSelector = String(req.body.sheetName)
        else if (req.body?.sheetIndex) sheetSelector = Number(req.body.sheetIndex)

        const { rows, sheetNames, selectedSheet } = await parseExcelBuffer(buf, sheetSelector)
        const parsed = buildDatasetFromRows(rows, selectedSheet)
        const { statistics, correlation } = runAnalysis(parsed)

        return res.json({
          success: true,
          filename,
          fileType: 'xlsx',
          selectedSheet,
          availableSheets: sheetNames,
          metadata: buildMetadata(parsed),
          sampleRows: parsed.sampleRows,
          statistics,
          correlation,
          csvText: parsed.csvText,
        })
      }

      // ── CSV / TSV / TXT path ────────────────────────────────────────────────
      const parsed = parseDataset(buf)
      const { statistics, correlation } = runAnalysis(parsed)
      return res.json({
        success: true,
        filename,
        fileType: 'csv',
        metadata: buildMetadata(parsed),
        sampleRows: parsed.sampleRows,
        statistics,
        correlation,
        csvText: parsed.csvText,
      })
    }

    // ── Raw CSV text path ───────────────────────────────────────────────────
    if (typeof req.body?.csvText === 'string' && req.body.csvText.trim()) {
      const parsed = parseDataset(req.body.csvText)
      const { statistics, correlation } = runAnalysis(parsed)
      return res.json({
        success: true,
        filename: req.body.filename || 'dataset.csv',
        fileType: 'csv',
        metadata: buildMetadata(parsed),
        sampleRows: parsed.sampleRows,
        statistics,
        correlation,
        csvText: parsed.csvText,
      })
    }

    return res.status(400).json({
      message: 'No dataset provided. Please upload a CSV or Excel file, or provide CSV data.',
    })
  } catch (err) {
    if (!err.status) err.status = 400
    next(err)
  }
}

function buildMetadata(parsed) {
  return {
    rowCount: parsed.rowCount,
    columnCount: parsed.columnCount,
    headers: parsed.headers,
    columnTypes: parsed.columnTypes,
    totalMissingCells: parsed.totalMissingCells,
    missingCellsPercentage: parsed.missingCellsPercentage,
    duplicateRowCount: parsed.duplicateRowCount,
    delimiter: parsed.delimiter,
  }
}

// ── POST /api/statistical-analysis/regression ─────────────────────────────────
async function runRegression(req, res, next) {
  try {
    const { csvText, xCol, yCol } = req.body || {}

    if (!xCol || !yCol) {
      return res.status(400).json({
        message: 'Both independent variable (xCol) and dependent variable (yCol) are required.',
      })
    }
    if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
      return res.status(400).json({
        message: 'Dataset csvText is required to perform regression.',
      })
    }

    const parsed = parseDataset(csvText)
    const regression = computeLinearRegression(parsed, xCol, yCol)
    return res.json({ success: true, regression })
  } catch (err) {
    if (!err.status) err.status = 400
    next(err)
  }
}

// ── POST /api/statistical-analysis/hypothesis-test ────────────────────────────
async function runHypothesis(req, res, next) {
  try {
    const {
      csvText,
      testType,
      column,
      hypothesizedMean,
      column2,
      alternative,
      alpha,
    } = req.body || {}

    if (!column) {
      return res.status(400).json({
        message: 'Target column is required for hypothesis testing.',
      })
    }
    if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
      return res.status(400).json({
        message: 'Dataset csvText is required to perform hypothesis test.',
      })
    }

    const parsed = parseDataset(csvText)
    const testResult = computeHypothesisTest(parsed, {
      testType: testType || 'one_sample',
      column,
      hypothesizedMean: hypothesizedMean !== undefined ? Number(hypothesizedMean) : 0,
      column2,
      alternative: alternative || 'two-sided',
      alpha: alpha !== undefined ? Number(alpha) : 0.05,
    })

    return res.json({ success: true, testResult })
  } catch (err) {
    if (!err.status) err.status = 400
    next(err)
  }
}

// ── GET /api/statistical-analysis/sample ──────────────────────────────────────
async function getSample(req, res, next) {
  try {
    const sample = getSampleSurveyDataset()
    return res.json({ success: true, sample })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/statistical-analysis/sheets ──────────────────────────────────────
/**
 * Returns sheet names from an uploaded .xlsx workbook WITHOUT parsing data.
 * Allows the client to present a sheet-selector before the full analysis.
 */
async function listExcelSheets(req, res, next) {
  try {
    await runMulterUpload(req, res)

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: 'No file uploaded.' })
    }
    if (!isXlsxBuffer(req.file.buffer)) {
      return res.status(400).json({
        message: 'File does not appear to be a valid .xlsx workbook.',
      })
    }

    const zipCheck = validateXlsxArchive(req.file.buffer)
    if (!zipCheck.valid) {
      return res.status(400).json({ message: zipCheck.error })
    }

    const { sheetNames, selectedSheet } = await parseExcelBuffer(req.file.buffer)
    return res.json({
      success: true,
      filename: req.file.originalname,
      sheetNames,
      defaultSheet: selectedSheet,
    })
  } catch (err) {
    if (!err.status) err.status = 400
    next(err)
  }
}

module.exports = {
  analyzeDataset,
  runRegression,
  runHypothesis,
  getSample,
  listExcelSheets,
  validateXlsxArchive,
}
