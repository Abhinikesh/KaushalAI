import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  BookOpen,
  Layers,
  Bot,
  MoreVertical,
  ChevronRight,
  Lightbulb,
  FileText,
  FileSpreadsheet,
  X,
  Eye,
  Check,
  RotateCw,
  Trash2,
  Download,
  AlertCircle
} from 'lucide-react'
import styles from './UploadMaterialPage.module.css'

const INITIAL_UPLOADS = [
  {
    id: 'up-1',
    name: 'Data Analysis with Python - Notes.pdf',
    ext: 'PDF',
    size: '2.4 MB',
    pages: '24 pages',
    badgeType: 'fileBadgePdf',
    status: 'Processed',
    processedAt: '19 May 2026, 10:30 AM',
    topics: ['Pandas DataFrames', 'NumPy Arrays', 'Handling Missing Data', 'Groupby Aggregations'],
    concepts: 14,
    tables: 8,
    definitions: 12,
    quizzes: 2,
  },
  {
    id: 'up-2',
    name: 'Official Statistics Concepts.docx',
    ext: 'W',
    size: '1.8 MB',
    pages: '32 pages',
    badgeType: 'fileBadgeDocx',
    status: 'Processed',
    processedAt: '18 May 2026, 04:15 PM',
    topics: ['NSSO Sampling Design', 'National Accounts (SNA 2008)', 'CPI Basket Weights', 'IIP Indexing'],
    concepts: 18,
    tables: 11,
    definitions: 15,
    quizzes: 2,
  },
  {
    id: 'up-3',
    name: 'Sampling Techniques in Surveys.pptx',
    ext: 'P',
    size: '3.2 MB',
    pages: '45 slides',
    badgeType: 'fileBadgePptx',
    status: 'Processing',
    progress: 65,
    topics: ['Multi-Stage Stratified Sampling', 'Cluster Design Effects', 'Sampling Weight Calibration'],
    concepts: 10,
    tables: 4,
    definitions: 9,
    quizzes: 1,
  },
  {
    id: 'up-4',
    name: 'SDG Indicators Data Checklist.xlsx',
    ext: 'X',
    size: '0.9 MB',
    pages: '4 sheets',
    badgeType: 'fileBadgeXlsx',
    status: 'Pending',
    processedAt: 'Queued for processing',
    topics: ['SDG Indicator 8.1.1', 'Decent Work & Growth', 'Administrative Data Quality Verification'],
    concepts: 0,
    tables: 0,
    definitions: 0,
    quizzes: 0,
  },
]

const SAMPLE_FLASHCARDS = [
  {
    question: 'What is the primary role of the Design Effect (DEFF) in complex sample surveys?',
    answer: 'DEFF represents the ratio of the variance of an estimator under complex survey design (e.g. cluster sampling) to the variance under simple random sampling (SRS) of the same sample size.',
  },
  {
    question: 'How are missing values handled in official statistical datasets using Pandas?',
    answer: 'Common approaches include df.dropna() for listwise deletion, df.fillna() for mean/median/mode imputation, or iterative multivariate imputation (MICE) for survey microdata.',
  },
  {
    question: 'Which formula is used for calculating the Consumer Price Index (CPI)?',
    answer: 'The modified Laspeyres formula: CPI = [ ∑ (P_t / P_0) * W_0 ] / ∑ W_0 * 100, weighting prices by base period consumption shares.',
  },
]

