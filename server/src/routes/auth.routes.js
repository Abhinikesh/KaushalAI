'use strict'

const { Router }     = require('express')
const rateLimit      = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')
const authController = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/auth.middleware')
const validate       = require('../middleware/validate')
const { signupSchema, loginSchema, googleCompleteSchema } = require('../validators/auth.validators')

const router = Router()

const getClientIpKey = (req) => {
  const rawIp = req.ip || req.socket?.remoteAddress || '127.0.0.1'
  return ipKeyGenerator(rawIp)
}

const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            process.env.NODE_ENV === 'production' ? 20 : 5000,
  keyGenerator:   getClientIpKey,
  standardHeaders: true,
  legacyHeaders:  false,
  message: { message: 'Too many requests, please try again in 15 minutes' },
})

// Dedicated rate limiter for token refresh requests: allows legitimate concurrent tabs while blocking flood attacks
const refreshLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            process.env.NODE_ENV === 'production' ? 120 : 5000,
  keyGenerator:   getClientIpKey,
  standardHeaders: true,
  legacyHeaders:  false,
  message: { message: 'Too many refresh requests, please try again later' },
})

// Development & testing endpoints — never exposed in production
if (process.env.NODE_ENV !== 'production') {
  router.post('/bypass',          authController.bypassLogin)
  router.post('/sso',             authLimiter, authController.ssoLogin)
  router.post('/google/complete', authLimiter, validate(googleCompleteSchema), authController.googleComplete)
}

router.post('/signup',          authLimiter, validate(signupSchema),        authController.signup)
router.post('/login',           authLimiter, validate(loginSchema),         authController.login)
router.post('/admin-login',     authLimiter, validate(loginSchema),         authController.adminLogin)
router.post('/google',          authLimiter,                                authController.googleAuth)
router.post('/refresh',         refreshLimiter,                             authController.refresh)
router.post('/logout',          authController.logout)
router.post('/logout-all',      authenticate, authController.logoutAll)
router.get('/me',               authenticate, authController.me)
router.put('/me',               authenticate, authController.updateMe)


module.exports = router
