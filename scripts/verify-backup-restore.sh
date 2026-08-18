#!/usr/bin/env bash
set -euo pipefail

SOURCE_DB="${PGDATABASE:-lojasaph}"
RESTORE_DB="${BACKUP_RESTORE_DB:-lojasaph_restore}"

if [[ "${SOURCE_DB}" == "${RESTORE_DB}" ]]; then
  echo "BACKUP_RESTORE_DB must differ from PGDATABASE" >&2
  exit 1
fi

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/lojasaph-backup-restore.XXXXXX")"
DUMP_FILE="${WORKDIR}/lojasaph.dump"
CHECKSUM_FILE="${DUMP_FILE}.sha256"

cleanup() {
  PGDATABASE=postgres dropdb --if-exists "${RESTORE_DB}" >/dev/null 2>&1 || true
  rm -rf "${WORKDIR}"
}
trap cleanup EXIT

echo "Creating logical backup from ${SOURCE_DB}"
pg_dump \
  --format=custom \
  --no-owner \
  --dbname="${SOURCE_DB}" \
  --file="${DUMP_FILE}"

test -s "${DUMP_FILE}"
chmod 600 "${DUMP_FILE}"
sha256sum "${DUMP_FILE}" > "${CHECKSUM_FILE}"
(
  cd "${WORKDIR}"
  sha256sum --check "$(basename "${CHECKSUM_FILE}")"
)

echo "Restoring logical backup into isolated database ${RESTORE_DB}"
PGDATABASE=postgres dropdb --if-exists "${RESTORE_DB}"
PGDATABASE=postgres createdb --template=template0 "${RESTORE_DB}"

pg_restore \
  --exit-on-error \
  --no-owner \
  --dbname="${RESTORE_DB}" \
  "${DUMP_FILE}"

PGDATABASE="${RESTORE_DB}" psql \
  -v ON_ERROR_STOP=1 \
  -f supabase/tests/backup_restore.sql

echo "backup restore verification passed"
