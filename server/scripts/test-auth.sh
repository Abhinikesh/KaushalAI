#!/usr/bin/env bash
# Usage: bash server/scripts/test-auth.sh [BASE_URL]
# Runs a complete auth flow against the running server and reports pass/fail for each step.

BASE="${1:-http://localhost:5000}"
COOKIE_JAR=$(mktemp)
COOKIE_JAR2=$(mktemp)
PASS=0
FAIL=0

green() { printf '\033[32m✔ %s\033[0m\n' "$1"; }
red()   { printf '\033[31m✘ %s\033[0m\n' "$1"; }

check() {
  local label="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    green "$label"
    PASS=$((PASS + 1))
  else
    red "$label (expected to find: $expected)"
    echo "  Response: $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "  KaushalAI Auth Flow Test  →  $BASE"
echo "──────────────────────────────────────────"

# ── 1. Signup ──────────────────────────────────
R=$(curl -c "$COOKIE_JAR" -s -w "\n%{http_code}" -X POST "$BASE/api/auth/signup" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Officer","email":"test.officer@mospi.gov.in","password":"Secure123","role":"employee","designation":"SO","department":"MOSPI","experienceYears":3}')
BODY=$(echo "$R" | head -n1)
CODE=$(echo "$R" | tail -n1)
check "POST /signup → 201, no passwordHash" '"accessToken"' "$BODY"
if echo "$BODY" | grep -q '"passwordHash"'; then
  red "passwordHash leaked in signup response!"
  FAIL=$((FAIL + 1))
fi

# ── 2. Duplicate email ─────────────────────────
R=$(curl -s -X POST "$BASE/api/auth/signup" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Officer","email":"test.officer@mospi.gov.in","password":"Secure123","role":"employee"}')
check "POST /signup duplicate → 409" '"Email already in use"' "$R"

# ── 3. Login ───────────────────────────────────
LOGIN=$(curl -c "$COOKIE_JAR" -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"test.officer@mospi.gov.in","password":"Secure123"}')
check "POST /login → 200 with token" '"accessToken"' "$LOGIN"
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)

# ── 4. /me with token ─────────────────────────
ME=$(curl -s "$BASE/api/auth/me" -H "Authorization: Bearer $TOKEN")
check "GET /me (with token) → 200" '"email":"test.officer@mospi.gov.in"' "$ME"

# ── 5. /me without token ──────────────────────
NO_AUTH=$(curl -s "$BASE/api/auth/me")
check "GET /me (no token) → 401" '"Authentication required"' "$NO_AUTH"

# ── 6. Wrong password ─────────────────────────
WRONG=$(curl -s -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"test.officer@mospi.gov.in","password":"WrongPass9"}')
check "POST /login (wrong password) → 401" '"Invalid credentials"' "$WRONG"

# ── 7. Validation error ───────────────────────
VAL=$(curl -s -X POST "$BASE/api/auth/signup" \
  -H 'Content-Type: application/json' \
  -d '{"email":"not-an-email","password":"abc"}')
check "POST /signup (bad input) → 400 with details" '"details"' "$VAL"

# ── 8. Refresh ────────────────────────────────
REFRESH=$(curl -b "$COOKIE_JAR" -c "$COOKIE_JAR2" -s -X POST "$BASE/api/auth/refresh")
check "POST /refresh → 200 new token" '"accessToken"' "$REFRESH"

# ── 9. Logout ─────────────────────────────────
LOGOUT=$(curl -b "$COOKIE_JAR2" -s -X POST "$BASE/api/auth/logout")
check "POST /logout → 200" '"Logged out"' "$LOGOUT"

# ── 10. Refresh after logout ──────────────────
STALE=$(curl -b "$COOKIE_JAR2" -s -X POST "$BASE/api/auth/refresh")
check "POST /refresh (revoked cookie) → 401" '"Invalid or expired refresh token"' "$STALE"

# ── Cleanup ───────────────────────────────────
rm -f "$COOKIE_JAR" "$COOKIE_JAR2"

echo "──────────────────────────────────────────"
printf "  Results: \033[32m%d passed\033[0m" "$PASS"
if [ "$FAIL" -gt 0 ]; then
  printf ", \033[31m%d failed\033[0m" "$FAIL"
fi
printf "\n\n"
[ "$FAIL" -eq 0 ]
