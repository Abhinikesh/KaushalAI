'use strict'

const { Router }     = require('express')
const rateLimit      = require('express-rate-limit')
const { ipKeyGenerator } = require('express-rate-limit')
const authController = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/auth.middleware')
const validate       = require('../middleware/validate')
const { signupSchema, loginSchema, googleCompleteSchema } = require('../validators/auth.validators')

const router = Router()

const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            process.env.NODE_ENV === 'production' ? 20 : 5000,
  keyGenerator:   (req) => ipKeyGenerator(req),
  standardHeaders: true,
  legacyHeaders:  false,
  message: { message: 'Too many requests, please try again in 15 minutes' },
})

router.post('/bypass',          authController.bypassLogin)
router.post('/signup',          authLimiter, validate(signupSchema),        authController.signup)
router.post('/login',           authLimiter, validate(loginSchema),         authController.login)
router.post('/sso',             authLimiter,                                authController.ssoLogin)
router.post('/google',          authLimiter,                                authController.googleAuth)
router.post('/google/complete', authLimiter, validate(googleCompleteSchema), authController.googleComplete)
router.post('/refresh',         authController.refresh)
router.post('/logout',          authController.logout)
router.get('/me',               authenticate, authController.me)
router.put('/me',               authenticate, authController.updateMe)


module.exports = router
