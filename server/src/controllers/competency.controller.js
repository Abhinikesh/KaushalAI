const competencyService = require('../services/competency.service')

async function listCompetencies(req, res, next) {
  try {
    const competencies = await competencyService.listCompetencies()
    res.json({ competencies })
  } catch (err) {
    next(err)
  }
}

async function createCompetency(req, res, next) {
  try {
    const competency = await competencyService.createCompetency(req.body)
    res.status(201).json({ competency })
  } catch (err) {
    if (err.code === 11000) {
      return next({ status: 409, message: 'A competency with that name already exists' })
    }
    next(err)
  }
}

async function listJobRoles(req, res, next) {
  try {
    const jobRoles = await competencyService.listJobRoles()
    res.json({ jobRoles })
  } catch (err) {
    next(err)
  }
}

async function createJobRole(req, res, next) {
  try {
    const jobRole = await competencyService.createJobRole(req.body)
    res.status(201).json({ jobRole })
  } catch (err) {
    if (err.code === 11000) {
      return next({ status: 409, message: 'A job role with that title already exists' })
    }
    next(err)
  }
}

async function getMyCompetencies(req, res, next) {
  try {
    const records = await competencyService.getUserCompetencies(req.user.id)
    res.json({ competencies: records })
  } catch (err) {
    next(err)
  }
}

async function selfAssess(req, res, next) {
  try {
    const { competencyId } = req.params
    const { level } = req.body
    const record = await competencyService.upsertUserCompetency(
      req.user.id,
      competencyId,
      level,
      'self_assessed'
    )
    res.json({ competency: record })
  } catch (err) {
    next(err)
  }
}

async function setMyJobRole(req, res, next) {
  try {
    const user = await competencyService.setUserJobRole(req.user.id, req.body.jobRoleId)
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listCompetencies,
  createCompetency,
  listJobRoles,
  createJobRole,
  getMyCompetencies,
  selfAssess,
  setMyJobRole,
}
