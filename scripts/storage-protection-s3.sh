#!/usr/bin/env bash
set -euo pipefail

AWS_CLI_IMAGE="${BACKUP_AWS_CLI_IMAGE:-amazon/aws-cli:2.36.30}"
DEST_REGION="${BACKUP_S3_REGION:-auto}"
DEST_PREFIX_BASE="${STORAGE_BACKUP_DEST_PREFIX:-production/storage}"
ALLOW_BUCKETS="${STORAGE_BACKUP_ALLOW_BUCKETS:-finance-attachments}"

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "::error::Required Storage protection setting is missing: ${name}" >&2
    exit 1
  fi
}

validate_source_endpoint() {
  local value="${STORAGE_SOURCE_S3_ENDPOINT}"
  if [[ "${value}" =~ ^https://[^[:space:]]+$ && "${value}" != *"@"* ]]; then
    return
  fi
  if [[ "${STORAGE_SOURCE_ALLOW_LOOPBACK_HTTP:-}" == "true" \
        && "${value}" =~ ^http://(127\.0\.0\.1|localhost):[0-9]+/storage/v1/s3$ ]]; then
    return
  fi
  echo "::error::STORAGE_SOURCE_S3_ENDPOINT must be HTTPS; loopback HTTP is allowed only for isolated CI." >&2
  exit 1
}

validate_dest_endpoint() {
  local value="${BACKUP_S3_ENDPOINT}"
  if [[ ! "${value}" =~ ^https://[^[:space:]]+$ || "${value}" == *"@"* ]]; then
    echo "::error::BACKUP_S3_ENDPOINT must be an HTTPS endpoint without embedded credentials." >&2
    exit 1
  fi
}

validate_positive_int() {
  local name="$1"
  local value="${!name:-}"
  if [[ ! "${value}" =~ ^[1-9][0-9]*$ ]]; then
    echo "::error::${name} must be a positive integer." >&2
    exit 1
  fi
}

validate_snapshot_config() {
  local name
  for name in \
    SUPABASE_DB_URL \
    STORAGE_SOURCE_PROJECT_REF \
    STORAGE_SOURCE_S3_ENDPOINT \
    STORAGE_SOURCE_S3_REGION \
    STORAGE_SOURCE_S3_ACCESS_KEY_ID \
    STORAGE_SOURCE_S3_SECRET_ACCESS_KEY \
    STORAGE_BACKUP_ID \
    STORAGE_BACKUP_MAX_OBJECTS \
    STORAGE_BACKUP_MAX_TOTAL_BYTES \
    STORAGE_BACKUP_MAX_OBJECT_BYTES; do
    require_env "${name}"
  done

  validate_source_endpoint
  validate_positive_int STORAGE_BACKUP_MAX_OBJECTS
  validate_positive_int STORAGE_BACKUP_MAX_TOTAL_BYTES
  validate_positive_int STORAGE_BACKUP_MAX_OBJECT_BYTES

  if [[ "${ALLOW_BUCKETS}" != "finance-attachments" ]]; then
    echo "::error::Initial Storage protection allowlist must be exactly finance-attachments." >&2
    exit 1
  fi
  if [[ "${DEST_PREFIX_BASE}" != "production/storage" ]]; then
    echo "::error::Storage backup destination namespace must remain production/storage." >&2
    exit 1
  fi
  if [[ ! "${STORAGE_BACKUP_ID}" =~ ^storage-[0-9]{8}T[0-9]{6}Z-[0-9]+-[0-9]+$ ]]; then
    echo "::error::STORAGE_BACKUP_ID does not match the immutable run-id contract." >&2
    exit 1
  fi
}

validate_destination_config() {
  local name
  for name in \
    BACKUP_S3_ENDPOINT \
    BACKUP_S3_BUCKET \
    STORAGE_DEST_S3_ACCESS_KEY_ID \
    STORAGE_DEST_S3_SECRET_ACCESS_KEY; do
    require_env "${name}"
  done

  validate_dest_endpoint
  if [[ "${BACKUP_S3_BUCKET}" == */* || "${BACKUP_S3_BUCKET}" =~ [[:space:]] ]]; then
    echo "::error::BACKUP_S3_BUCKET must be a bucket name, not a path." >&2
    exit 1
  fi
}

base_source_args() {
  SOURCE_DOCKER_ARGS=(
    run --rm
    -e "AWS_ACCESS_KEY_ID=${STORAGE_SOURCE_S3_ACCESS_KEY_ID}"
    -e "AWS_SECRET_ACCESS_KEY=${STORAGE_SOURCE_S3_SECRET_ACCESS_KEY}"
    -e "AWS_DEFAULT_REGION=${STORAGE_SOURCE_S3_REGION}"
    -e "AWS_REGION=${STORAGE_SOURCE_S3_REGION}"
    -e AWS_EC2_METADATA_DISABLED=true
  )
  if [[ "${STORAGE_SOURCE_ALLOW_LOOPBACK_HTTP:-}" == "true" ]]; then
    SOURCE_DOCKER_ARGS+=(--network host)
  fi
  if [[ -n "${STORAGE_SOURCE_S3_SESSION_TOKEN:-}" ]]; then
    SOURCE_DOCKER_ARGS+=(-e "AWS_SESSION_TOKEN=${STORAGE_SOURCE_S3_SESSION_TOKEN}")
  fi
}

base_dest_args() {
  DEST_DOCKER_ARGS=(
    run --rm
    -e "AWS_ACCESS_KEY_ID=${STORAGE_DEST_S3_ACCESS_KEY_ID}"
    -e "AWS_SECRET_ACCESS_KEY=${STORAGE_DEST_S3_SECRET_ACCESS_KEY}"
    -e "AWS_DEFAULT_REGION=${DEST_REGION}"
    -e "AWS_REGION=${DEST_REGION}"
    -e AWS_EC2_METADATA_DISABLED=true
  )
  if [[ -n "${STORAGE_DEST_S3_SESSION_TOKEN:-}" ]]; then
    DEST_DOCKER_ARGS+=(-e "AWS_SESSION_TOKEN=${STORAGE_DEST_S3_SESSION_TOKEN}")
  fi
}

aws_source() {
  base_source_args
  docker "${SOURCE_DOCKER_ARGS[@]}" "${AWS_CLI_IMAGE}" "$@"
}

aws_source_mount_rw() {
  local target_dir="$1"
  shift
  base_source_args
  docker "${SOURCE_DOCKER_ARGS[@]}" \
    -v "${target_dir}:/data" \
    "${AWS_CLI_IMAGE}" "$@"
}

aws_dest() {
  base_dest_args
  docker "${DEST_DOCKER_ARGS[@]}" "${AWS_CLI_IMAGE}" "$@"
}

aws_dest_mount_ro() {
  local source_dir="$1"
  shift
  base_dest_args
  docker "${DEST_DOCKER_ARGS[@]}" \
    -v "${source_dir}:/data:ro" \
    "${AWS_CLI_IMAGE}" "$@"
}

query_attachment_metadata() {
  local output="$1"
  local sql
  sql=$(cat <<'SQL'
select coalesce(
  json_agg(
    json_build_object(
      'attachment_id', id::text,
      'organization_id', organization_id::text,
      'payable_document_id', payable_document_id::text,
      'storage_bucket', storage_bucket,
      'storage_key', storage_key,
      'mime_type', mime_type,
      'size_bytes', size_bytes,
      'checksum_sha256', checksum_sha256,
      'created_at', to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    )
    order by storage_bucket, storage_key
  ),
  '[]'::json
)::text
from public.finance_attachments;
SQL
)

  if command -v psql >/dev/null 2>&1; then
    psql "${SUPABASE_DB_URL}" -X -v ON_ERROR_STOP=1 -qAt -c "${sql}" >"${output}"
  else
    docker run --rm -i \
      -e SUPABASE_DB_URL \
      postgres:17-alpine \
      sh -c 'psql "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -qAt' \
      <<<"${sql}" >"${output}"
  fi

  python - "${output}" <<'PY'
import json
import sys
from pathlib import Path
path = Path(sys.argv[1])
payload = json.loads(path.read_text(encoding="utf-8"))
if not isinstance(payload, list):
    raise SystemExit("finance attachment metadata query did not return a JSON array")
path.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
path.chmod(0o600)
PY
}

bucket_present() {
  local bucket="$1"
  local bucket_list="$2"
  python - "${bucket}" "${bucket_list}" <<'PY'
import json
import sys
from pathlib import Path
bucket = sys.argv[1]
payload = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))
raise SystemExit(0 if bucket in payload else 1)
PY
}

download_source_object() {
  local material_root="$1"
  local bucket="$2"
  local key="$3"
  local target="${material_root}/${bucket}/${key}"
  local staging="${target}.container-download"
  local mount_root

  install -d -m 700 "$(dirname "${target}")"
  rm -f "${target}" "${staging}"
  mount_root="$(cd "${material_root}" && pwd -P)"

  # The AWS CLI container writes mounted files as root. Download to a staging
  # path, then materialize a runner-owned 0600 copy inside the already-private
  # runtime tree. This keeps Production and CI behavior identical.
  aws_source_mount_rw "${mount_root}" \
    s3 cp "s3://${bucket}/${key}" "/data/${bucket}/${key}.container-download" \
    --endpoint-url "${STORAGE_SOURCE_S3_ENDPOINT}" \
    --only-show-errors

  if [[ ! -f "${staging}" ]]; then
    echo "::error::Supabase Storage download did not materialize the expected object." >&2
    exit 1
  fi
  install -m 600 "${staging}" "${target}"
  rm -f "${staging}"
}

upload_dest_verified() {
  local local_file="$1"
  local remote_key="$2"
  local local_dir local_name local_hash remote_hash
  local_dir="$(cd "$(dirname "${local_file}")" && pwd -P)"
  local_name="$(basename "${local_file}")"

  aws_dest_mount_ro "${local_dir}" \
    s3 cp "/data/${local_name}" "s3://${BACKUP_S3_BUCKET}/${remote_key}" \
    --endpoint-url "${BACKUP_S3_ENDPOINT}" \
    --only-show-errors

  aws_dest \
    s3api head-object \
    --bucket "${BACKUP_S3_BUCKET}" \
    --key "${remote_key}" \
    --endpoint-url "${BACKUP_S3_ENDPOINT}" \
    --output json >/dev/null

  local_hash="$(sha256sum "${local_file}" | awk '{print $1}')"
  remote_hash="$(
    aws_dest \
      s3 cp "s3://${BACKUP_S3_BUCKET}/${remote_key}" - \
      --endpoint-url "${BACKUP_S3_ENDPOINT}" \
      --only-show-errors \
    | sha256sum \
    | awk '{print $1}'
  )"

  if [[ "${remote_hash}" != "${local_hash}" ]]; then
    echo "::error::Off-site Storage object re-hash failed." >&2
    exit 1
  fi
}

build_snapshot() {
  validate_snapshot_config

  local runtime_dir="$1"
  rm -rf "${runtime_dir}"
  install -d -m 700 "${runtime_dir}"
  runtime_dir="$(cd "${runtime_dir}" && pwd -P)"

  local metadata="${runtime_dir}/finance-attachments.json"
  local buckets="${runtime_dir}/source-buckets.json"
  local object_listing="${runtime_dir}/finance-attachments-objects.json"
  local plan="${runtime_dir}/transfer-plan.json"
  local material="${runtime_dir}/source-material"
  local manifest="${runtime_dir}/manifest.json"
  local manifest_checksum="${runtime_dir}/manifest.json.sha256"
  local generated_at namespace
  install -d -m 700 "${material}"

  query_attachment_metadata "${metadata}"

  aws_source \
    s3api list-buckets \
    --endpoint-url "${STORAGE_SOURCE_S3_ENDPOINT}" \
    --query 'Buckets[].Name' \
    --output json >"${buckets}"

  local object_args=()
  if bucket_present "finance-attachments" "${buckets}"; then
    aws_source \
      s3api list-objects-v2 \
      --bucket "finance-attachments" \
      --endpoint-url "${STORAGE_SOURCE_S3_ENDPOINT}" \
      --output json >"${object_listing}"
    object_args+=(--object-list "finance-attachments=${object_listing}")
  fi

  python scripts/storage-backup-bundle.py prepare \
    --metadata "${metadata}" \
    --bucket-list "${buckets}" \
    "${object_args[@]}" \
    --allow-buckets "${ALLOW_BUCKETS}" \
    --max-objects "${STORAGE_BACKUP_MAX_OBJECTS}" \
    --max-total-bytes "${STORAGE_BACKUP_MAX_TOTAL_BYTES}" \
    --max-object-bytes "${STORAGE_BACKUP_MAX_OBJECT_BYTES}" \
    --output "${plan}"

  while IFS=$'\t' read -r bucket key _size _mime; do
    [[ -n "${bucket}" ]] || continue
    download_source_object "${material}" "${bucket}" "${key}"
  done < <(python scripts/storage-backup-bundle.py emit-objects --kind plan --input "${plan}")

  generated_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  namespace="${DEST_PREFIX_BASE}/runs/${STORAGE_BACKUP_ID}"

  python scripts/storage-backup-bundle.py create \
    --plan "${plan}" \
    --material-root "${material}" \
    --output "${manifest}" \
    --backup-id "${STORAGE_BACKUP_ID}" \
    --generated-at "${generated_at}" \
    --source-project-ref "${STORAGE_SOURCE_PROJECT_REF}" \
    --destination-namespace "${namespace}"

  (
    cd "${runtime_dir}"
    sha256sum manifest.json >manifest.json.sha256
    sha256sum --check manifest.json.sha256 >/dev/null
  )
  chmod 600 "${manifest_checksum}"

  python scripts/storage-backup-bundle.py verify-material \
    --manifest "${manifest}" \
    --material-root "${material}" \
    --reject-extra >&2

  printf '%s\n' "${manifest}"
}

upload_snapshot() {
  local runtime_dir="$1"
  validate_destination_config
  runtime_dir="$(cd "${runtime_dir}" && pwd -P)"

  local manifest="${runtime_dir}/manifest.json"
  local manifest_checksum="${runtime_dir}/manifest.json.sha256"
  local material="${runtime_dir}/source-material"
  local namespace
  namespace="$(
    python - "${manifest}" <<'PY'
import json
import sys
from pathlib import Path
payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
print(payload["destination"]["namespace"])
PY
  )"

  python scripts/storage-backup-bundle.py verify-material \
    --manifest "${manifest}" \
    --material-root "${material}" \
    --reject-extra >&2

  while IFS=$'\t' read -r bucket key _size _mime; do
    [[ -n "${bucket}" ]] || continue
    upload_dest_verified \
      "${material}/${bucket}/${key}" \
      "${namespace}/objects/${bucket}/${key}"
  done < <(python scripts/storage-backup-bundle.py emit-objects --kind manifest --input "${manifest}")

  upload_dest_verified "${manifest}" "${namespace}/manifest.json"
  upload_dest_verified "${manifest_checksum}" "${namespace}/manifest.json.sha256"
}

run_backup() {
  local runtime_dir="$1"
  local manifest
  manifest="$(build_snapshot "${runtime_dir}")"
  upload_snapshot "${runtime_dir}"
  printf '%s\n' "${manifest}"
}

check_tooling() {
  docker run --rm "${AWS_CLI_IMAGE}" --version
  python -m py_compile scripts/storage-backup-bundle.py
  bash -n "$0"
}

usage() {
  cat >&2 <<'EOF'
Usage:
  storage-protection-s3.sh check-tooling
  storage-protection-s3.sh snapshot <runtime-dir>
  storage-protection-s3.sh upload <runtime-dir>
  storage-protection-s3.sh run <runtime-dir>
EOF
  exit 2
}

case "${1:-}" in
  check-tooling)
    [[ "$#" -eq 1 ]] || usage
    check_tooling
    ;;
  snapshot)
    [[ "$#" -eq 2 ]] || usage
    build_snapshot "$2"
    ;;
  upload)
    [[ "$#" -eq 2 ]] || usage
    upload_snapshot "$2"
    ;;
  run)
    [[ "$#" -eq 2 ]] || usage
    run_backup "$2"
    ;;
  *)
    usage
    ;;
esac
