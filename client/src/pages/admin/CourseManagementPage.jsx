import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Edit2, Trash2, Eye, BookOpen, CheckCircle2,
  ChevronDown, ChevronUp, X, Save, AlertTriangle, Clock,
  Youtube, Globe, FileText, Layers, Star,
} from 'lucide-react'
import { listCourses, createCourse, updateCourse, deleteCourse } from '../../api/course.api'

/* ── Constants ─────────────────────────────────────────── */
const EMPTY_MODULE = { title: '', durationMins: 30, youtubeUrl: '' }
const EMPTY_RESOURCE = { label: '', type: 'PDF', url: '', sizeMB: '' }

const EMPTY_FORM = {
  title: '',
  shortDescription: '',
  description: '',
  source: 'igot',
  provider: 'iGOT Karmayogi',
  externalCourseId: '',
  youtubeUrl: '',
  category: '',
  competencyTags: '',     // comma-separated string in form
  difficulty: 'beginner',
  language: 'English',
  durationHours: '',
  prerequisites: 'None',
  objectives: '',         // newline-separated
  modules: [],
  transcript: '',
  resources: [],
  isPublished: true,
}

const PROVIDERS = ['iGOT Karmayogi', 'Karmayogi Bharat', 'MoSPI', 'NSSTA', 'DOPT', 'Other']
const SOURCES   = [
  { value: 'igot',  label: 'iGOT Karmayogi' },
  { value: 'nssta', label: 'NSSTA' },
  { value: 'mospi', label: 'MoSPI' },
  { value: 'other', label: 'Other' },
]
const LEVELS = [
  { value: 'beginner',     label: 'Beginner',     color: '#16a34a', bg: '#f0fdf4' },
  { value: 'intermediate', label: 'Intermediate', color: '#d97706', bg: '#fffbeb' },
  { value: 'advanced',     label: 'Advanced',     color: '#dc2626', bg: '#fef2f2' },
]

function levelBadge(difficulty) {
  const l = LEVELS.find((x) => x.value === difficulty) || LEVELS[0]
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
      color: l.color, background: l.bg, textTransform: 'uppercase',
    }}>
      {l.label}
    </span>
  )
}

/* ── Shared field style ────────────────────────────────── */
const fieldStyle = {
  width: '100%', padding: '9px 12px',
  border: '1.5px solid #e5e7eb', borderRadius: 8,
  fontSize: 13.5, color: '#111827', outline: 'none',
  background: '#fff', boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: '#374151', marginBottom: 5,
}

