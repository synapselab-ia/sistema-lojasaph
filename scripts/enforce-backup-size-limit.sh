#!/usr/bin/env bash
set -euo pipefail

ARCHIVE_PATH="${1:-}"
MAX_BYTES="${BACKUP_MAX_ARCHIVE_BYTES:-300000000}"

if [[ -z "${ARCHIVE_PATH}" || ! -f "${ARCHIVE_PATH}" ]]; then
  echo "::error::Backup archive path is missing or does not exist."
  exit 1
fi

if [[ ! "${MAX_BYTES}" =~ ^[1-9][0-9]*$ ]]; then
  echo "::error::BACKUP_MAX_ARCHIVE_BYTES must be a positive integer."
  exit 1
fi

ARCHIVE_BYTES="$(stat -c '%s' "${ARCHIVE_PATH}")"

if (( ARCHIVE_BYTES > MAX_BYTES )); then
  echo "::error::Backup archive is ${ARCHIVE_BYTES} bytes, above the hard ${MAX_BYTES}-byte upload limit. Off-site upload aborted."
  exit 42
fi

echo "Backup archive size ${ARCHIVE_BYTES} bytes is within the hard ${MAX_BYTES}-byte upload limit."
