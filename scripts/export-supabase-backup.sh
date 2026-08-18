#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL must be provided by a secure runtime secret}"
: "${BACKUP_OUTPUT_DIR:?BACKUP_OUTPUT_DIR must point to off-repository temporary storage}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI is required. Install the pinned/approved CLI before running this script." >&2
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd -P)"
mkdir -p "${BACKUP_OUTPUT_DIR}"
OUTPUT_DIR="$(cd "${BACKUP_OUTPUT_DIR}" && pwd -P)"
REPO_ROOT="$(cd "${REPO_ROOT}" && pwd -P)"

case "${OUTPUT_DIR}/" in
  "${REPO_ROOT}/"*)
    echo "Refusing to write database backup inside the Git repository: ${OUTPUT_DIR}" >&2
    exit 1
    ;;
esac

umask 077
ROLES_FILE="${OUTPUT_DIR}/roles.sql"
SCHEMA_FILE="${OUTPUT_DIR}/schema.sql"
DATA_FILE="${OUTPUT_DIR}/data.sql"
CHECKSUM_FILE="${OUTPUT_DIR}/SHA256SUMS"

rm -f "${ROLES_FILE}" "${SCHEMA_FILE}" "${DATA_FILE}" "${CHECKSUM_FILE}"

supabase db dump \
  --db-url "${SUPABASE_DB_URL}" \
  --file "${ROLES_FILE}" \
  --role-only

supabase db dump \
  --db-url "${SUPABASE_DB_URL}" \
  --file "${SCHEMA_FILE}"

supabase db dump \
  --db-url "${SUPABASE_DB_URL}" \
  --file "${DATA_FILE}" \
  --data-only \
  --use-copy \
  --exclude 'storage.buckets_vectors' \
  --exclude 'storage.vector_indexes'

(
  cd "${OUTPUT_DIR}"
  sha256sum roles.sql schema.sql data.sql > SHA256SUMS
  sha256sum --check SHA256SUMS
)

printf 'Logical backup exported to %s\n' "${OUTPUT_DIR}"
printf 'Move/encrypt these files with the approved off-site backup system; do not commit them.\n'