function FieldGroup({ label, required, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   ADD / EDIT COURSE DRAWER
   ══════════════════════════════════════════════════════════ */
function CourseFormDrawer({ course, onClose, onSaved }) {
  const queryClient = useQueryClient()
  const isEdit = Boolean(course)
  const [form, setForm] = useState(() => {
    if (!course) return EMPTY_FORM
    return {
      ...EMPTY_FORM,
      ...course,
      competencyTags: (course.competencyTags || []).join(', '),
      objectives: (course.objectives || []).join('\n'),
    }
  })
  const [activeSection, setActiveSection] = useState('basic')
  const [error, setError] = useState('')

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  /* Modules */
  const addModule = () => set('modules', [...(form.modules || []), { ...EMPTY_MODULE }])
  const removeModule = (i) => set('modules', form.modules.filter((_, idx) => idx !== i))
  const setModule = (i, key, val) => {
    const mods = [...form.modules]
    mods[i] = { ...mods[i], [key]: val }
    set('modules', mods)
  }

  /* Resources */
  const addResource = () => set('resources', [...(form.resources || []), { ...EMPTY_RESOURCE }])
  const removeResource = (i) => set('resources', form.resources.filter((_, idx) => idx !== i))
  const setResource = (i, key, val) => {
    const res = [...form.resources]
    res[i] = { ...res[i], [key]: val }
    set('resources', res)
  }

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit ? updateCourse(course._id, payload) : createCourse(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['adminCourses'] })
      onSaved()
    },
    onError: (err) => setError(err?.response?.data?.message || 'Failed to save course'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) return setError('Course title is required')
    if (!form.source) return setError('Source is required')
    if (!form.difficulty) return setError('Difficulty level is required')

    const payload = {
      ...form,
      durationHours: Number(form.durationHours) || 0,
      competencyTags: form.competencyTags
        ? form.competencyTags.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      objectives: form.objectives
        ? form.objectives.split('\n').map((s) => s.trim()).filter(Boolean)
        : [],
    }
    mutation.mutate(payload)
  }

  const sections = [
    { key: 'basic',      label: 'Basic Info',  icon: BookOpen },
    { key: 'content',    label: 'Content',     icon: Youtube },
    { key: 'modules',    label: 'Modules',     icon: Layers },
    { key: 'overview',   label: 'Overview',    icon: FileText },
    { key: 'resources',  label: 'Resources',   icon: Globe },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'stretch',
    }}>
      {/* Backdrop */}
      <div
        style={{ flex: 1, background: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div style={{
        width: 640, background: '#fff', display: 'flex', flexDirection: 'column',
        overflowY: 'auto', boxShadow: '-4px 0 32px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#4f46e5', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
              {isEdit ? 'Edit Course' : 'Add New Course'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
              {isEdit ? `Editing: ${course.title}` : 'Fill in all details to publish'}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {/* Section tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 }}>
          {sections.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSection(key)}
              style={{
                flex: 1, padding: '10px 6px',
                background: 'none', border: 'none',
                borderBottom: activeSection === key ? '2px solid #4f46e5' : '2px solid transparent',
                color: activeSection === key ? '#4f46e5' : '#6b7280',
                fontSize: 11.5, fontWeight: activeSection === key ? 700 : 500,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {error && (
            <div style={{
              padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5',
              borderRadius: 8, color: '#dc2626', fontSize: 13, marginBottom: 16,
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          {/* ── BASIC INFO ── */}
          {activeSection === 'basic' && (
            <div>
              <FieldGroup label="Course Title" required>
                <input
                  style={fieldStyle}
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="e.g. Data Analysis with Python"
                />
              </FieldGroup>

              <FieldGroup label="Short Description" hint="Shown on course cards (max 300 chars)">
                <textarea
                  style={{ ...fieldStyle, minHeight: 70, resize: 'vertical' }}
                  value={form.shortDescription}
                  onChange={(e) => set('shortDescription', e.target.value)}
                  placeholder="Brief one-line description for course cards"
                  maxLength={300}
                />
              </FieldGroup>

              <FieldGroup label="Full Description">
                <textarea
                  style={{ ...fieldStyle, minHeight: 120, resize: 'vertical' }}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Detailed course description"
                />
              </FieldGroup>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <FieldGroup label="Source" required>
                  <select
                    style={fieldStyle}
                    value={form.source}
                    onChange={(e) => set('source', e.target.value)}
                  >
                    {SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </FieldGroup>

                <FieldGroup label="Provider">
                  <select
                    style={fieldStyle}
                    value={form.provider}
                    onChange={(e) => set('provider', e.target.value)}
                  >
                    {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </FieldGroup>

                <FieldGroup label="Difficulty Level" required>
                  <select
                    style={fieldStyle}
                    value={form.difficulty}
                    onChange={(e) => set('difficulty', e.target.value)}
                  >
                    {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </FieldGroup>

                <FieldGroup label="Language">
                  <input
                    style={fieldStyle}
                    value={form.language}
                    onChange={(e) => set('language', e.target.value)}
                    placeholder="English"
                  />
                </FieldGroup>

                <FieldGroup label="Estimated Duration (hours)">
                  <input
                    type="number" min="0" step="0.5"
                    style={fieldStyle}
                    value={form.durationHours}
                    onChange={(e) => set('durationHours', e.target.value)}
                    placeholder="e.g. 2.5"
                  />
                </FieldGroup>

                <FieldGroup label="External Course ID" hint="iGOT or NSSTA ID">
                  <input
                    style={fieldStyle}
                    value={form.externalCourseId}
                    onChange={(e) => set('externalCourseId', e.target.value)}
                    placeholder="e.g. igot-crs-01"
                  />
                </FieldGroup>
              </div>

              <FieldGroup label="Category">
                <input
                  style={fieldStyle}
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  placeholder="e.g. Data & Analytics, AI/ML, Governance"
                />
              </FieldGroup>

              <FieldGroup label="Competency Tags" hint="Comma-separated: AI/ML, Data Visualization, Digital Governance">
                <input
                  style={fieldStyle}
                  value={form.competencyTags}
                  onChange={(e) => set('competencyTags', e.target.value)}
                  placeholder="AI/ML, Data Visualization, Digital Governance"
                />
              </FieldGroup>

              <FieldGroup label="Target Group">
                <input
                  style={fieldStyle}
                  value={form.targetGroup}
                  onChange={(e) => set('targetGroup', e.target.value)}
                  placeholder="e.g. All Government Officers"
                />
              </FieldGroup>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={form.isPublished}
                  onChange={(e) => set('isPublished', e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="isPublished" style={{ fontSize: 13.5, color: '#374151', fontWeight: 600 }}>
                  Published (visible to learners)
                </label>
              </div>
            </div>
          )}

          {/* ── CONTENT ── */}
          {activeSection === 'content' && (
            <div>
              <FieldGroup label="Main YouTube URL" hint="Full YouTube video URL or embed URL for the primary course video">
                <input
                  style={fieldStyle}
                  value={form.youtubeUrl}
                  onChange={(e) => set('youtubeUrl', e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </FieldGroup>

              {form.youtubeUrl && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Preview:</div>
                  {(() => {
                    let ytId = ''
                    try {
                      const url = new URL(form.youtubeUrl)
                      ytId = url.searchParams.get('v') || url.pathname.split('/').pop()
                    } catch (_) {
                      ytId = form.youtubeUrl.split('/').pop()
                    }
                    return ytId ? (
                      <img
                        src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                        alt="thumbnail"
                        style={{ width: 240, height: 135, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb' }}
                      />
                    ) : null
                  })()}
                </div>
              )}

              <FieldGroup label="Transcript" hint="Full text transcript of the course video">
                <textarea
                  style={{ ...fieldStyle, minHeight: 200, resize: 'vertical', fontSize: 12.5 }}
                  value={form.transcript}
                  onChange={(e) => set('transcript', e.target.value)}
                  placeholder="Paste transcript here..."
                />
              </FieldGroup>
            </div>
          )}

          {/* ── MODULES ── */}
          {activeSection === 'modules' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  {form.modules.length} module{form.modules.length !== 1 ? 's' : ''}
                </div>
                <button
                  type="button"
                  onClick={addModule}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', background: '#4f46e5', color: '#fff',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> Add Module
                </button>
              </div>

              {form.modules.length === 0 && (
                <div style={{
                  padding: '32px', textAlign: 'center', background: '#f9fafb',
                  border: '1.5px dashed #d1d5db', borderRadius: 10,
                }}>
                  <Layers size={28} color="#9ca3af" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13.5, color: '#6b7280' }}>No modules yet. Click "Add Module" to start building the learning path.</div>
                </div>
              )}

              {form.modules.map((mod, i) => (
                <div key={i} style={{
                  border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px',
                  marginBottom: 12, background: '#fafafa',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5' }}>Module {i + 1}</div>
                    <button type="button" onClick={() => removeModule(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                      <X size={16} />
                    </button>
                  </div>
                  <FieldGroup label="Module Title" required>
                    <input
                      style={fieldStyle}
                      value={mod.title}
                      onChange={(e) => setModule(i, 'title', e.target.value)}
                      placeholder="e.g. Introduction to Python"
                    />
                  </FieldGroup>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                    <FieldGroup label="Duration (mins)">
                      <input
                        type="number" min="0"
                        style={fieldStyle}
                        value={mod.durationMins}
                        onChange={(e) => setModule(i, 'durationMins', Number(e.target.value))}
                        placeholder="30"
                      />
                    </FieldGroup>
                    <FieldGroup label="YouTube URL (optional)">
                      <input
                        style={fieldStyle}
                        value={mod.youtubeUrl}
                        onChange={(e) => setModule(i, 'youtubeUrl', e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                      />
                    </FieldGroup>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── OVERVIEW ── */}
          {activeSection === 'overview' && (
            <div>
              <FieldGroup label="Prerequisites">
                <input
                  style={fieldStyle}
                  value={form.prerequisites}
                  onChange={(e) => set('prerequisites', e.target.value)}
                  placeholder="None"
                />
              </FieldGroup>

              <FieldGroup label="Learning Objectives" hint="One objective per line">
                <textarea
                  style={{ ...fieldStyle, minHeight: 150, resize: 'vertical' }}
                  value={form.objectives}
                  onChange={(e) => set('objectives', e.target.value)}
                  placeholder={"Understand the core concepts\nApply knowledge to government data\nBuild practical skills"}
                />
              </FieldGroup>
            </div>
          )}

          {/* ── RESOURCES ── */}
          {activeSection === 'resources' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  {form.resources.length} resource{form.resources.length !== 1 ? 's' : ''}
                </div>
                <button
                  type="button"
                  onClick={addResource}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', background: '#4f46e5', color: '#fff',
                    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> Add Resource
                </button>
              </div>

              {form.resources.length === 0 && (
                <div style={{
                  padding: '32px', textAlign: 'center', background: '#f9fafb',
                  border: '1.5px dashed #d1d5db', borderRadius: 10,
                }}>
                  <Globe size={28} color="#9ca3af" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13.5, color: '#6b7280' }}>No resources yet. Add PDFs, links, or reference materials.</div>
                </div>
              )}

              {form.resources.map((res, i) => (
                <div key={i} style={{
                  border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px',
                  marginBottom: 12, background: '#fafafa',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#4f46e5' }}>Resource {i + 1}</div>
                    <button type="button" onClick={() => removeResource(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                      <X size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                    <FieldGroup label="Label">
                      <input
                        style={fieldStyle}
                        value={res.label}
                        onChange={(e) => setResource(i, 'label', e.target.value)}
                        placeholder="e.g. Study Material PDF"
                      />
                    </FieldGroup>
                    <FieldGroup label="Type">
                      <select
                        style={fieldStyle}
                        value={res.type}
                        onChange={(e) => setResource(i, 'type', e.target.value)}
                      >
                        {['PDF', 'Link', 'Video', 'Other'].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </FieldGroup>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 10 }}>
                    <FieldGroup label="URL">
                      <input
                        style={fieldStyle}
                        value={res.url}
                        onChange={(e) => setResource(i, 'url', e.target.value)}
                        placeholder="https://..."
                      />
                    </FieldGroup>
                    <FieldGroup label="Size">
                      <input
                        style={fieldStyle}
                        value={res.sizeMB}
                        onChange={(e) => setResource(i, 'sizeMB', e.target.value)}
                        placeholder="2.4 MB"
                      />
                    </FieldGroup>
                  </div>
                </div>
              ))}
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          background: '#f9fafb', flexShrink: 0,
        }}>
          <button
            type="button" onClick={onClose}
            style={{
              padding: '9px 20px', background: '#fff', border: '1.5px solid #e5e7eb',
              borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: '#374151',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 22px', background: mutation.isPending ? '#9ca3af' : '#4f46e5',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 13.5, fontWeight: 600, cursor: mutation.isPending ? 'default' : 'pointer',
            }}
          >
            <Save size={15} />
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Course' : 'Create Course'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   DELETE CONFIRMATION MODAL
   ══════════════════════════════════════════════════════════ */
function DeleteModal({ course, onClose, onDeleted }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => deleteCourse(course._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['adminCourses'] })
      onDeleted()
    },
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: '28px 28px 20px',
        width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, background: '#fef2f2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={20} color="#dc2626" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Delete Course?</div>
            <div style={{ fontSize: 12.5, color: '#6b7280' }}>This action cannot be undone</div>
          </div>
        </div>
        <p style={{ fontSize: 13.5, color: '#374151', marginBottom: 20 }}>
          You are about to delete <strong>"{course.title}"</strong>. All learner enrollments for this course will also be affected.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '9px 18px', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            style={{ padding: '9px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
          >
            {mutation.isPending ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════ */
export default function CourseManagementPage() {
  const [search, setSearch] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [drawerCourse, setDrawerCourse] = useState(null)  // null=closed, false=new, obj=edit
  const [deletingCourse, setDeletingCourse] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => listCourses(),
    staleTime: 30 * 1000,
  })

  const courses = useMemo(() => {
    const raw = data?.courses || data || []
    const arr = Array.isArray(raw) ? raw : []
    return arr.filter((c) => {
      if (filterDifficulty && c.difficulty !== filterDifficulty) return false
      if (filterSource && c.source !== filterSource) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q) ||
          (c.competencyTags || []).some((t) => t.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [data, search, filterDifficulty, filterSource])

  const igotCount  = useMemo(() => (data?.courses || data || []).filter((c) => c.source === 'igot').length,  [data])
  const nsstaCount = useMemo(() => (data?.courses || data || []).filter((c) => c.source === 'nssta').length, [data])
  const totalCount = (data?.courses || data || []).length

  return (
    <div style={{ padding: '28px 32px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 2000,
          background: '#10b981', color: '#fff', padding: '12px 20px',
          borderRadius: 10, fontSize: 13.5, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      {/* Drawers / Modals */}
      {drawerCourse !== null && (
        <CourseFormDrawer
          course={drawerCourse || null}
          onClose={() => setDrawerCourse(null)}
          onSaved={() => {
            setDrawerCourse(null)
            showToast(drawerCourse ? 'Course updated successfully!' : 'Course created successfully!')
          }}
        />
      )}
      {deletingCourse && (
        <DeleteModal
          course={deletingCourse}
          onClose={() => setDeletingCourse(null)}
          onDeleted={() => {
            setDeletingCourse(null)
            showToast('Course deleted.')
          }}
        />
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Course Catalogue Management
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: '#64748b' }}>
            Add, edit, and manage all iGOT Karmayogi and NSSTA courses. Changes sync to MongoDB and reflect everywhere on the learner website.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDrawerCourse(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', background: '#4f46e5', color: '#fff',
            border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700,
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Plus size={16} /> Add Course
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Courses', value: totalCount, sub: 'In catalogue', icon: BookOpen, color: '#4f46e5', bg: '#ede9fe' },
          { label: 'iGOT Karmayogi', value: igotCount, sub: 'Online modules', icon: Globe, color: '#0ea5e9', bg: '#f0f9ff' },
          { label: 'NSSTA Workshops', value: nsstaCount, sub: 'Physical batches', icon: Layers, color: '#f59e0b', bg: '#fffbeb' },
          { label: 'Published', value: (data?.courses || data || []).filter((c) => c.isPublished !== false).length, sub: 'Visible to learners', icon: CheckCircle2, color: '#10b981', bg: '#ecfdf5' },
        ].map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} style={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 12, padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 42, height: 42, background: k.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
                <Icon size={20} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', marginTop: 2 }}>{k.label}</div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 1 }}>{k.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18,
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 18px',
      }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px' }}>
          <Search size={15} color="#9ca3af" />
          <input
            type="text"
            placeholder="Search by title, category, competency tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13.5, color: '#374151', flex: 1 }}
          />
        </div>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
          style={{ ...fieldStyle, width: 160 }}
        >
          <option value="">All Levels</option>
          {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          style={{ ...fieldStyle, width: 160 }}
        >
          <option value="">All Sources</option>
          {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Published Course Inventory</div>
          <div style={{ fontSize: 12.5, color: '#94a3b8' }}>Showing {courses.length} of {totalCount} courses</div>
        </div>

        {isLoading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Loading courses...</div>
        ) : courses.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <BookOpen size={42} color="#d1d5db" style={{ marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No courses found</div>
            <div style={{ fontSize: 13.5, color: '#9ca3af', marginBottom: 20 }}>
              {totalCount === 0 ? 'Add your first course to get started.' : 'Try adjusting your filters.'}
            </div>
            {totalCount === 0 && (
              <button
                type="button"
                onClick={() => setDrawerCourse(false)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                <Plus size={14} /> Add First Course
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Course Title & Domain', 'Provider', 'Duration', 'Level', 'Modules', 'YouTube', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: '#6b7280',
                      textTransform: 'uppercase', letterSpacing: 0.5,
                      borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {courses.map((course, i) => (
                  <tr
                    key={course._id}
                    style={{
                      borderBottom: i < courses.length - 1 ? '1px solid #f1f5f9' : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>
                        {course.title}
                      </div>
                      {course.category && (
                        <div style={{ fontSize: 11.5, color: '#6b7280' }}>{course.category}</div>
                      )}
                      {(course.competencyTags || []).slice(0, 2).map((t) => (
                        <span key={t} style={{ fontSize: 10, background: '#ede9fe', color: '#4f46e5', padding: '1px 7px', borderRadius: 20, marginRight: 4, fontWeight: 600 }}>
                          {t}
                        </span>
                      ))}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ fontSize: 12.5, color: '#374151' }}>{course.provider || 'iGOT Karmayogi'}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1, textTransform: 'uppercase' }}>{course.source}</div>
                    </td>
                    <td style={{ padding: '13px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#374151' }}>
                        <Clock size={13} color="#9ca3af" />
                        {course.durationHours ? `${course.durationHours}h` : '—'}
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      {levelBadge(course.difficulty)}
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        {(course.modules || []).length}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                      {course.youtubeUrl ? (
                        <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                          ▶ Linked
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, background: '#f3f4f6', color: '#9ca3af', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                          No URL
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: course.isPublished !== false ? '#ecfdf5' : '#f3f4f6',
                        color: course.isPublished !== false ? '#10b981' : '#9ca3af',
                      }}>
                        {course.isPublished !== false ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setDrawerCourse(course)}
                          title="Edit"
                          style={{ padding: '6px 10px', background: '#ede9fe', color: '#4f46e5', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCourse(course)}
                          title="Delete"
                          style={{ padding: '6px 10px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
