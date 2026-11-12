import apiClient from './client'

/**
 * Upload a CSV / TSV / Excel (.xlsx) file, request MoSPI sample, or submit raw CSV text.
 *
 * @param {File|null} file       - The file object to upload (CSV, TSV, or .xlsx), or null
 * @param {Object}    options    - {
 *   useSample?: boolean,          use the built-in MoSPI illustrative sample
 *   csvText?: string,             raw CSV string
 *   filename?: string,            optional label for csvText uploads
 *   sheetName?: string,           xlsx: select specific sheet by name
 *   sheetIndex?: number,          xlsx: select specific sheet by 1-based index
 * }
 */
export const uploadDatasetForAnalysis = (file = null, options = {}) => {
  if (file) {
    const formData = new FormData()
    formData.append('file', file)
    // Pass optional sheet selector for xlsx files
    if (options.sheetName) formData.append('sheetName', String(options.sheetName))
    if (options.sheetIndex != null) formData.append('sheetIndex', String(options.sheetIndex))
    return apiClient
      .post('/statistical-analysis/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  }

  return apiClient.post('/statistical-analysis/upload', options).then((r) => r.data)
}

/**
 * List sheet names from an uploaded .xlsx workbook without full analysis.
 * Returns { sheetNames: string[], defaultSheet: string }.
 *
 * @param {File} file  - .xlsx file
 */
export const listExcelSheets = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return apiClient
    .post('/statistical-analysis/sheets', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data)
}

/**
 * Run OLS simple linear regression between two numeric variables.
 * @param {Object} payload - { csvText: string, xCol: string, yCol: string }
 */
export const runRegressionAnalysis = (payload) =>
  apiClient.post('/statistical-analysis/regression', payload).then((r) => r.data)

/**
 * Run parametric hypothesis test.
 * @param {Object} payload - {
 *   csvText: string,
 *   testType: 'one_sample' | 'two_sample_columns',
 *   column: string,
 *   hypothesizedMean?: number,
 *   column2?: string,
 *   alternative?: 'two-sided' | 'less' | 'greater',
 *   alpha?: number,       significance level e.g. 0.05
 * }
 */
export const runHypothesisTest = (payload) =>
  apiClient.post('/statistical-analysis/hypothesis-test', payload).then((r) => r.data)

/**
 * Fetch the illustrative MoSPI sample survey dataset metadata.
 */
export const getSampleSurveyDataset = () =>
  apiClient.get('/statistical-analysis/sample').then((r) => r.data)
