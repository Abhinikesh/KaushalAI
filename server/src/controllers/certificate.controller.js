'use strict'

const certificateService = require('../services/certificate.service')

async function verifyCertificate(req, res, next) {
  try {
    const { certificateId } = req.params
    const result = await certificateService.getPublicCertificate(certificateId)

    if (!result.valid) {
      if (result.status === 'invalid_format') {
        return res.status(400).json(result)
      }
      if (result.status === 'not_found') {
        return res.status(404).json(result)
      }
    }

    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  verifyCertificate,
}
