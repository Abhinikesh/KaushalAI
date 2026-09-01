const { Router } = require('express')
const rateLimit = require('express-rate-limit')
const authController = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/auth.middleware')
const validate = require('../middleware/validate')
const { signupSchema, loginSchema } = require('../validators/auth.validators')

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again in 15 minutes' },
})

router.post('/signup', authLimiter, validate(signupSchema), authController.signup)
router.post('/login', authLimiter, validate(loginSchema), authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)
router.get('/me', authenticate, authController.me)

module.exports = router
