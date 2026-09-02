'use strict'

const {
  getDepartmentCompetencyHeatmap,
  getOrgWideTopGaps,
  getTrainingEffectiveness,
  getSkillDemandTrend,
  getOrgSummaryStats,
} = require('../services/adminAnalytics.service')

async function summary(req, res, next) {
  try {
    const data = await getOrgSummaryStats()
    res.json(data)
  } catch (err) { next(err) }
}

async function heatmap(req, res, next) {
  try {
    const data = await getDepartmentCompetencyHeatmap()
    res.json(data)
  } catch (err) { next(err) }
}

async function topGaps(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 25)
    const data  = await getOrgWideTopGaps(limit)
    res.json({ gaps: data })
  } catch (err) { next(err) }
}

async function trainingEffectiveness(req, res, next) {
  try {
    const data = await getTrainingEffectiveness()
    res.json({ courses: data })
  } catch (err) { next(err) }
}

async function skillTrend(req, res, next) {
  try {
    const { competencyId } = req.params
    const months = Math.min(parseInt(req.query.months) || 6, 24)
    const data   = await getSkillDemandTrend(competencyId, months)
    res.json(data)
  } catch (err) { next(err) }
}

module.exports = { summary, heatmap, topGaps, trainingEffectiveness, skillTrend }
