import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertTriangle, Save, ArrowLeft, User, Briefcase, Phone, Shield, GraduationCap, Info } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { getMe, updateProfile } from '../../api/auth.api'
import { getOnboardingOptions } from '../../api/onboarding.api'
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
    department_id: '',
    role_id: '',
    functional_area_id: '',
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
    education_level: "Bachelor's Degree",
    field_of_study: '',
    certifications: [],
    current_responsibilities: [],
    certInput: '',
  })

  const [options, setOptions] = useState({
    departments: [],
    roles: [],
    functionalAreas: [],
    educationLevels: [
      '10th Standard / Matriculation',
      '12th Standard / Higher Secondary',
      'Diploma',
      "Bachelor's Degree",
      "Master's Degree",
      'Professional Qualification (CA, CS, ICWA)',
      'Doctorate / Ph.D.',
      'Other',
    ],
    commonCertifications: [],
    responsibilitiesOptions: [],
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    Promise.all([
      getMe().catch(() => ({ user: authUser })),
      getOnboardingOptions().catch(() => null),
    ])
      .then(([userData, optionsData]) => {
        if (!mounted) return
        if (optionsData) {
          setOptions({
            departments: optionsData.departments || [],
            roles: optionsData.roles || [],
            functionalAreas: optionsData.functionalAreas || [],
            educationLevels: optionsData.educationLevels || [
              '10th Standard / Matriculation',
              '12th Standard / Higher Secondary',
              'Diploma',
              "Bachelor's Degree",
              "Master's Degree",
              'Professional Qualification (CA, CS, ICWA)',
              'Doctorate / Ph.D.',
              'Other',
            ],
            commonCertifications: optionsData.commonCertifications || [],
            responsibilitiesOptions: optionsData.responsibilitiesOptions || [],
          })
        }

        const u = userData?.user || authUser || {}
        setForm({
          name: u.name || '',
          email: u.email || '',
          personalEmail: u.personalEmail || '',
          phone: u.phone || '+91 98765 43210',
          employeeId: u.employeeId || 'MOSPI23456',
          designation: u.designation || 'Statistical Officer',
          department: u.department || 'National Statistics Office (NSO)',
          department_id: u.department_id?._id || u.department_id || '',
          role_id: u.role_id?._id || u.role_id || '',
          functional_area_id: u.functional_area_id?._id || u.functional_area_id || '',
          gradeLevel: u.gradeLevel || 'Level 10',
          dateOfBirth: u.dateOfBirth || '15 March 1990',
          gender: u.gender || 'Male',
          nationality: u.nationality || 'Indian',
          address: u.address || 'C-123, Sector 15, Rohini, New Delhi - 110085, India',
          workLocation: u.workLocation || 'New Delhi, India',
          reportingTo: u.reportingTo || 'Deputy Director (Statistics)',
          areasOfWork: Array.isArray(u.areasOfWork) ? u.areasOfWork.join(', ') : '',
          emergencyContactPerson: u.emergencyContact?.contactPerson || 'Suresh Kumar (Father)',
          emergencyRelationship: u.emergencyContact?.relationship || 'Father',
          emergencyPhone: u.emergencyContact?.phone || '+91 98765 43211',
          experienceYears: u.experience_years ?? u.experienceYears ?? 5,
          education_level: u.education_level || "Master's Degree",
          field_of_study: u.field_of_study || 'Statistics',
          certifications: Array.isArray(u.certifications) ? u.certifications : ['NSSTA Advanced Survey Sampling'],
          current_responsibilities: Array.isArray(u.current_responsibilities)
            ? u.current_responsibilities
            : (Array.isArray(u.areasOfWork) ? u.areasOfWork : ['Data reporting', 'Survey design']),
          certInput: '',
        })
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [authUser])

  const setField = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))

  const handleRoleChange = (e) => {
    const rId = e.target.value
    const matched = options.roles.find((r) => r._id === rId)
    setForm((prev) => ({
      ...prev,
      role_id: rId,
      designation: matched ? matched.name : prev.designation,
      gradeLevel: matched ? `Level ${matched.level}` : prev.gradeLevel,
    }))
  }

  const handleDeptChange = (e) => {
    const dVal = e.target.value
    const matched = options.departments.find((d) => d._id === dVal || d.name === dVal)
    setForm((prev) => ({
      ...prev,
      department: matched ? matched.name : dVal,
      department_id: matched ? matched._id : dVal,
    }))
  }

  const toggleResponsibility = (item) => {
    setForm((prev) => {
      const exists = prev.current_responsibilities.includes(item)
      const next = exists
        ? prev.current_responsibilities.filter((r) => r !== item)
        : [...prev.current_responsibilities, item]
      return { ...prev, current_responsibilities: next }
    })
  }

  const addCert = () => {
    if (!form.certInput.trim()) return
    if (!form.certifications.includes(form.certInput.trim())) {
      setForm((prev) => ({
        ...prev,
        certifications: [...prev.certifications, prev.certInput.trim()],
        certInput: '',
      }))
    } else {
      setForm((prev) => ({ ...prev, certInput: '' }))
    }
  }

  const removeCert = (cert) => {
    setForm((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c !== cert),
    }))
  }

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
        role_id: form.role_id || undefined,
        functional_area_id: form.functional_area_id || undefined,
        gradeLevel: form.gradeLevel.trim(),
        dateOfBirth: form.dateOfBirth.trim(),
        gender: form.gender.trim(),
        nationality: form.nationality.trim(),
        address: form.address.trim(),
        workLocation: form.workLocation.trim(),
        reportingTo: form.reportingTo.trim(),
        experienceYears: Number(form.experienceYears) || 0,
        experience_years: Number(form.experienceYears) || 0,
        education_level: form.education_level,
        field_of_study: form.field_of_study.trim(),
        certifications: form.certifications,
        current_responsibilities: form.current_responsibilities,
        areasOfWork: form.current_responsibilities,
        emergencyContact: {
          contactPerson: form.emergencyContactPerson.trim(),
          relationship: form.emergencyRelationship.trim(),
          phone: form.emergencyPhone.trim(),
        },
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

        {/* Administrative Policy Guidance Notice */}
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 10,
            background: '#fefce8',
            border: '1.5px solid #fef08a',
            color: '#854d0e',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <Shield size={20} style={{ flexShrink: 0, marginTop: 2, color: '#ca8a04' }} />
          <div>
            <strong>Administrative Retest Notice:</strong> Updating your role, department, or functional area will save to
            your official employee record and competency baseline, but will <strong>NOT</strong> automatically retrigger a
            new diagnostic test. Retesting only happens if explicitly requested via administrative appeal.
          </div>
        </div>

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

        {/* Card 2: Professional Cadre & Assignment */}
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardHeading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={18} color="#2563eb" /> Professional Cadre &amp; Assignment
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Department</label>
              {options.departments.length > 0 ? (
                <select
                  style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}
                  value={form.department_id || form.department}
                  onChange={handleDeptChange}
                >
                  <option value="">Select Department</option>
                  {options.departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} {d.code ? `(${d.code})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                  value={form.department}
                  onChange={setField('department')}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Designation / Cadre Role</label>
              {options.roles.length > 0 ? (
                <select
                  style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}
                  value={form.role_id}
                  onChange={handleRoleChange}
                >
                  <option value="">Select Role</option>
                  {options.roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} (Level {r.level})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                  value={form.designation}
                  onChange={setField('designation')}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Functional Area</label>
              {options.functionalAreas.length > 0 ? (
                <select
                  style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}
                  value={form.functional_area_id}
                  onChange={setField('functional_area_id')}
                >
                  <option value="">Select Functional Area</option>
                  {options.functionalAreas.map((fa) => (
                    <option key={fa._id} value={fa._id}>
                      {fa.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. Statistical Data Analysis"
                  style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                  value={form.functional_area_id}
                  onChange={setField('functional_area_id')}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Cadre Grade / Level</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem', background: '#f8fafc' }}
                value={form.gradeLevel}
                onChange={setField('gradeLevel')}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Work Location</label>
              <input
                type="text"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.workLocation}
                onChange={setField('workLocation')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                Current Responsibilities &amp; Work Areas
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {options.responsibilitiesOptions.map((resp) => {
                  const selected = form.current_responsibilities.includes(resp)
                  return (
                    <button
                      key={resp}
                      type="button"
                      onClick={() => toggleResponsibility(resp)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: selected ? '1.5px solid #2563eb' : '1.5px solid #cbd5e1',
                        background: selected ? '#eff6ff' : '#ffffff',
                        color: selected ? '#1d4ed8' : '#475569',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {selected ? '✓ ' : '+ '}
                      {resp}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Education & Professional Qualifications */}
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardHeading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GraduationCap size={18} color="#16a34a" /> Education &amp; Qualifications
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Highest Qualification</label>
              <select
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}
                value={form.education_level}
                onChange={setField('education_level')}
              >
                {options.educationLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>Field of Study</label>
              <input
                type="text"
                placeholder="e.g. Statistics, Economics, Computer Science"
                style={{ padding: '10px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                value={form.field_of_study}
                onChange={setField('field_of_study')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                Professional Certifications
              </label>

              {/* Active Certifications Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 32 }}>
                {form.certifications.map((cert) => (
                  <span
                    key={cert}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      background: '#dcfce7',
                      color: '#166534',
                      borderRadius: 20,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    {cert}
                    <button
                      type="button"
                      onClick={() => removeCert(cert)}
                      style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Custom Certification */}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  type="text"
                  placeholder="Add custom certification (e.g. NSSTA Sampling Techniques)"
                  style={{ flex: 1, padding: '9px 14px', border: '1.5px solid #cbd5e1', borderRadius: 8, fontSize: '0.875rem' }}
                  value={form.certInput}
                  onChange={setField('certInput')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCert()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addCert}
                  style={{
                    padding: '9px 18px',
                    background: '#16a34a',
                    color: '#fff',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  + Add
                </button>
              </div>

              {/* Quick suggestions */}
              {options.commonCertifications.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Quick add:</span>
                  {options.commonCertifications.slice(0, 4).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        if (!form.certifications.includes(c)) {
                          setForm((prev) => ({ ...prev, certifications: [...prev.certifications, c] }))
                        }
                      }}
                      style={{
                        padding: '3px 8px',
                        background: '#f1f5f9',
                        border: '1px dashed #cbd5e1',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        color: '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      + {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Emergency Contact */}
        <div className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardHeading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone size={18} color="#ea580c" /> Emergency Contact
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
