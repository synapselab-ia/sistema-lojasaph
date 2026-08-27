#!/usr/bin/env bash
set -euo pipefail

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "::error::Required isolated Storage restore setting is missing: ${name}" >&2
    exit 1
  fi
}

validate_loopback_url() {
  local value="$1"
  python - "${value}" <<'PY'
import sys
from urllib.parse import urlparse
value = sys.argv[1]
parsed = urlparse(value)
if parsed.scheme not in {"http", "https"} or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
    raise SystemExit("isolated Storage restore target must use a loopback HTTP(S) endpoint")
PY
}

validate_loopback_db_url() {
  local value="$1"
  python - "${value}" <<'PY'
import sys
from urllib.parse import urlparse
parsed = urlparse(sys.argv[1])
if parsed.scheme not in {"postgres", "postgresql"} or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
    raise SystemExit("isolated Storage restore database must use a loopback PostgreSQL endpoint")
PY
}

storage_request() {
  local method="$1"
  local url="$2"
  shift 2
  curl --fail-with-body --silent --show-error \
    --request "${method}" \
    --header "Authorization: Bearer ${STORAGE_RESTORE_SERVICE_ROLE_KEY}" \
    --header "apikey: ${STORAGE_RESTORE_SERVICE_ROLE_KEY}" \
    "$@" \
    "${url}"
}

create_private_bucket() {
  local bucket="$1"
  local payload
  payload="$(printf '{"id":"%s","name":"%s","public":false}' "${bucket}" "${bucket}")"
  storage_request POST \
    "${STORAGE_RESTORE_API_URL}/storage/v1/bucket" \
    --header "Content-Type: application/json" \
    --data-binary "${payload}" >/dev/null
}

upload_object() {
  local material_root="$1"
  local bucket="$2"
  local key="$3"
  local mime="$4"
  local file="${material_root}/${bucket}/${key}"
  storage_request POST \
    "${STORAGE_RESTORE_API_URL}/storage/v1/object/${bucket}/${key}" \
    --header "Content-Type: ${mime}" \
    --header "x-upsert: false" \
    --data-binary "@${file}" >/dev/null
}

download_object() {
  local verify_root="$1"
  local bucket="$2"
  local key="$3"
  local target="${verify_root}/${bucket}/${key}"
  install -d -m 700 "$(dirname "${target}")"
  storage_request GET \
    "${STORAGE_RESTORE_API_URL}/storage/v1/object/authenticated/${bucket}/${key}" \
    --output "${target}"
  chmod 600 "${target}"
}

write_restored_inventory() {
  local output="$1"
  psql "${STORAGE_RESTORE_DB_URL}" \
    -X -v ON_ERROR_STOP=1 -qAt \
    -c "select coalesce(json_agg(json_build_object('bucket', bucket_id, 'key', name) order by bucket_id, name), '[]'::json)::text from storage.objects where bucket_id = 'finance-attachments';" \
    >"${output}"
  chmod 600 "${output}"
}

run_restore() {
  local manifest="$1"
  local material_root="$2"
  local runtime_dir="$3"

  require_env STORAGE_RESTORE_ISOLATED
  require_env STORAGE_RESTORE_API_URL
  require_env STORAGE_RESTORE_SERVICE_ROLE_KEY
  require_env STORAGE_RESTORE_DB_URL

  if [[ "${STORAGE_RESTORE_ISOLATED}" != "true" ]]; then
    echo "::error::Storage restore refuses to run without STORAGE_RESTORE_ISOLATED=true." >&2
    exit 1
  fi

  STORAGE_RESTORE_API_URL="${STORAGE_RESTORE_API_URL%/}"
  validate_loopback_url "${STORAGE_RESTORE_API_URL}"
  validate_loopback_db_url "${STORAGE_RESTORE_DB_URL}"

  manifest="$(cd "$(dirname "${manifest}")" && pwd -P)/$(basename "${manifest}")"
  material_root="$(cd "${material_root}" && pwd -P)"
  rm -rf "${runtime_dir}"
  install -d -m 700 "${runtime_dir}"
  runtime_dir="$(cd "${runtime_dir}" && pwd -P)"

  python scripts/storage-backup-bundle.py verify-material \
    --manifest "${manifest}" \
    --material-root "${material_root}" \
    --reject-extra

  create_private_bucket "finance-attachments"

  while IFS=$'\t' read -r bucket key _size mime; do
    [[ -n "${bucket}" ]] || continue
    upload_object "${material_root}" "${bucket}" "${key}" "${mime}"
  done < <(python scripts/storage-backup-bundle.py emit-objects --kind manifest --input "${manifest}")

  local inventory="${runtime_dir}/restored-inventory.json"
  local verify_root="${runtime_dir}/restored-material"
  install -d -m 700 "${verify_root}"
  write_restored_inventory "${inventory}"

  python scripts/storage-backup-bundle.py verify-object-set \
    --manifest "${manifest}" \
    --inventory "${inventory}"

  while IFS=$'\t' read -r bucket key _size _mime; do
    [[ -n "${bucket}" ]] || continue
    download_object "${verify_root}" "${bucket}" "${key}"
  done < <(python scripts/storage-backup-bundle.py emit-objects --kind manifest --input "${manifest}")

  python scripts/storage-backup-bundle.py verify-material \
    --manifest "${manifest}" \
    --material-root "${verify_root}" \
    --reject-extra

  echo "Isolated Supabase Storage restore and re-hash verified."
}

usage() {
  cat >&2 <<'EOF'
Usage:
  restore-storage-backup.sh <manifest.json> <snapshot-material-root> <runtime-dir>
EOF
  exit 2
}

[[ "$#" -eq 3 ]] || usage
run_restore "$1" "$2" "$3"
