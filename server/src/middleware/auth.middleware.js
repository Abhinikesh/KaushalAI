const jwt = require('jsonwebtoken')

function authenticate(req, _res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next({ status: 401, message: 'Authentication required' })
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    req.user = { id: payload.id, role: payload.role }
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next({ status: 401, message: 'Access token expired' })
    }
    return next({ status: 401, message: 'Invalid access token' })
  }
}

function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next({ status: 403, message: 'Insufficient permissions' })
    }
    next()
  }
}

module.exports = { authenticate, authorize }
