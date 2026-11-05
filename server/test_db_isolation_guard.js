/**
 * test_db_isolation_guard.js
 * Verification of Test Database Isolation Hardening Guardrails (Part 10.2)
 */

'use strict'

require('dotenv').config()
const {
  validateTestDatabaseUri,
  sanitizeUri,
  extractDatabaseName,
  connectTestDb,
  closeTestEnvironment,
} = require('./src/test/testDbGuard')

async function runGuardTests() {
  console.log('========================================================================')
  console.log('   TESTING PART 10.2: TEST DATABASE ISOLATION & GUARDRAIL SAFETY        ')
  console.log('========================================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`)
      passed++
    } else {
      console.error(`  ✗ FAIL: ${message}`)
      failed++
    }
  }

  // 1. Missing URI rejection
  try {
    validateTestDatabaseUri(null)
    assert(false, 'Missing URI should have thrown')
  } catch (err) {
    assert(err.message.includes('MONGODB_TEST_URI is missing or empty'), '1. Missing URI throws explicit missing error')
  }

  try {
    validateTestDatabaseUri('')
    assert(false, 'Empty URI should have thrown')
  } catch (err) {
    assert(err.message.includes('MONGODB_TEST_URI is missing or empty'), '2. Empty URI throws explicit missing error')
  }

  // 2. Missing Database Name rejection
  try {
    validateTestDatabaseUri('mongodb://127.0.0.1:27017')
    assert(false, 'URI without database name should have thrown')
  } catch (err) {
    assert(err.message.includes('does not specify a target database name'), '3. URI without database name rejected')
  }

  try {
    validateTestDatabaseUri('mongodb://127.0.0.1:27017/')
    assert(false, 'URI with trailing slash but no name should have thrown')
  } catch (err) {
    assert(err.message.includes('does not specify a target database name'), '4. Trailing slash URI without database rejected')
  }

  // 3. Known Development / Production Database Rejection
  const forbiddenTargets = ['kaushalai', 'kaushal_ai', 'production', 'prod', 'kaushalai_prod', 'development']
  for (const target of forbiddenTargets) {
    try {
      validateTestDatabaseUri(`mongodb://127.0.0.1:27017/${target}`)
      assert(false, `Forbidden database "${target}" should have been rejected`)
    } catch (err) {
      assert(err.message.includes('SECURITY ALERT'), `5. Forbidden database "${target}" rejected with Security Alert`)
    }
  }

  // 4. Non-test database rejection (generic or unidentifiable)
  try {
    validateTestDatabaseUri('mongodb://127.0.0.1:27017/generic_database')
    assert(false, 'Non-test database name should have been rejected')
  } catch (err) {
    assert(err.message.includes('SECURITY REJECTION'), '6. Generic database name rejected (must be identifiable test DB)')
  }

  // 5. Valid Test Database Acceptance
  const valid = validateTestDatabaseUri('mongodb://127.0.0.1:27017/kaushalai_test')
  assert(valid.dbName === 'kaushalai_test', `7. Dedicated test database "kaushalai_test" accepted`)

  // 6. Credential Sanitization
  const masked = sanitizeUri('mongodb://adminUser:SuperSecretPassword123!@cluster0.mongodb.net:27017/kaushalai_test')
  assert(!masked.includes('SuperSecretPassword123!'), '8. Password masked from sanitized URI')
  assert(masked.includes('//***:***@'), '9. Mask replacement is //***:***@')

  // 7. Live Connection to Dedicated Test Database
  const conn = await connectTestDb('mongodb://127.0.0.1:27017/kaushalai_test')
  assert(conn.dbName === 'kaushalai_test', `10. Connected to verified test database "${conn.dbName}"`)

  // 8. Connection rejection of development database
  try {
    await connectTestDb('mongodb://127.0.0.1:27017/kaushalai')
    assert(false, 'connectTestDb should reject kaushalai')
  } catch (err) {
    assert(err.message.includes('SECURITY ALERT'), '11. connectTestDb actively blocks connection to dev database "kaushalai"')
  }

  await closeTestEnvironment()

  console.log('\n========================================================================')
  console.log(`GUARDRAIL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('========================================================================')

  process.exit(failed > 0 ? 1 : 0)
}

runGuardTests().catch((err) => {
  console.error('Test error:', err)
  process.exit(1)
})

