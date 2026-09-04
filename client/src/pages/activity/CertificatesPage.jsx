import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck2,
  Filter,
  GraduationCap,
  Landmark,
  Layers,
  MoreVertical,
  QrCode,
  Search,
  Share2,
  Shield,
  ShieldCheck,
  X,
  ExternalLink,
  Printer,
  Copy,
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import styles from './CertificatesPage.module.css'

function LinkedInIcon({ size = 15, color = '#0a66c2' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64a1.66 1.66 0 0 0-1.66 1.66c0 .92.74 1.66 1.66 1.66a1.66 1.66 0 0 0 1.66-1.66c0-.92-.74-1.66-1.66-1.66Z" />
    </svg>
  )
}

function TwitterIcon({ size = 15, color = '#1d9bf0' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.05c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" />
    </svg>
  )
}

const INITIAL_CERTIFICATES = [
  {
    id: 'cert-1',
    title: 'Data Analysis with Python',
    issuer: 'KaushalAI in collaboration with iGOT',
    type: 'Course Certificates',
    tags: ['Data Analysis', 'Python', 'Pandas', 'Intermediate'],
    issueDate: '18 May 2026',
    credentialId: 'KAI-IGOT-DA-2026-0187',
    status: 'Verified',
    colorTheme: '#3b82f6',
    hours: '24 hrs',
    grade: '94% (Grade A+)',
  },
  {
    id: 'cert-2',
    title: 'Official Statistics & Data Quality',
    issuer: 'KaushalAI in collaboration with NSSTA/TPAC',
    type: 'Training Certificates',
    tags: ['Official Statistics', 'Data Quality', 'Standards', 'Advanced'],
    issueDate: '10 May 2026',
    credentialId: 'KAI-NSSTA-OSDQ-2026-0143',
    status: 'Verified',
    colorTheme: '#2563eb',
    hours: '32 hrs',
    grade: '91% (Grade A+)',
  },
  {
    id: 'cert-3',
    title: 'Machine Learning Fundamentals',
    issuer: 'KaushalAI in collaboration with iGOT',
    type: 'Course Certificates',
    tags: ['Machine Learning', 'AI/ML', 'Python', 'Intermediate'],
    issueDate: '02 May 2026',
    credentialId: 'KAI-IGOT-MLF-2026-0112',
    status: 'Verified',
    colorTheme: '#10b981',
    hours: '20 hrs',
    grade: '88% (Grade A)',
  },
  {
    id: 'cert-4',
    title: 'Data Visualization with Power BI',
    issuer: 'KaushalAI in collaboration with iGOT',
    type: 'Course Certificates',
    tags: ['Data Visualization', 'Power BI', 'Dashboards', 'Intermediate'],
    issueDate: '25 Apr 2026',
    credentialId: 'KAI-IGOT-PBI-2026-0098',
    status: 'Verified',
    colorTheme: '#8b5cf6',
    hours: '18 hrs',
    grade: '95% (Grade A+)',
  },
  {
    id: 'cert-5',
    title: 'SQL for Data Analysis',
    issuer: 'KaushalAI in collaboration with iGOT',
    type: 'Course Certificates',
    tags: ['SQL', 'Database', 'Data Analysis', 'Intermediate'],
    issueDate: '18 Apr 2026',
    credentialId: 'KAI-IGOT-SQLDA-2026-0076',
    status: 'Verified',
    colorTheme: '#f97316',
    hours: '16 hrs',
    grade: '89% (Grade A)',
  },
  {
    id: 'cert-6',
    title: 'Time Series Analysis & Forecasting',
    issuer: 'KaushalAI in collaboration with NSSTA/TPAC',
    type: 'Training Certificates',
    tags: ['Time Series', 'Forecasting', 'ARIMA', 'Advanced'],
    issueDate: '10 Apr 2026',
    credentialId: 'KAI-NSSTA-TSAF-2026-0054',
    status: 'Verified',
    colorTheme: '#06b6d4',
    hours: '28 hrs',
    grade: '92% (Grade A+)',
  },
  {
    id: 'cert-7',
    title: 'Survey Sampling & Estimation Methods',
    issuer: 'KaushalAI in collaboration with MoSPI',
    type: 'Assessment Certificates',
    tags: ['Sampling', 'Surveys', 'NSSO', 'Advanced'],
    issueDate: '01 Apr 2026',
    credentialId: 'KAI-MOSPI-SSEM-2026-0042',
    status: 'Verified',
    colorTheme: '#e11d48',
    hours: '14 hrs',
    grade: '87% (Grade A)',
  },
  {
    id: 'cert-8',
    title: 'National Income Accounting & GDP Compilation',
    issuer: 'KaushalAI in collaboration with MoSPI',
    type: 'Specialization Certificates',
    tags: ['National Accounts', 'Macroeconomics', 'GDP', 'Expert'],
    issueDate: '22 Mar 2026',
    credentialId: 'KAI-MOSPI-NIAG-2026-0031',
    status: 'Verified',
    colorTheme: '#9333ea',
    hours: '40 hrs',
    grade: '96% (Grade O)',
  },
  {
    id: 'cert-9',
    title: 'Consumer Price Index (CPI) Calculation',
    issuer: 'KaushalAI in collaboration with iGOT',
    type: 'Course Certificates',
    tags: ['Inflation', 'CPI', 'Indices', 'Intermediate'],
    issueDate: '15 Mar 2026',
    credentialId: 'KAI-IGOT-CPI-2026-0025',
    status: 'Verified',
    colorTheme: '#2563eb',
    hours: '12 hrs',
    grade: '90% (Grade A+)',
  },
  {
    id: 'cert-10',
    title: 'Administrative Data Quality Assessment',
    issuer: 'KaushalAI in collaboration with NSSTA/TPAC',
    type: 'Course Certificates',
    tags: ['Data Governance', 'Audit', 'Public Policy', 'Intermediate'],
    issueDate: '02 Mar 2026',
    credentialId: 'KAI-NSSTA-ADQA-2026-0018',
    status: 'Verified',
    colorTheme: '#10b981',
    hours: '15 hrs',
    grade: '86% (Grade A)',
  },
  {
    id: 'cert-11',
    title: 'Statistical Disclosure Control & Anonymization',
    issuer: 'KaushalAI in collaboration with NSSTA/TPAC',
    type: 'Course Certificates',
    tags: ['Privacy', 'Microdata', 'Security', 'Advanced'],
    issueDate: '20 Feb 2026',
    credentialId: 'KAI-NSSTA-SDCA-2026-0012',
    status: 'Verified',
    colorTheme: '#8b5cf6',
    hours: '18 hrs',
    grade: '93% (Grade A+)',
  },
  {
    id: 'cert-12',
    title: 'R Programming for Official Statistics',
    issuer: 'KaushalAI in collaboration with iGOT',
    type: 'Course Certificates',
    tags: ['R', 'ggplot2', 'Statistical Models', 'Intermediate'],
    issueDate: '10 Feb 2026',
    credentialId: 'KAI-IGOT-RPOS-2026-0008',
    status: 'Verified',
    colorTheme: '#3b82f6',
    hours: '22 hrs',
    grade: '90% (Grade A+)',
  },
  {
    id: 'cert-13',
    title: 'Geospatial Mapping in Census Administration',
    issuer: 'KaushalAI in collaboration with iGOT',
    type: 'Course Certificates',
    tags: ['GIS', 'QGIS', 'Census', 'Spatial Analysis'],
    issueDate: '28 Jan 2026',
    credentialId: 'KAI-IGOT-GMCA-2026-0004',
    status: 'Verified',
    colorTheme: '#f97316',
    hours: '16 hrs',
    grade: '88% (Grade A)',
  },
  {
    id: 'cert-14',
    title: 'Data Governance Frameworks for Public Servants',
    issuer: 'KaushalAI in collaboration with iGOT',
    type: 'Course Certificates',
    tags: ['Governance', 'Policy', 'Compliance', 'Intermediate'],
    issueDate: '15 Jan 2026',
    credentialId: 'KAI-IGOT-DGFP-2026-0001',
    status: 'Verified',
    colorTheme: '#2563eb',
    hours: '14 hrs',
    grade: '92% (Grade A+)',
  },
  {
    id: 'cert-15',
    title: 'Advanced Excel for Survey Data Analysis',
    issuer: 'KaushalAI in collaboration with iGOT',
    type: 'Course Certificates',
    tags: ['Excel', 'PowerQuery', 'Data Cleaning'],
    issueDate: '05 Jan 2026',
    credentialId: 'KAI-IGOT-AEXL-2026-0002',
    status: 'Verified',
    colorTheme: '#10b981',
    hours: '16 hrs',
    grade: '95% (Grade A+)',
  },
  {
    id: 'cert-16',
    title: 'Big Data Pipeline Engineering',
    issuer: 'KaushalAI in collaboration with iGOT',
    type: 'Course Certificates',
    tags: ['Big Data', 'PySpark', 'Distributed Computing'],
    issueDate: 'Est. 15 Jun 2026',
    credentialId: 'KAI-IGOT-BDPE-2026-PEND',
    status: 'In Progress',
    colorTheme: '#f59e0b',
    hours: '24 hrs',
    grade: 'In Progress (82%)',
  },
  {
    id: 'cert-17',
    title: 'Natural Language Processing for Statistical Reports',
    issuer: 'KaushalAI in collaboration with NSSTA/TPAC',
    type: 'Course Certificates',
    tags: ['NLP', 'Transformers', 'Document Analysis'],
    issueDate: 'Est. 20 Jun 2026',
    credentialId: 'KAI-NSSTA-NLPS-2026-PEND',
    status: 'In Progress',
    colorTheme: '#f59e0b',
    hours: '20 hrs',
    grade: 'In Progress (70%)',
  },
  {
    id: 'cert-18',
    title: 'Advanced Multilevel Survey Weighting',
    issuer: 'KaushalAI in collaboration with MoSPI',
    type: 'Training Certificates',
    tags: ['Weights', 'Post-Stratification', 'Sampling'],
    issueDate: 'Est. 30 Jun 2026',
    credentialId: 'KAI-MOSPI-AMSW-2026-PEND',
    status: 'In Progress',
    colorTheme: '#f59e0b',
    hours: '25 hrs',
    grade: 'In Progress (45%)',
  },
]

