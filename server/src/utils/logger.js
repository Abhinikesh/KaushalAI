// Wraps console so log calls can be suppressed or redirected in tests
// without pulling in a full logging library at this stage.
const logger = {
  info: (...args) => console.info('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
}

module.exports = logger
