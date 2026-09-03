import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listCourses } from '../../api/course.api'
import { listQuizzes } from '../../api/quiz.api'
import { getAdminTrainingEffectiveness } from '../../api/admin.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'

export default function TrainerDashboard() {
  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => listCourses(),
  })

  const { data: quizzesData, isLoading: quizzesLoading } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => listQuizzes(),
  })

  const { data: effectData } = useQuery({
    queryKey: ['trainerEffectiveness'],
    queryFn: getAdminTrainingEffectiveness,
  })

  const courses = coursesData?.courses || coursesData || []
  const quizzes = quizzesData?.quizzes || quizzesData || []
  const effectCourses = effectData?.courses || []
  const totalSubmissions = effectCourses.reduce((acc, c) => acc + (c.attemptCount || 0), 0)
  const avgScore = effectCourses.length > 0
    ? Math.round((effectCourses.reduce((acc, c) => acc + (c.avgScore || 0), 0) / effectCourses.length) * 10) / 10
    : 0
  const avgPassRate = effectCourses.length > 0
    ? Math.round((effectCourses.reduce((acc, c) => acc + (c.passRate || 0), 0) / effectCourses.length) * 10) / 10
    : 0

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Top Welcome Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Faculty &amp; Trainer Hub
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
            National Statistical Systems Training Academy (NSSTA) Course Delivery &amp; Assessment Control
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <Link
            to="/trainer/upload"
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--color-primary-600)',
              color: 'white',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            + Upload Material
          </Link>
          <Link
            to="/trainer/mcq-generator"
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-primary-600)',
              color: 'var(--color-primary-600)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            ⚡ Generate MCQs
          </Link>
        </div>
      </div>

      {/* Real KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Active Catalog Courses</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-primary-600)', marginTop: 2 }}>
            {courses.length}
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>iGOT &amp; NSSTA Modules</span>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Available Assessments</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>
            {quizzes.length}
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Active Quizzes in Bank</span>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Officer Submissions</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-text-primary)', marginTop: 2 }}>
            {totalSubmissions}
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Completed evaluation events</span>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-5)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Mean Assessment Score</span>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'bold', color: 'var(--color-success)', marginTop: 2 }}>
            {avgScore}%
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Avg pass rate: {avgPassRate}%</span>
        </div>
      </div>

      {/* Quick Action Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)' }}>
        <Link
          to="/trainer/upload"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(99, 102, 241, 0.02))',
            border: '1.5px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'var(--color-primary-600)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
            ⬆
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>Upload Training Content</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Upload official manuals &amp; slides</div>
          </div>
        </Link>

        <Link
          to="/trainer/quiz-builder"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02))',
            border: '1.5px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: 'var(--color-success)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
            🛠️
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>AI Quiz Builder</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Assemble timed evaluations</div>
          </div>
        </Link>

        <Link
          to="/trainer/question-bank"
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.02))',
            border: '1.5px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: '#d97706', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
            📚
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>Question Bank</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Curate &amp; approve official MCQs</div>
          </div>
        </Link>

        <Link
          to="/trainer/analytics"
          style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(6, 182, 212, 0.02))',
            border: '1.5px solid rgba(6, 182, 212, 0.2)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: '#0891b2', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
            📈
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>Training Analytics</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Measure skill acquisition delta</div>
          </div>
        </Link>
      </div>

      {/* Active Programmes Overview */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
            Active Training Programmes
          </h3>
          <Link to="/trainer/programmes" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary-600)', fontWeight: 600, textDecoration: 'none' }}>
            View All Programmes →
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {courses.slice(0, 5).map((c) => (
            <div
              key={c._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {c.title}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 2 }}>
                  <Badge variant={c.source === 'nssta' ? 'nssta' : 'igot'}>
                    {c.source === 'nssta' ? 'NSSTA Greater Noida' : 'iGOT'}
                  </Badge>
                  <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                    ⏱ {c.durationHours || 20} hrs • 24 Enrolled
                  </span>
                </div>
              </div>

              <Link
                to={`/trainer/programmes/${c._id}`}
                style={{
                  padding: '4px 12px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-primary-600)',
                  textDecoration: 'none',
                }}
              >
                Manage →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
