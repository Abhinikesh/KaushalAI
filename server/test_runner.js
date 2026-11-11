/**
 * KaushalAI Backend Test Runner
 * Executes the complete suite of authentication security, concurrency, and integrity tests.
 */

const { spawnSync } = require('child_process')
const path = require('path')

const TEST_SUITES = [
  { name: 'Database Isolation Guard (Part 10.2)', file: 'test_db_isolation_guard.js' },
  { name: 'Google ID-Token & Admin Isolation (Part 32.1.3)', file: 'test_part32_1_3_google_id_token_admin_isolation.js' },
  { name: 'Google Identity Provisioning (Part 32.1.4)', file: 'test_part32_1_4_google_identity_provisioning.js' },
  { name: 'Universal Auth UX & Cookie Normalization (Part 32.1.6)', file: 'test_part32_1_6_auth_ux_simplification.js' },
  { name: 'Public Signup Simplification (Part 32.1.7)', file: 'test_part32_1_7_public_signup_simplification.js' },
  { name: 'Critical Auth Security Remediation (Part 32.1.9)', file: 'test_part32_1_9_security_remediation.js' },
  { name: 'Deployment Migration & CORS Security (Part 32.1.10)', file: 'test_part32_1_10_deployment_migration_security.js' },
  { name: 'Refresh Concurrency & Rate Limiting (Part 32.1.11)', file: 'test_part32_1_11_refresh_concurrency_rate_limit.js' },
  { name: 'Refresh Family Security & Bounded Grace (Part 32.1.12)', file: 'test_part32_1_12_refresh_family_security.js' },
  { name: 'Rotation Atomicity & Failure Injections (Part 32.1.13)', file: 'test_part32_1_13_rotation_atomicity_and_failures.js' },
  { name: 'Rotation Crash Recovery & Proxy Trust (Part 32.1.14)', file: 'test_part32_1_14_rotation_crash_proxy_crosstab.js' },
  { name: 'Slow-Worker Safety & Commit Integrity (Part 32.1.15)', file: 'test_part32_1_15_slow_worker_recovery_integrity.js' },
  { name: 'Recovery Eligibility & Grace Threat Model (Part 32.1.16)', file: 'test_part32_1_16_recovery_eligibility_grace_threat_model.js' },
  { name: 'Recovery Cleanup & Worker Race Proof (Part 32.1.17)', file: 'test_part32_1_17_recovery_cleanup_and_worker_races.js' },
  { name: 'Recovery Ownership & Late-Write Safety (Part 32.1.18)', file: 'test_part32_1_18_successor_ownership_and_late_write_safety.js' },
]

console.log('========================================================================')
console.log('  KAUSHALAI BACKEND COMPLETE AUTHENTICATION REGRESSION RUNNER')
console.log('========================================================================\n')

let passedSuites = 0
let failedSuites = 0
const results = []

for (const suite of TEST_SUITES) {
  const filePath = path.join(__dirname, suite.file)
  console.log(`\n>>> RUNNING: ${suite.name} (${suite.file})`)

  const start = Date.now()
  const proc = spawnSync('node', [filePath], {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, NODE_ENV: 'test' },
  })
  const duration = ((Date.now() - start) / 1000).toFixed(2)

  if (proc.status === 0) {
    passedSuites++
    results.push({ name: suite.name, file: suite.file, status: 'PASSED', duration })
    console.log(`>>> PASSED in ${duration}s`)
  } else {
    failedSuites++
    results.push({ name: suite.name, file: suite.file, status: 'FAILED', duration, exitCode: proc.status })
    console.error(`>>> FAILED with exit code ${proc.status} in ${duration}s`)
  }
}

console.log('\n========================================================================')
console.log('  BACKEND TEST RUNNER SUMMARY')
console.log('========================================================================')
results.forEach((r) => {
  console.log(`[${r.status}] ${r.name} (${r.duration}s)`)
})
console.log('------------------------------------------------------------------------')
console.log(`TOTAL SUITES: ${TEST_SUITES.length} | PASSED: ${passedSuites} | FAILED: ${failedSuites}`)
console.log('========================================================================\n')

if (failedSuites > 0) {
  process.exit(1)
} else {
  process.exit(0)
}

