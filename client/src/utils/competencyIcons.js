import {
  BarChart3,
  TrendingUp,
  Database,
  Code2,
  Brain,
  MapPin,
  ShieldCheck,
  Lock,
  Cloud,
  Layers,
  Users,
  Compass,
  Briefcase,
  Award,
  FileSpreadsheet,
  Globe2,
  BookOpen,
  HelpCircle,
} from 'lucide-react'

/**
 * Maps a competency name, category, or keyword to an appropriate Lucide icon component.
 * Ensures visual consistency across cards, lists, recommendations, and course badges.
 */
export function getCompetencyIcon(name = '', category = '') {
  const text = `${name} ${category}`.toLowerCase()

  // Programming & Data Engineering
  if (text.includes('python')) return Code2
  if (text.includes('sql') || text.includes('database')) return Database
  if (text.includes(' r ') || text.startsWith('r ') || text.includes('r programming')) return FileSpreadsheet

  // Machine Learning & AI
  if (text.includes('ai') || text.includes('machine learning') || text.includes('deep learning')) return Brain

  // GIS & Spatial
  if (text.includes('gis') || text.includes('spatial') || text.includes('mapping')) return MapPin

  // Security, Privacy & Digital Governance
  if (text.includes('cyber') || text.includes('security')) return ShieldCheck
  if (text.includes('privacy') || text.includes('protection')) return Lock
  if (text.includes('cloud')) return Cloud
  if (text.includes('infrastructure') || text.includes('dpi') || text.includes('governance')) return Layers

  // Statistics & Methodology
  if (text.includes('national accounts') || text.includes('price') || text.includes('inflation') || text.includes('trend')) {
    return TrendingUp
  }
  if (text.includes('survey') || text.includes('sampling') || text.includes('statistical') || text.includes('indicator') || text.includes('sdg')) {
    return BarChart3
  }

  // Behavioural & Leadership
  if (text.includes('leadership') || text.includes('team')) return Users
  if (text.includes('decision') || text.includes('ethics') || text.includes('integrity')) return Compass
  if (text.includes('project') || text.includes('management')) return Briefcase
  if (text.includes('communication') || text.includes('presentation')) return Globe2
  if (text.includes('behavioural')) return Award

  // Default
  return BookOpen
}