export default function CertificatesPage() {
  const { user } = useAuthStore()
  const recipientName = user?.name || 'Amit Verma'

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [sortBy, setSortBy] = useState('Newest First')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  // Active Modals & Popovers
  const [viewingCert, setViewingCert] = useState(null)
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)
  const [verifyQuery, setVerifyQuery] = useState('')
  const [verifyResult, setVerifyResult] = useState(null)
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Filter & Sort
  const filteredCertificates = useMemo(() => {
    return INITIAL_CERTIFICATES.filter((cert) => {
      const matchesSearch =
        cert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.credentialId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
        cert.issuer.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'All Status' || cert.status === statusFilter

      const matchesType =
        typeFilter === 'All Types' || cert.type === typeFilter

      return matchesSearch && matchesStatus && matchesType
    }).sort((a, b) => {
      if (sortBy === 'Title A-Z') return a.title.localeCompare(b.title)
      const numA = parseInt(a.id.replace('cert-', ''), 10)
      const numB = parseInt(b.id.replace('cert-', ''), 10)
      if (sortBy === 'Oldest First') return numB - numA
      return numA - numB // Default: Newest First
    })
  }, [searchTerm, statusFilter, typeFilter, sortBy])

  // Pagination
  const totalPages = Math.ceil(filteredCertificates.length / (rowsPerPage === 'All' ? filteredCertificates.length || 1 : Number(rowsPerPage)))
  const paginatedCerts = useMemo(() => {
    if (rowsPerPage === 'All') return filteredCertificates
    const size = Number(rowsPerPage)
    const start = (currentPage - 1) * size
    return filteredCertificates.slice(start, start + size)
  }, [filteredCertificates, currentPage, rowsPerPage])

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handleVerifySearch = (idToVerify) => {
    const target = idToVerify || verifyQuery
    if (!target.trim()) return

    const matched = INITIAL_CERTIFICATES.find(
      (c) => c.credentialId.toLowerCase() === target.trim().toLowerCase()
    )

    if (matched) {
      setVerifyResult({
        found: true,
        cert: matched,
        verificationDate: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        cryptographicHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      })
    } else {
      setVerifyResult({
        found: false,
        searchedId: target,
      })
    }
  }

  const handleDownload = (cert) => {
    showToast(`Downloading Certificate "${cert.title}" (PDF)...`)
    setTimeout(() => {
      window.print()
    }, 500)
  }

  const handleCopyId = (cert) => {
    navigator.clipboard?.writeText(cert.credentialId)
    showToast(`Copied Credential ID: ${cert.credentialId}`)
    setOpenDropdownId(null)
  }

  const handleShareLinkedIn = (cert) => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      window.location.origin + '/certificates?verify=' + (cert?.credentialId || 'KAI-IGOT-DA-2026-0187')
    )}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleShareTwitter = (cert) => {
    const text = `I just earned my verified capacity certificate in "${cert?.title || 'Data Analysis with Python'}" on KaushalAI (MoSPI & NSSTA)! Credential: ${cert?.credentialId || 'KAI-IGOT-DA-2026-0187'}`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDownloadBadge = () => {
    showToast('Official Digital Skills Badge downloaded successfully!')
  }

  return (
    <div className={styles.pageContainer}>
      {/* Toast Notification */}
      {toastMessage && (
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
          <CheckCircle2 size={18} color="#10b981" />
          {toastMessage}
        </div>
      )}

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/dashboard" className={styles.breadcrumbLink}>
          Dashboard
        </Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span className={styles.breadcrumbCurrent}>Certificates</span>
      </div>

      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>My Certificates</h1>
          <p className={styles.pageSubtitle}>
            View, download and share your earned certificates.
          </p>
        </div>
        <button
          className={styles.verifyBtn}
          onClick={() => {
            setIsVerifyModalOpen(true)
            setVerifyResult(null)
            setVerifyQuery('')
          }}
        >
          <ShieldCheck size={18} />
          Verify Certificate
        </button>
      </div>

      {/* 4 Top KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.kpiIconPurple}`}>
            <Award size={26} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Total Certificates</span>
            <span className={styles.kpiValue}>18</span>
            <span className={styles.kpiSubtext}>All time</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.kpiIconGreen}`}>
            <CheckCircle2 size={26} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Completed Courses</span>
            <span className={styles.kpiValue}>14</span>
            <span className={styles.kpiSubtext}>With certificates</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.kpiIconOrange}`}>
            <Clock size={26} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>In Progress</span>
            <span className={styles.kpiValue}>3</span>
            <span className={styles.kpiSubtext}>Yet to be completed</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={`${styles.kpiIconBox} ${styles.kpiIconBlue}`}>
            <Shield size={26} />
          </div>
          <div className={styles.kpiInfo}>
            <span className={styles.kpiLabel}>Total Learning Hours</span>
            <span className={styles.kpiValue}>126h 30m</span>
            <span className={styles.kpiSubtext}>From certified courses</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className={styles.contentLayout}>
        {/* Left Column: Filter Bar & Certificate Cards List */}
        <div className={styles.leftColumn}>
          {/* Filter & Search Bar */}
          <div className={styles.filterBar}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search certificates..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className={styles.searchInput}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className={styles.filterSelect}
            >
              <option value="All Status">All Status</option>
              <option value="Verified">Verified</option>
              <option value="In Progress">In Progress</option>
              <option value="Expired">Expired</option>
              <option value="Revoked">Revoked</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setCurrentPage(1)
              }}
              className={styles.filterSelect}
            >
              <option value="All Types">All Types</option>
              <option value="Course Certificates">Course Certificates</option>
              <option value="Training Certificates">Training Certificates</option>
              <option value="Assessment Certificates">Assessment Certificates</option>
              <option value="Specialization Certificates">Specialization Certificates</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="Newest First">Newest First</option>
              <option value="Oldest First">Oldest First</option>
              <option value="Title A-Z">Title A-Z</option>
            </select>

            <button
              className={styles.filterBtn}
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('All Status')
                setTypeFilter('All Types')
                setSortBy('Newest First')
                setCurrentPage(1)
              }}
            >
              <Filter size={15} />
              Filters
            </button>
          </div>

          {/* Certificate Cards List */}
          <div className={styles.certList}>
            {paginatedCerts.map((cert) => (
              <div key={cert.id} className={styles.certCard}>
                {/* Miniature Certificate Preview Frame */}
                <div
                  className={styles.certThumb}
                  style={{ borderColor: cert.colorTheme + '40' }}
                >
                  <div
                    className={styles.certThumbBorder}
                    style={{ borderColor: cert.colorTheme + '60' }}
                  />
                  <div className={styles.certThumbInner}>
                    <div
                      className={styles.certThumbLogo}
                      style={{ color: cert.colorTheme }}
                    >
                      KaushalAI
                    </div>
                    <div className={styles.certThumbTitle}>{cert.title}</div>
                    <div
                      className={styles.certThumbBadge}
                      style={{ background: cert.colorTheme }}
                    >
                      ★
                    </div>
                  </div>
                </div>

                {/* Center Content */}
                <div className={styles.certDetails}>
                  <div className={styles.certHeaderRow}>
                    <div>
                      <h3 className={styles.certTitle}>{cert.title}</h3>
                      <p className={styles.certIssuer}>
                        Issued by {cert.issuer}
                      </p>
                    </div>
                    {cert.status === 'Verified' ? (
                      <span className={styles.verifiedBadge}>
                        <CheckCircle2 size={13} />
                        Verified
                      </span>
                    ) : (
                      <span className={styles.inProgressBadge}>
                        <Clock size={13} />
                        In Progress
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  <div className={styles.tagList}>
                    {cert.tags.map((tag, idx) => (
                      <span key={idx} className={styles.tagChip}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Meta Footer */}
                  <div className={styles.metaFooter}>
                    <span className={styles.metaItem}>
                      <Calendar size={13} />
                      Issued on: {cert.issueDate}
                    </span>
                    <span className={styles.metaItem}>
                      <Shield size={13} />
                      Credential ID:{' '}
                      <span className={styles.credId}>{cert.credentialId}</span>
                    </span>
                  </div>
                </div>

                {/* Right Action Cluster */}
                <div className={styles.certActions}>
                  <div className={styles.actionRow}>
                    <button
                      className={styles.downloadBtn}
                      onClick={() => handleDownload(cert)}
                    >
                      <Download size={14} />
                      Download
                    </button>
                    <button
                      className={styles.viewBtn}
                      onClick={() => setViewingCert(cert)}
                    >
                      View Certificate
                    </button>
                    <div style={{ position: 'relative' }}>
                      <button
                        className={styles.moreMenuBtn}
                        onClick={() =>
                          setOpenDropdownId(
                            openDropdownId === cert.id ? null : cert.id
                          )
                        }
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openDropdownId === cert.id && (
                        <div className={styles.dropdownPopover}>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => handleCopyId(cert)}
                          >
                            <Copy size={14} />
                            Copy Credential ID
                          </button>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => {
                              handleShareLinkedIn(cert)
                              setOpenDropdownId(null)
                            }}
                          >
                            <LinkedInIcon size={14} />
                            Share to LinkedIn
                          </button>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => {
                              handleShareTwitter(cert)
                              setOpenDropdownId(null)
                            }}
                          >
                            <TwitterIcon size={14} />
                            Share to Twitter
                          </button>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => {
                              setViewingCert(cert)
                              setOpenDropdownId(null)
                            }}
                          >
                            <Printer size={14} />
                            Print Official Copy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className={styles.paginationRow}>
            <div className={styles.paginationShowing}>
              Showing 1 to {Math.min(paginatedCerts.length, filteredCertificates.length)} of {filteredCertificates.length} certificates
            </div>

            <div className={styles.paginationControls}>
              <div className={styles.rowsPerPage}>
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(e.target.value)
                    setCurrentPage(1)
                  }}
                  className={styles.rowsSelect}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value="All">All</option>
                </select>
              </div>

              <div className={styles.pageNumbers}>
                <button
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    className={`${styles.pageBtn} ${currentPage === pg ? styles.pageBtnActive : ''}`}
                    onClick={() => handlePageChange(pg)}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Widgets */}
        <div className={styles.rightColumn}>
          {/* Card 1: Certificate Summary with Donut */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Certificate Summary</h3>
            <div className={styles.donutSection}>
              <div className={styles.donutWrapper}>
                <svg viewBox="0 0 36 36" className={styles.donutSvg}>
                  {/* Background track */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3.5"
                  />
                  {/* Verified arc (16/18 = 88.8%) */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3.8"
                    strokeDasharray="88.8, 100"
                  />
                  {/* In Progress arc (3/18 = 16.6%) */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.8"
                    strokeDasharray="16.6, 100"
                    strokeDashoffset="-88.8"
                  />
                </svg>
                <div className={styles.donutCenter}>
                  <span className={styles.donutCenterNum}>18</span>
                  <span className={styles.donutCenterLabel}>Total</span>
                </div>
              </div>

              <div className={styles.donutLegend}>
                <div className={styles.legendRow}>
                  <div className={styles.legendIndicator}>
                    <span
                      className={styles.legendDot}
                      style={{ background: '#6366f1' }}
                    />
                    Verified
                  </div>
                  <span className={styles.legendCount}>16</span>
                </div>

                <div className={styles.legendRow}>
                  <div className={styles.legendIndicator}>
                    <span
                      className={styles.legendDot}
                      style={{ background: '#10b981' }}
                    />
                    In Progress
                  </div>
                  <span className={styles.legendCount}>3</span>
                </div>

                <div className={styles.legendRow}>
                  <div className={styles.legendIndicator}>
                    <span
                      className={styles.legendDot}
                      style={{ background: '#f97316' }}
                    />
                    Expired
                  </div>
                  <span className={styles.legendCount}>0</span>
                </div>

                <div className={styles.legendRow}>
                  <div className={styles.legendIndicator}>
                    <span
                      className={styles.legendDot}
                      style={{ background: '#ef4444' }}
                    />
                    Revoked
                  </div>
                  <span className={styles.legendCount}>0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Certificate Types */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Certificate Types</h3>
            <div className={styles.typesList}>
              <div
                className={styles.typeRow}
                style={{ cursor: 'pointer' }}
                onClick={() => setTypeFilter('Course Certificates')}
              >
                <div className={styles.typeLabelWrap}>
                  <div
                    className={styles.typeIconBox}
                    style={{ background: '#eff6ff', color: '#3b82f6' }}
                  >
                    <GraduationCap size={15} />
                  </div>
                  Course Certificates
                </div>
                <span className={styles.typeCountBadge}>14</span>
              </div>

              <div
                className={styles.typeRow}
                style={{ cursor: 'pointer' }}
                onClick={() => setTypeFilter('Training Certificates')}
              >
                <div className={styles.typeLabelWrap}>
                  <div
                    className={styles.typeIconBox}
                    style={{ background: '#fff7ed', color: '#f97316' }}
                  >
                    <Landmark size={15} />
                  </div>
                  Training Certificates
                </div>
                <span className={styles.typeCountBadge}>2</span>
              </div>

              <div
                className={styles.typeRow}
                style={{ cursor: 'pointer' }}
                onClick={() => setTypeFilter('Assessment Certificates')}
              >
                <div className={styles.typeLabelWrap}>
                  <div
                    className={styles.typeIconBox}
                    style={{ background: '#fef2f2', color: '#ef4444' }}
                  >
                    <FileCheck2 size={15} />
                  </div>
                  Assessment Certificates
                </div>
                <span className={styles.typeCountBadge}>1</span>
              </div>

              <div
                className={styles.typeRow}
                style={{ cursor: 'pointer' }}
                onClick={() => setTypeFilter('Specialization Certificates')}
              >
                <div className={styles.typeLabelWrap}>
                  <div
                    className={styles.typeIconBox}
                    style={{ background: '#fdf4ff', color: '#c026d3' }}
                  >
                    <Award size={15} />
                  </div>
                  Specialization Certificates
                </div>
                <span className={styles.typeCountBadge}>1</span>
              </div>
            </div>
          </div>

          {/* Card 3: Share Your Achievement */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Share Your Achievement</h3>
            <p className={styles.shareSubtitle}>
              Showcase your certified skills on
            </p>
            <div className={styles.shareBtnRow}>
              <button
                className={styles.socialBtn}
                onClick={() => handleShareLinkedIn(paginatedCerts[0])}
              >
                <LinkedInIcon size={15} color="#0a66c2" />
                LinkedIn
              </button>
              <button
                className={styles.socialBtn}
                onClick={() => handleShareTwitter(paginatedCerts[0])}
              >
                <TwitterIcon size={15} color="#1d9bf0" />
                Twitter
              </button>
            </div>
            <button
              className={styles.downloadBadgeBtn}
              onClick={handleDownloadBadge}
            >
              <Award size={15} />
              Download Badge
            </button>
          </div>

          {/* Card 4: Need Help? */}
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Need Help?</h3>
            <p className={styles.shareSubtitle}>
              Learn how certificates work
            </p>
            <div className={styles.helpList}>
              <button
                type="button"
                className={styles.helpLink}
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: '6px 0' }}
                onClick={() => {
                  setIsVerifyModalOpen(true)
                }}
              >
                <span>How to verify a certificate</span>
                <ChevronRight size={14} />
              </button>
              <Link to="/ai-tutor" className={styles.helpLink}>
                <span>Certificate validity &amp; FAQs</span>
                <ChevronRight size={14} />
              </Link>
              <Link to="/ai-tutor" className={styles.helpLink}>
                <span>Download assistance</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: View Official Certificate Diploma */}
      {viewingCert && (
        <div
          className={styles.modalOverlay}
          onClick={() => setViewingCert(null)}
        >
          <div
            className={styles.modalBox}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Award size={22} color="#4f46e5" />
                <h2 className={styles.modalTitle}>Official Credential Certificate</h2>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setViewingCert(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Classical Certificate Diploma Frame */}
              <div className={styles.diplomaPaper}>
                <div className={styles.diplomaCornerTopLeft} />
                <div className={styles.diplomaCornerTopRight} />
                <div className={styles.diplomaCornerBottomLeft} />
                <div className={styles.diplomaCornerBottomRight} />

                <div className={styles.diplomaOrgHeader}>
                  Ministry of Statistics &amp; Programme Implementation • Government of India
                </div>
                <div className={styles.diplomaAcademy}>
                  National Statistical Systems Training Academy (NSSTA) &amp; KaushalAI
                </div>

                <div className={styles.diplomaTitle}>
                  CERTIFICATE OF COMPLETION
                </div>
                <p className={styles.diplomaSubtext}>
                  This is to officially certify that
                </p>

                <div className={styles.diplomaRecipient}>
                  {recipientName}
                </div>

                <p className={styles.diplomaSubtext}>
                  has successfully fulfilled all requirements and demonstrated competency in
                </p>

                <div className={styles.diplomaCourse}>
                  {viewingCert.title}
                </div>

                <p className={styles.diplomaDescription}>
                  Awarded for excellence in official statistical capacity building,
                  methodological precision, and continuous professional development on the KaushalAI platform.
                </p>

                <div className={styles.diplomaFooterGrid}>
                  <div className={styles.diplomaSignature}>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      Date of Issue
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                      {viewingCert.issueDate}
                    </div>
                    <div className={styles.signatureLine}>
                      Credential ID:
                    </div>
                    <div className={styles.signatureRole}>
                      {viewingCert.credentialId}
                    </div>
                  </div>

                  <div className={styles.diplomaSeal}>
                    <span>NSSTA</span>
                    <span>VERIFIED</span>
                    <span>★</span>
                  </div>

                  <div className={styles.diplomaSignature}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                      Dr. S. K. Mukherjee
                    </div>
                    <div className={styles.signatureLine}>
                      Director General, CSO
                    </div>
                    <div className={styles.signatureRole}>
                      Ministry of Statistics, Govt. of India
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.viewBtn}
                onClick={() => handleCopyId(viewingCert)}
              >
                <Copy size={14} style={{ marginRight: 6 }} />
                Copy ID
              </button>
              <button
                className={styles.downloadBtn}
                onClick={() => handleDownload(viewingCert)}
              >
                <Download size={14} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Verify Certificate */}
      {isVerifyModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsVerifyModalOpen(false)}
        >
          <div
            className={styles.modalBox}
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={22} color="#10b981" />
                <h2 className={styles.modalTitle}>Certificate Verification Portal</h2>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setIsVerifyModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ fontSize: 13.5, color: '#64748b', margin: '0 0 16px' }}>
                Verify the cryptographic authenticity of any certificate issued by KaushalAI,
                NSSTA, or iGOT by entering its unique Credential ID.
              </p>

              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="e.g. KAI-IGOT-DA-2026-0187"
                  value={verifyQuery}
                  onChange={(e) => setVerifyQuery(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontFamily: 'monospace',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifySearch()}
                />
                <button
                  className={styles.downloadBtn}
                  onClick={() => handleVerifySearch()}
                >
                  <Search size={14} />
                  Verify
                </button>
              </div>

              {/* Sample Quick Clicks */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>Try sample:</span>
                <button
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11.5,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                  onClick={() => {
                    setVerifyQuery('KAI-IGOT-DA-2026-0187')
                    handleVerifySearch('KAI-IGOT-DA-2026-0187')
                  }}
                >
                  KAI-IGOT-DA-2026-0187
                </button>
                <button
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11.5,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    color: '#475569',
                  }}
                  onClick={() => {
                    setVerifyQuery('KAI-NSSTA-OSDQ-2026-0143')
                    handleVerifySearch('KAI-NSSTA-OSDQ-2026-0143')
                  }}
                >
                  KAI-NSSTA-OSDQ-2026-0143
                </button>
              </div>

              {/* Verification Result Card */}
              {verifyResult && (
                <div>
                  {verifyResult.found ? (
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '1.5px solid #86efac',
                        borderRadius: 12,
                        padding: 18,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 12,
                        }}
                      >
                        <CheckCircle2 size={24} color="#16a34a" />
                        <div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: '#15803d',
                            }}
                          >
                            Certificate Authenticity Verified ✓
                          </div>
                          <div style={{ fontSize: 12, color: '#166534' }}>
                            Valid official credential in National Statistical Training Registry
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 12,
                          fontSize: 12.5,
                          background: '#ffffff',
                          padding: 14,
                          borderRadius: 8,
                          border: '1px solid #dcfce7',
                        }}
                      >
                        <div>
                          <span style={{ color: '#64748b' }}>Recipient:</span>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {recipientName}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Course / Programme:</span>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {verifyResult.cert.title}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Issuing Authority:</span>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {verifyResult.cert.issuer}
                          </div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Date of Issue:</span>
                          <div style={{ fontWeight: 600, color: '#1e293b' }}>
                            {verifyResult.cert.issueDate}
                          </div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ color: '#64748b' }}>Cryptographic Hash:</span>
                          <div
                            style={{
                              fontFamily: 'monospace',
                              fontSize: 11,
                              color: '#475569',
                              wordBreak: 'break-all',
                            }}
                          >
                            {verifyResult.cryptographicHash}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: '#fef2f2',
                        border: '1.5px solid #fca5a5',
                        borderRadius: 12,
                        padding: 18,
                        textAlign: 'center',
                      }}
                    >
                      <X size={24} color="#dc2626" style={{ margin: '0 auto 8px' }} />
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: '#b91c1c',
                        }}
                      >
                        Credential ID Not Found
                      </div>
                      <p style={{ fontSize: 12.5, color: '#7f1d1d', margin: '4px 0 0' }}>
                        No record matching "{verifyResult.searchedId}" was found in the official registry. Please check the spelling or format.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.viewBtn}
                onClick={() => setIsVerifyModalOpen(false)}
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
