'use strict'

/**
 * Common-password blocklist — top ~60 most-used passwords.
 * Checked case-insensitively at signup. Deliberately small and hardcoded
 * (not a giant dictionary attack) — enough to block the most obvious choices.
 */
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789',
  'qwerty123', 'qwerty1', 'iloveyou', 'admin123', 'letmein1',
  'welcome1', 'monkey123', 'dragon123', 'master123', 'sunshine1',
  'princess1', 'football1', 'shadow123', 'superman1', 'michael1',
  'charlie1', 'donald123', 'password2', 'passw0rd', 'p@ssword1',
  'abc12345', 'abc123456', 'login123', 'starwars1', 'mustang1',
  'access123', 'flower123', 'hello123', 'hockey123', 'killer123',
  'maggie123', 'pepper123', 'trustno1', 'batman123', 'cookie123',
  'george123', 'summer123', 'thomas123', 'tigger123', 'jessica1',
  'andrew123', 'joshua123', 'hunter123', 'ranger123', 'harley123',
  'secret123', 'daniel123', 'jordan123', 'taylor123', 'robert123',
  'matrix123', 'yankees1', 'welcome123', 'admin1234', 'pass1234',
])

function isCommonPassword(password) {
  return COMMON_PASSWORDS.has(password.toLowerCase())
}

module.exports = { isCommonPassword, COMMON_PASSWORDS }
