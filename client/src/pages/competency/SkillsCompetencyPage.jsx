import { useState, useEffect } from 'react'
import { BarChart3 } from 'lucide-react'
import { getMyCompetencies, getCompetencies, updateMyCompetency } from '../../api/competency.api'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import styles from './SkillsCompetencyPage.module.css'

export default function SkillsCompetencyPage() {
  const [competencies, setCompetencies] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [userCompsRes, allCompsRes] = await Promise.all([
        getMyCompetencies().catch(() => ({ competencies: [] })),
        getCompetencies().catch(() => ({ competencies: [] })),
      ])

      const userMap = new Map()
      const userList = userCompsRes.competencies || userCompsRes || []
      userList.forEach((uc) => {
        const id = uc.competencyId?._id || uc.competencyId || uc._id
        userMap.set(String(id), uc.currentLevel || 1)
      })

      const allList = allCompsRes.competencies || allCompsRes || []
      const merged = allList.map((c) => ({
        ...c,
        currentLevel: userMap.get(String(c._id)) || 1,
      }))

      setCompetencies(merged)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleLevelChange = async (competencyId, newLevel) => {
    try {
      setUpdatingId(competencyId)
      await updateMyCompetency(competencyId, newLevel)
      setCompetencies((prev) =>
        prev.map((c) => (c._id === competencyId ? { ...c, currentLevel: newLevel } : c))
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const categories = ['all', 'domain', 'technical', 'behavioral']
  const filtered = competencies.filter(
    (c) => categoryFilter === 'all' || (c.category || '').toLowerCase() === categoryFilter
  )

  const avgLevel = competencies.length
    ? (competencies.reduce((acc, c) => acc + (c.currentLevel || 1), 0) / competencies.length).toFixed(1)
    : '1.0'

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <Skeleton.Text lines={2} />
        </div>
        <div className={styles.competencyGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton.Card key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Skills &amp; Competency Profile</h1>
          <p className={styles.subtitle}>
            Explore and self-assess all registered official competencies across statistical and behavioral domains
          </p>
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{competencies.length}</span>
          <span className={styles.statLabel}>Total Competencies</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{avgLevel} / 5.0</span>
          <span className={styles.statLabel}>Average Proficiency</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>
            {competencies.filter((c) => (c.currentLevel || 1) >= 4).length}
          </span>
          <span className={styles.statLabel}>Advanced Skills (Level 4+)</span>
        </div>
      </div>

      <div className={styles.filterBar}>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`${styles.categoryBtn} ${categoryFilter === cat ? styles.categoryBtnActive : ''}`}
            onClick={() => setCategoryFilter(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No competencies found"
          description="No competencies match the selected category filter."
        />
      ) : (
        <div className={styles.competencyGrid}>
          {filtered.map((c) => (
            <div key={c._id} className={styles.card}>
              <div className={styles.cardTop}>
                <h3 className={styles.compName}>{c.name}</h3>
                <Badge variant={c.category === 'domain' ? 'igot' : c.category === 'technical' ? 'nssta' : 'neutral'}>
                  {c.category}
                </Badge>
              </div>

              <p className={styles.compDesc}>{c.description || 'Core competency for official statistical operations and data governance.'}</p>

              <div className={styles.levelSection}>
                <div className={styles.levelHeader}>
                  <span className={styles.levelLabel}>Self-Assessed Level:</span>
                  <span className={styles.levelValue}>
                    {updatingId === c._id ? 'Updating...' : `Level ${c.currentLevel || 1} of 5`}
                  </span>
                </div>
                <div className={styles.levelDots}>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      title={`Set to Level ${lvl}`}
                      className={`${styles.dotBtn} ${(c.currentLevel || 1) >= lvl ? styles.dotActive : ''}`}
                      onClick={() => handleLevelChange(c._id, lvl)}
                      disabled={updatingId === c._id}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
