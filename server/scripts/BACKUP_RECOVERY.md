# KaushalAI — Production Backup & Disaster Recovery Runbook

**Target Platform:** KaushalAI (Ministry of Statistics and Programme Implementation - MoSPI)  
**Database Engine:** MongoDB (Document Database)  
**Tools:** `server/scripts/backup.js` and `server/scripts/restore.js`  

---

## 1. Overview & Strategy

KaushalAI stores mission-critical civil service training records, national competency framework models, course progress histories, diagnostic assessments, and issued certificates.

This runbook defines the operational procedure for automated daily backups, pre-deployment snapshots, checksum-verified disaster recovery, and staging environment hydration.

### Key Principles
1. **Never Print Credentials:** Connection strings and authentication tokens are masked in logs and reports.
2. **Immutable Snapshots:** Every backup artifact includes a `manifest.json` containing collection document counts and SHA-256 cryptographic checksums.
3. **Safety-Locked Restores:** Direct in-place restoration into production (`kaushalai`) is locked by default. Restores must target an isolated database (`kaushalai_restore_test`) first for verification before production promotion.
4. **No In-Place Overwrite Without Explicit Confirmation:** The restore script strictly rejects targeting `kaushalai` unless `CONFIRM_PRODUCTION_RESTORE=YES_I_AM_SURE` and `--force` are passed.

---

## 2. Backup Execution

### Command
```bash
cd server
node scripts/backup.js [--db <database_name>] [--out <output_directory>]
```

### Examples
- **Backup default database to `./backups`:**
  ```bash
  node scripts/backup.js
  ```
- **Backup isolated test database:**
  ```bash
  node scripts/backup.js --db kaushalai_test --out /var/backups/kaushalai
  ```

### Backup Artifact Structure
Each backup creates a timestamped directory containing:
```
backups/backup_kaushalai_2026-11-13_12-00-00/
├── manifest.json              # Catalog with timestamps, counts, file sizes, and SHA-256 hashes
├── users.json                 # User accounts, hashed credentials, roles, departments
├── competencies.json          # MoSPI competency dictionary & functional areas
├── courses.json               # Course catalogue, modules, and slide content
├── enrollments.json           # Active and completed course enrollments
├── learning_progress.json     # Slide-level and video-level progress tracking
├── quizzes.json               # Course and competency assessment definitions
├── quizattempts.json          # Learner quiz attempts, question responses, scores
├── certificates.json          # Issued digital certificates and verification hashes
├── conversations.json         # AI Tutor chat sessions
└── messages.json              # AI Tutor message history
```

---

## 3. Backup Integrity Verification

Before accepting a backup or promoting it to long-term storage, verify the artifact integrity:
```bash
node -e '
const fs = require("fs");
const crypto = require("crypto");
const path = "./backups/backup_kaushalai_2026-11-13_12-00-00";
const m = JSON.parse(fs.readFileSync(path + "/manifest.json"));
for (const [coll, meta] of Object.entries(m.collections)) {
  const data = fs.readFileSync(path + "/" + meta.file);
  const hash = crypto.createHash("sha256").update(data).digest("hex");
  if (hash !== meta.sha256) throw new Error("Checksum mismatch in " + coll);
}
console.log("Backup integrity verified: 100% SHA-256 match for " + Object.keys(m.collections).length + " collections.");
'
```

---

## 4. Disaster Recovery & Restoration Procedure

### Phase A: Restore into an Isolated Verification Database First
Never restore a backup directly into active production without verifying its contents in an isolated database:

```bash
cd server
node scripts/restore.js --from ./backups/backup_kaushalai_2026-11-13_12-00-00 --target-db kaushalai_restore_verify
```

### Phase B: Validate Isolated Restoration
Inspect collection counts and sample records in `kaushalai_restore_verify`:
```bash
node -e '
const mongoose = require("mongoose");
async function verify() {
  const conn = await mongoose.createConnection("mongodb://127.0.0.1:27017/kaushalai_restore_verify").asPromise();
  const collections = ["users", "courses", "enrollments", "certificates"];
  for (const c of collections) {
    const count = await conn.db.collection(c).countDocuments();
    console.log(c + ": " + count + " records");
  }
  await conn.close();
}
verify();
'
```

### Phase C: Emergency Production Restoration (When Authorized)
If a disaster recovery event requires overwriting production:
1. Ensure the authorized engineering team has obtained administrative sign-off.
2. Set the mandatory safety unlock environment variable:
   ```bash
   export CONFIRM_PRODUCTION_RESTORE=YES_I_AM_SURE
   ```
3. Execute the restore with `--force`:
   ```bash
   node scripts/restore.js --from ./backups/backup_kaushalai_2026-11-13_12-00-00 --target-db kaushalai --force
   ```
4. Unset the safety unlock immediately:
   ```bash
   unset CONFIRM_PRODUCTION_RESTORE
   ```

---

## 5. Recommended Retention Schedule

| Backup Type | Frequency | Retention Period | Storage Location |
| :--- | :--- | :--- | :--- |
| **Hourly Incremental / WAL** | Every 1 hour | 24 hours | Fast local disk / EBS volume |
| **Daily Snapshot** | Every 24 hours (02:00 IST) | 30 days | Encrypted Cloud Object Storage (S3 / GCS bucket) with versioning |
| **Weekly Snapshot** | Sundays at 03:00 IST | 12 weeks | Encrypted Cloud Object Storage (Coldline / Glacier) |
| **Monthly Snapshot** | 1st of every month | 12 months | Off-site institutional archive |
| **Pre-Deployment Snapshot** | Prior to any major release | Indefinite (tagged with release semver) | Deployment release storage |

---

## 6. Access Control & Encryption

- **Encryption in Transit:** All MongoDB connections must enforce TLS/SSL (`ssl=true` or `tls=true` in MongoDB Atlas URI).
- **Encryption at Rest:** Storage volumes hosting backups must have AES-256 disk encryption enabled.
- **RBAC:** Access to backup storage buckets should be restricted to CI/CD service accounts and senior system administrators via IAM role policies.

