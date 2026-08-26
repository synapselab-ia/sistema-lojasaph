#!/usr/bin/env bash
set -euo pipefail

BUNDLE_DIR="${1:-}"
RESTORE_DB_URL="${BACKUP_RESTORE_DB_URL:-}"
EXPECTED_PROJECT_REF="${BACKUP_RESTORE_EXPECTED_PROJECT_REF:-}"

if [[ "${BACKUP_RESTORE_ISOLATED:-}" != "true" ]]; then
  echo "::error::Restore helper requires BACKUP_RESTORE_ISOLATED=true." >&2
  exit 1
fi

if [[ -z "${BUNDLE_DIR}" || ! -d "${BUNDLE_DIR}" ]]; then
  echo "::error::A valid extracted backup bundle directory is required." >&2
  exit 1
fi

if [[ -z "${RESTORE_DB_URL}" ]]; then
  echo "::error::BACKUP_RESTORE_DB_URL is required." >&2
  exit 1
fi

if [[ -z "${EXPECTED_PROJECT_REF}" ]]; then
  echo "::error::BACKUP_RESTORE_EXPECTED_PROJECT_REF is required." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "::error::PostgreSQL client tooling is required for restore verification." >&2
  exit 1
fi

python - "${RESTORE_DB_URL}" <<'PY'
from __future__ import annotations

import sys
from urllib.parse import urlparse

value = sys.argv[1]
parsed = urlparse(value)

if parsed.scheme not in {"postgres", "postgresql"}:
    raise SystemExit("restore target must use a PostgreSQL connection URL")

if parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
    raise SystemExit("restore target must be a loopback-only isolated PostgreSQL instance")

if not parsed.path or parsed.path == "/":
    raise SystemExit("restore target database name is missing")
PY

BUNDLE_DIR="$(cd "${BUNDLE_DIR}" && pwd -P)"
ROLES_FILE="${BUNDLE_DIR}/roles.sql"
SCHEMA_FILE="${BUNDLE_DIR}/schema.sql"
DATA_FILE="${BUNDLE_DIR}/data.sql"
CHECKSUM_FILE="${BUNDLE_DIR}/SHA256SUMS"
METADATA_FILE="${BUNDLE_DIR}/BACKUP_METADATA.txt"

for required in \
  "${ROLES_FILE}" \
  "${SCHEMA_FILE}" \
  "${DATA_FILE}" \
  "${CHECKSUM_FILE}" \
  "${METADATA_FILE}"; do
  if [[ ! -s "${required}" ]]; then
    echo "::error::Required restore input is missing or empty: $(basename "${required}")" >&2
    exit 1
  fi
done

(
  cd "${BUNDLE_DIR}"
  sha256sum --check SHA256SUMS >/dev/null
)

if ! grep -Fqx "project_ref=${EXPECTED_PROJECT_REF}" "${METADATA_FILE}"; then
  echo "::error::Backup metadata project reference does not match the expected Production source." >&2
  exit 1
fi

if ! grep -Fqx "coverage=postgres" "${METADATA_FILE}"; then
  echo "::error::Backup metadata does not declare PostgreSQL coverage." >&2
  exit 1
fi

if ! grep -Fqx "format=lojasaph-postgres-logical-backup-v1" "${METADATA_FILE}"; then
  echo "::error::Backup metadata format is unsupported." >&2
  exit 1
fi

# Supabase logical dumps expect the standard public schema to exist because
# extensions such as pgcrypto may be installed into it before application DDL.
# A normal Supabase target already has this schema; the IF NOT EXISTS keeps the
# same precondition explicit for minimal isolated CI databases.
psql \
  --no-psqlrc \
  --quiet \
  --variable ON_ERROR_STOP=1 \
  --dbname "${RESTORE_DB_URL}" \
  --command 'CREATE SCHEMA IF NOT EXISTS public'

# Follow Supabase's logical restore sequence in one transaction. Using
# session_replication_role=replica is intentional: pg_dump warns about the
# self-referential stock_movements/payments foreign keys, and COPY order cannot
# satisfy those cycles. The post-restore smoke test independently rechecks every
# public foreign-key relationship so suppressed trigger checks cannot hide loss.
psql \
  --no-psqlrc \
  --quiet \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file "${ROLES_FILE}" \
  --file "${SCHEMA_FILE}" \
  --command 'SET session_replication_role = replica' \
  --file "${DATA_FILE}" \
  --dbname "${RESTORE_DB_URL}"

psql \
  --no-psqlrc \
  --quiet \
  --variable ON_ERROR_STOP=1 \
  --dbname "${RESTORE_DB_URL}" \
  --file "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)/supabase/tests/production_bundle_restore.sql"

echo "Production PostgreSQL bundle restored and validated in an isolated target."
