import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertTriangle, Save, ArrowLeft, User, Briefcase, Phone, Shield } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { getMe, updateProfile } from '../../api/auth.api'
import styles from './MyProfilePage.module.css'

export default function EditProfilePage() {
  const { user: authUser, setAuth, accessToken } = useAuthStore()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    email: '',
    personalEmail: '',
    phone: '',
    employeeId: '',
    designation: '',
    department: '',
    gradeLevel: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    address: '',
    workLocation: '',
    reportingTo: '',
    areasOfWork: '',
    emergencyContactPerson: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    experienceYears: 0,
    qualifications: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    getMe()
      .then((data) => {
        if (!mounted) return
        const u = data.user || authUser || {}
        setForm({
          name: u.name || '',
          email: u.email || '',
          personalEmail: u.personalEmail || '',
          phone: u.phone || '+91 98765 43210',
          employeeId: u.employeeId || 'MOSPI23456',
          designation: u.designation || 'Statistical Officer',
          department: u.department || 'National Statistics Office (NSO)',
          gradeLevel: u.gradeLevel || 'Level 10',
          dateOfBirth: u.dateOfBirth || '15 March 1990',
          gender: u.gender || 'Male',
          nationality: u.nationality || 'Indian',
          address: u.address || 'C-123, Sector 15, Rohini, New Delhi - 110085, India',
          workLocation: u.workLocation || 'New Delhi, India',
          reportingTo: u.reportingTo || 'Deputy Director (Statistics)',
          areasOfWork: Array.isArray(u.areasOfWork) ? u.areasOfWork.join(', ') : 'Data Collection, Statistical Analysis, Survey Design, Data Quality Assurance, Report Preparation, Dissemination',
          emergencyContactPerson: u.emergencyContact?.contactPerson || 'Suresh Kumar (Father)',
          emergencyRelationship: u.emergencyContact?.relationship || 'Father',
          emergencyPhone: u.emergencyContact?.phone || '+91 98765 43211',
          experienceYears: u.experienceYears || 8,
          qualifications: Array.isArray(u.qualifications) ? u.qualifications.join(', ') : 'M.Sc. Statistics, B.Sc. Mathematics, NSSTA Advanced TPAC',
        })
      })
      .catch(() => {
        if (!mounted) return
        if (authUser) {
          setForm((f) => ({
            ...f,
            name: authUser.name || '',
            email: authUser.email || '',
            employeeId: authUser.employeeId || 'MOSPI23456',
            designation: authUser.designation || 'Statistical Officer',
            department: authUser.department || 'National Statistics Office (NSO)',
          }))
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [authUser])

  const setField = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        personalEmail: form.personalEmail.trim(),
        phone: form.phone.trim(),
        designation: form.designation.trim(),
        department: form.department.trim(),
        gradeLevel: form.gradeLevel.trim(),
        dateOfBirth: form.dateOfBirth.trim(),
        gender: form.gender.trim(),
        nationality: form.nationality.trim(),
        address: form.address.trim(),
        workLocation: form.workLocation.trim(),
        reportingTo: form.reportingTo.trim(),
        areasOfWork: form.areasOfWork.split(',').map((s) => s.trim()).filter(Boolean),
        emergencyContact: {
          contactPerson: form.emergencyContactPerson.trim(),
          relationship: form.emergencyRelationship.trim(),
          phone: form.emergencyPhone.trim(),
        },
        experienceYears: Number(form.experienceYears) || 0,
        qualifications: form.qualifications.split(',').map((s) => s.trim()).filter(Boolean),
      }
      const res = await updateProfile(payload)
      if (res?.user) {
        setAuth(res.user, accessToken)
      }
      navigate('/profile')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.breadcrumb}>
        <Link to="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
        <span>&gt;</span>
        <Link to="/profile" className={styles.breadcrumbLink}>My Profile</Link>
        <span>&gt;</span>
        <span className={styles.breadcrumbCurrent}>Edit</span>
      </div>

      <div className={styles.pageHeaderRow}>
        <div>
          <h1 className={styles.pageTitle}>Edit Official Profile</h1>
          <p className={styles.pageSubtitle}>
            Update your personal contact, administrative assignment, and emergency details
          </p>
        </div>

        <Link
          to="/profile"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: 10,
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#475569',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {/* Card 1: Personal Details */}
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardHeading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="#4f46e5" /> Personal Details
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Full Name *</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.name}
                onChange={setField('name')}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Date of Birth</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.dateOfBirth}
                onChange={setField('dateOfBirth')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Gender</label>
              <select
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}
                value={form.gender}
                onChange={setField('gender')}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Phone Number</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.phone}
                onChange={setField('phone')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Personal Email</label>
              <input
                type="email"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.personalEmail}
                onChange={setField('personalEmail')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Residential Address</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.address}
                onChange={setField('address')}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Current Assignment & Areas of Work */}
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardHeading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={18} color="#2563eb" /> Current Assignment &amp; Work
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Department</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.department}
                onChange={setField('department')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Official Designation</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.designation}
                onChange={setField('designation')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Grade / Level</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.gradeLevel}
                onChange={setField('gradeLevel')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Work Location</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.workLocation}
                onChange={setField('workLocation')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Reporting Officer</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.reportingTo}
                onChange={setField('reportingTo')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Years of Experience</label>
              <input
                type="number"
                min="0"
                max="50"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.experienceYears}
                onChange={setField('experienceYears')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Areas of Work (comma-separated)</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.areasOfWork}
                onChange={setField('areasOfWork')}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Emergency Contact */}
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardHeading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone size={18} color="#16a34a" /> Emergency Contact
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Contact Person</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.emergencyContactPerson}
                onChange={setField('emergencyContactPerson')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Relationship</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.emergencyRelationship}
                onChange={setField('emergencyRelationship')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Emergency Phone</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.emergencyPhone}
                onChange={setField('emergencyPhone')}
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14 }}>
          <Link
            to="/profile"
            style={{
              padding: '12px 24px',
              background: '#f1f5f9',
              color: '#475569',
              borderRadius: 10,
              fontSize: '0.9375rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 28px',
              background: '#4f46e5',
              color: '#ffffff',
              borderRadius: 10,
              fontSize: '0.9375rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
            }}
          >
            <Save size={16} /> {saving ? 'Saving Profile...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