export default function UploadMaterialPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  // State
  const [uploads, setUploads] = useState(INITIAL_UPLOADS)
  const [isDragging, setIsDragging] = useState(false)
  const [activeModal, setActiveModal] = useState(null) // 'insights' | 'progress' | 'summary' | 'flashcards' | 'allInsights'
  const [selectedUpload, setSelectedUpload] = useState(INITIAL_UPLOADS[0])
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [flashcardIdx, setFlashcardIdx] = useState(0)
  const [isCardFlipped, setIsCardFlipped] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [showAllUploads, setShowAllUploads] = useState(false)

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  // Handle Drag & Drop / File Selection
  const handleFileSelect = (files) => {
    if (!files || files.length === 0) return
    const file = files[0]
    const ext = file.name.split('.').pop().toUpperCase()
    let badgeType = 'fileBadgePdf'
    let shortExt = 'PDF'
    if (ext === 'DOCX' || ext === 'DOC') {
      badgeType = 'fileBadgeDocx'
      shortExt = 'W'
    } else if (ext === 'PPTX' || ext === 'PPT') {
      badgeType = 'fileBadgePptx'
      shortExt = 'P'
    } else if (ext === 'XLSX' || ext === 'XLS' || ext === 'CSV') {
      badgeType = 'fileBadgeXlsx'
      shortExt = 'X'
    }

    const newUpload = {
      id: 'up-' + Date.now(),
      name: file.name,
      ext: shortExt,
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      pages: 'Analyzing...',
      badgeType,
      status: 'Processing',
      progress: 35,
      processedAt: 'Processing now...',
      topics: ['Statistical Methodology', 'Data Quality Framework'],
      concepts: 8,
      tables: 3,
      definitions: 5,
      quizzes: 1,
    }

    setUploads((prev) => [newUpload, ...prev])
    showToast(`Uploaded "${file.name}"! KaushalAI is extracting insights...`)

    // Simulate real-time pipeline completion
    setTimeout(() => {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === newUpload.id
            ? { ...u, progress: 85 }
            : u
        )
      )
    }, 1200)

    setTimeout(() => {
      setUploads((prev) =>
        prev.map((u) =>
          u.id === newUpload.id
            ? {
                ...u,
                status: 'Processed',
                progress: 100,
                processedAt: `Processed on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
              }
            : u
        )
      )
      showToast(`AI extraction completed for "${file.name}"!`)
    }, 2500)
  }

  const handleDeleteUpload = (id) => {
    setUploads((prev) => prev.filter((u) => u.id !== id))
    setOpenDropdownId(null)
    showToast('Document removed from library.')
  }

  return (
    <div className={styles.pageContainer}>
      {/* Toast Alert */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#1e293b',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 10,
            fontSize: 13.5,
            fontWeight: 500,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Sparkles size={18} color="#a855f7" />
          {toastMsg}
        </div>
      )}

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/dashboard" className={styles.breadcrumbLink}>
          Dashboard
        </Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span className={styles.breadcrumbCurrent}>Upload Material</span>
      </div>

      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <div className={styles.titleArea}>
            <h1 className={styles.pageTitle}>Upload Learning Material</h1>
            <span className={styles.aiBadge}>
              <Sparkles size={13} />
              AI Powered
            </span>
          </div>
          <p className={styles.pageSubtitle}>
            Upload your learning material and let KaushalAI process it to help you learn better, generate quizzes and get AI insights.
          </p>
        </div>
        <Link to="/trainer/mcq-generator" className={styles.goToMcqBtn}>
          <Zap size={16} />
          Go to AI MCQ Generator
        </Link>
      </div>

      {/* Top Split Section: Dropzone & Tips */}
      <div className={styles.topGrid}>
        {/* Dropzone Card */}
        <div
          className={[
            styles.dropzoneCard,
            isDragging ? styles.dropzoneDragging : '',
          ].join(' ')}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            handleFileSelect(e.dataTransfer.files)
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.pptx,.txt,.xlsx,.csv,.epub"
            hidden
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          <div className={styles.cloudIconBox}>
            <UploadCloud size={28} />
          </div>

          <h3 className={styles.dropzoneMainText}>
            Drag &amp; drop your files here
          </h3>
          <span className={styles.dropzoneOr}>or</span>

          <button
            type="button"
            className={styles.browseFilesBtn}
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
          >
            Browse Files
          </button>

          <p className={styles.supportedFormats}>
            Supported formats: PDF, DOCX, PPTX, TXT, XLSX, CSV, EPUB
          </p>
          <p className={styles.maxSize}>Max file size: 50MB</p>
        </div>

        {/* Tips for Best Results */}
        <div className={styles.tipsCard}>
          <div className={styles.tipsHeader}>
            <Lightbulb size={18} color="#f59e0b" />
            Tips for Best Results
          </div>
          <div className={styles.tipsList}>
            <div className={styles.tipItem}>
              <CheckCircle2 size={16} className={styles.tipCheckIcon} />
              <span>Upload clear and well-structured documents</span>
            </div>
            <div className={styles.tipItem}>
              <CheckCircle2 size={16} className={styles.tipCheckIcon} />
              <span>Ensure the content is relevant to your learning goals</span>
            </div>
            <div className={styles.tipItem}>
              <CheckCircle2 size={16} className={styles.tipCheckIcon} />
              <span>AI works best with text-rich materials</span>
            </div>
            <div className={styles.tipItem}>
              <CheckCircle2 size={16} className={styles.tipCheckIcon} />
              <span>You can upload multiple files together</span>
            </div>
            <div className={styles.tipItem}>
              <CheckCircle2 size={16} className={styles.tipCheckIcon} />
              <span>After upload, you can generate quizzes and summaries</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Split Section: Recent Uploads & Right Widgets */}
      <div className={styles.bottomGrid}>
        {/* Left: Recent Uploads (4) */}
        <div className={styles.recentCard}>
          <h2 className={styles.recentTitle}>
            Recent Uploads ({uploads.length})
          </h2>

          <div className={styles.uploadList}>
            {uploads.map((upload) => (
              <div key={upload.id} className={styles.uploadItem}>
                {/* File Badge */}
                <div
                  className={[
                    styles.fileBadge,
                    styles[upload.badgeType] || styles.fileBadgePdf,
                  ].join(' ')}
                >
                  {upload.ext}
                </div>

                {/* File Details */}
                <div className={styles.fileInfo}>
                  <div className={styles.fileTitleRow}>
                    <h4 className={styles.fileName}>{upload.name}</h4>
                    {upload.status === 'Processed' && (
                      <span className={styles.statusBadgeProcessed}>
                        <CheckCircle2 size={12} />
                        Processed
                      </span>
                    )}
                    {upload.status === 'Processing' && (
                      <span className={styles.statusBadgeProcessing}>
                        <RotateCw size={12} className="spin" />
                        Processing
                      </span>
                    )}
                    {upload.status === 'Pending' && (
                      <span className={styles.statusBadgePending}>
                        <Clock size={12} />
                        Pending
                      </span>
                    )}
                  </div>

                  <p className={styles.fileMeta}>
                    {upload.ext === 'W'
                      ? 'DOCX'
                      : upload.ext === 'P'
                      ? 'PPTX'
                      : upload.ext === 'X'
                      ? 'XLSX'
                      : 'PDF'}{' '}
                    • {upload.size} {upload.pages ? `• ${upload.pages}` : ''}
                  </p>

                  {/* If Processing, show progress bar */}
                  {upload.status === 'Processing' && (
                    <div className={styles.progressBarContainer}>
                      <div className={styles.progressBarTrack}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${upload.progress || 65}%` }}
                        />
                      </div>
                      <span className={styles.progressBarText}>
                        {upload.progress || 65}%
                      </span>
                    </div>
                  )}

                  {/* Subtext info */}
                  {upload.status !== 'Processing' && (
                    <span className={styles.processedSubtext}>
                      {upload.processedAt}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className={styles.uploadItemActions}>
                  {upload.status === 'Processed' && (
                    <button
                      className={styles.viewInsightsBtn}
                      onClick={() => {
                        setSelectedUpload(upload)
                        setActiveModal('insights')
                      }}
                    >
                      View Insights
                    </button>
                  )}
                  {upload.status === 'Processing' && (
                    <button
                      className={styles.viewInsightsBtn}
                      onClick={() => {
                        setSelectedUpload(upload)
                        setActiveModal('progress')
                      }}
                    >
                      View Progress
                    </button>
                  )}
                  {upload.status === 'Pending' && (
                    <button
                      className={styles.viewInsightsBtn}
                      onClick={() => {
                        setSelectedUpload(upload)
                        setActiveModal('progress')
                      }}
                    >
                      View Details
                    </button>
                  )}

                  <div style={{ position: 'relative' }}>
                    <button
                      className={styles.moreMenuBtn}
                      onClick={() =>
                        setOpenDropdownId(
                          openDropdownId === upload.id ? null : upload.id
                        )
                      }
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openDropdownId === upload.id && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 30,
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                          zIndex: 20,
                          width: 170,
                          padding: '6px 0',
                        }}
                      >
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 14px',
                            fontSize: 13,
                            color: '#334155',
                            border: 'none',
                            background: 'none',
                            width: '100%',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            showToast(`Downloading original file "${upload.name}"...`)
                            setOpenDropdownId(null)
                          }}
                        >
                          <Download size={14} />
                          Download File
                        </button>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 14px',
                            fontSize: 13,
                            color: '#334155',
                            border: 'none',
                            background: 'none',
                            width: '100%',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            navigate('/trainer/mcq-generator')
                            setOpenDropdownId(null)
                          }}
                        >
                          <Zap size={14} />
                          Generate MCQs
                        </button>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 14px',
                            fontSize: 13,
                            color: '#ef4444',
                            border: 'none',
                            background: 'none',
                            width: '100%',
                            textAlign: 'left',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleDeleteUpload(upload.id)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            className={styles.viewAllUploadsLink}
            style={{ border: 'none', background: 'none', width: '100%' }}
            onClick={() => {
              showToast('Displaying full repository of uploaded learning documents.')
            }}
          >
            View All Uploads →
          </button>
        </div>

        {/* Right Widgets */}
        <div className={styles.rightWidgets}>
          {/* Card 1: Material Insights (AI Extracted) */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>
              <Layers size={17} color="#4f46e5" />
              Material Insights (AI Extracted)
            </h3>

            <div className={styles.insightsList}>
              <div className={styles.insightRow}>
                <div className={styles.insightLabelGroup}>
                  <BookOpen size={14} color="#6366f1" />
                  Key Topics
                </div>
                <span className={styles.insightCount}>18</span>
              </div>

              <div className={styles.insightRow}>
                <div className={styles.insightLabelGroup}>
                  <Sparkles size={14} color="#a855f7" />
                  Important Concepts
                </div>
                <span className={styles.insightCount}>42</span>
              </div>

              <div className={styles.insightRow}>
                <div className={styles.insightLabelGroup}>
                  <FileSpreadsheet size={14} color="#10b981" />
                  Figures &amp; Tables
                </div>
                <span className={styles.insightCount}>23</span>
              </div>

              <div className={styles.insightRow}>
                <div className={styles.insightLabelGroup}>
                  <FileText size={14} color="#f97316" />
                  Definitions
                </div>
                <span className={styles.insightCount}>36</span>
              </div>

              <div className={styles.insightRow}>
                <div className={styles.insightLabelGroup}>
                  <Zap size={14} color="#3b82f6" />
                  Recommended Quizzes
                </div>
                <span className={styles.insightCount}>5</span>
              </div>
            </div>

            <button
              className={styles.viewAllInsightsLink}
              style={{ border: 'none', background: 'none' }}
              onClick={() => setActiveModal('allInsights')}
            >
              View All Insights →
            </button>
          </div>

          {/* Card 2: What's Next? */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>
              <Sparkles size={17} color="#6366f1" />
              What's Next?
            </h3>

            <div className={styles.nextList}>
              <Link to="/trainer/mcq-generator" className={styles.nextItem}>
                <div
                  className={styles.nextIconBox}
                  style={{ background: '#eff6ff', color: '#3b82f6' }}
                >
                  <Zap size={16} />
                </div>
                <div className={styles.nextInfo}>
                  <h4 className={styles.nextTitle}>Generate MCQs from this material</h4>
                  <p className={styles.nextSubtitle}>Create quizzes using AI</p>
                </div>
                <ChevronRight size={16} className={styles.nextArrow} />
              </Link>

              <div
                className={styles.nextItem}
                onClick={() => setActiveModal('summary')}
              >
                <div
                  className={styles.nextIconBox}
                  style={{ background: '#eef2ff', color: '#6366f1' }}
                >
                  <FileText size={16} />
                </div>
                <div className={styles.nextInfo}>
                  <h4 className={styles.nextTitle}>Get AI Summary</h4>
                  <p className={styles.nextSubtitle}>Summarize key points</p>
                </div>
                <ChevronRight size={16} className={styles.nextArrow} />
              </div>

              <div
                className={styles.nextItem}
                onClick={() => {
                  setFlashcardIdx(0)
                  setIsCardFlipped(false)
                  setActiveModal('flashcards')
                }}
              >
                <div
                  className={styles.nextIconBox}
                  style={{ background: '#fdf4ff', color: '#c026d3' }}
                >
                  <Layers size={16} />
                </div>
                <div className={styles.nextInfo}>
                  <h4 className={styles.nextTitle}>Generate Flashcards</h4>
                  <p className={styles.nextSubtitle}>Create study flashcards</p>
                </div>
                <ChevronRight size={16} className={styles.nextArrow} />
              </div>

              <Link to="/ai-tutor" className={styles.nextItem}>
                <div
                  className={styles.nextIconBox}
                  style={{ background: '#ecfdf5', color: '#10b981' }}
                >
                  <Bot size={16} />
                </div>
                <div className={styles.nextInfo}>
                  <h4 className={styles.nextTitle}>Ask AI Tutor</h4>
                  <p className={styles.nextSubtitle}>Ask questions about the content</p>
                </div>
                <ChevronRight size={16} className={styles.nextArrow} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Full-Width Banner */}
      <div className={styles.bottomBanner}>
        <div className={styles.bannerContent}>
          <div className={styles.bannerIconBox}>
            <Sparkles size={22} />
          </div>
          <div>
            <h3 className={styles.bannerTitle}>
              Turn your material into smart learning assets!
            </h3>
            <p className={styles.bannerSubtext}>
              Upload, analyze, generate quizzes, and learn more effectively with KaushalAI.
            </p>
          </div>
        </div>
        <Link to="/trainer/mcq-generator" className={styles.bannerActionBtn}>
          <Sparkles size={16} />
          Generate MCQs Now
        </Link>
      </div>

      {/* Modal: View Insights */}
      {activeModal === 'insights' && selectedUpload && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActiveModal(null)}
        >
          <div
            className={styles.modalBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={20} color="#4f46e5" />
                <h2 className={styles.modalTitle}>
                  AI Document Insights: {selectedUpload.name}
                </h2>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Extracted Concepts</span>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{selectedUpload.concepts}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Tables &amp; Figures</span>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{selectedUpload.tables}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Key Definitions</span>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{selectedUpload.definitions}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Quizzes Ready</span>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{selectedUpload.quizzes}</div>
                </div>
              </div>

              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
                Core Extracted Knowledge Units
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {selectedUpload.topics.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#f8faff',
                      border: '1px solid #e0e7ff',
                      borderRadius: 8,
                      padding: '10px 14px',
                      fontSize: 13,
                      color: '#334155',
                    }}
                  >
                    <CheckCircle2 size={16} color="#4f46e5" />
                    <span style={{ fontWeight: 600 }}>{t}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 13,
                  color: '#166534',
                }}
              >
                <strong>AI Recommendation:</strong> This document contains high-density official statistical procedures. It is primed for automatic generation of 10–20 MCQ items with psychometric calibrations.
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.viewInsightsBtn}
                onClick={() => setActiveModal(null)}
              >
                Close
              </button>
              <button
                className={styles.bannerActionBtn}
                onClick={() => {
                  setActiveModal(null)
                  navigate('/trainer/mcq-generator')
                }}
              >
                <Zap size={14} />
                Generate MCQs from Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Live Progress */}
      {activeModal === 'progress' && selectedUpload && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActiveModal(null)}
        >
          <div
            className={styles.modalBox}
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <RotateCw size={18} className="spin" color="#3b82f6" />
                <h2 className={styles.modalTitle}>Processing Status</h2>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                  {selectedUpload.name}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Size: {selectedUpload.size} • Priority Pipeline
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#16a34a' }}>
                  <CheckCircle2 size={18} />
                  <span>1. Document Structure &amp; OCR Ingestion (Completed)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#16a34a' }}>
                  <CheckCircle2 size={18} />
                  <span>2. Semantic Chunking &amp; Tokenization (Completed)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#2563eb', fontWeight: 600 }}>
                  <RotateCw size={18} className="spin" />
                  <span>3. Vector Embeddings &amp; Concept Extraction (In Progress - 65%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                  <Clock size={18} />
                  <span>4. Question Blueprint Synthesis (Queued)</span>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.viewInsightsBtn}
                onClick={() => setActiveModal(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: AI Summary */}
      {activeModal === 'summary' && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActiveModal(null)}
        >
          <div
            className={styles.modalBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={20} color="#4f46e5" />
                <h2 className={styles.modalTitle}>AI Executive Summary</h2>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: '#334155' }}>
                <p>
                  <strong>Summary of Uploaded Materials:</strong> The official statistical documentation focuses on survey stratification, data cleaning in Python Pandas, and National Accounts compilation. Key methodologies adhere to MoSPI and NSSTA quality benchmarks.
                </p>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '16px 0 8px' }}>
                  Key Takeaways:
                </h4>
                <ul style={{ paddingLeft: 20, margin: 0 }}>
                  <li>Two-stage cluster sampling improves field efficiency while requiring design effect adjustments.</li>
                  <li>CPI calculations use Laspeyres formulas with base-year item weights calibrated every 5 years.</li>
                  <li>Pandas <code>groupby()</code> and <code>agg()</code> enable fast microdata aggregations across district survey codes.</li>
                </ul>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.viewInsightsBtn}
                onClick={() => setActiveModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Flashcards */}
      {activeModal === 'flashcards' && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActiveModal(null)}
        >
          <div
            className={styles.modalBox}
            style={{ maxWidth: 600 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Layers size={20} color="#c026d3" />
                <h2 className={styles.modalTitle}>
                  Interactive Study Flashcards ({flashcardIdx + 1} of {SAMPLE_FLASHCARDS.length})
                </h2>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div
                onClick={() => setIsCardFlipped(!isCardFlipped)}
                style={{
                  background: isCardFlipped ? '#f0fdf4' : '#faf5ff',
                  border: isCardFlipped ? '2px solid #86efac' : '2px solid #e9d5ff',
                  borderRadius: 16,
                  padding: 36,
                  minHeight: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: isCardFlipped ? '#16a34a' : '#9333ea',
                    marginBottom: 12,
                  }}
                >
                  {isCardFlipped ? 'Answer (Click to flip back)' : 'Question (Click to reveal answer)'}
                </span>

                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#0f172a',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {isCardFlipped
                    ? SAMPLE_FLASHCARDS[flashcardIdx].answer
                    : SAMPLE_FLASHCARDS[flashcardIdx].question}
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 20,
                }}
              >
                <button
                  className={styles.viewInsightsBtn}
                  disabled={flashcardIdx === 0}
                  onClick={() => {
                    setFlashcardIdx((prev) => Math.max(0, prev - 1))
                    setIsCardFlipped(false)
                  }}
                >
                  ‹ Previous
                </button>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  Card {flashcardIdx + 1} of {SAMPLE_FLASHCARDS.length}
                </span>
                <button
                  className={styles.viewInsightsBtn}
                  disabled={flashcardIdx === SAMPLE_FLASHCARDS.length - 1}
                  onClick={() => {
                    setFlashcardIdx((prev) => Math.min(SAMPLE_FLASHCARDS.length - 1, prev + 1))
                    setIsCardFlipped(false)
                  }}
                >
                  Next ›
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: All Material Insights Breakdown */}
      {activeModal === 'allInsights' && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActiveModal(null)}
        >
          <div
            className={styles.modalBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Layers size={20} color="#4f46e5" />
                <h2 className={styles.modalTitle}>Extracted Knowledge Matrix</h2>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setActiveModal(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#4338ca' }}>
                    Top Competency Clusters
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
                    <li>Official Statistics Principles (UN-FPOS)</li>
                    <li>Python Data Cleaning (Pandas, NumPy)</li>
                    <li>Survey Sampling &amp; Weighting (NSSO)</li>
                    <li>Macroeconomic Aggregates (CSO)</li>
                  </ul>
                </div>

                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#059669' }}>
                    Extracted Tables &amp; Formulas
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
                    <li>Laspeyres Consumer Price Index Table</li>
                    <li>Two-Stage Cluster Sampling Variance Matrix</li>
                    <li>Gross Value Added (GVA) Sectoral Weights</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.viewInsightsBtn}
                onClick={() => setActiveModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
