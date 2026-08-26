#!/usr/bin/env bash
set -euo pipefail

AWS_CLI_IMAGE="${BACKUP_AWS_CLI_IMAGE:-amazon/aws-cli:2.36.30}"
BACKUP_S3_REGION="${BACKUP_S3_REGION:-auto}"
BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-production/postgres}"

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Required S3 backup setting is missing: ${name}" >&2
    exit 1
  fi
}

validate_config() {
  require_env BACKUP_S3_ENDPOINT
  require_env BACKUP_S3_BUCKET
  require_env AWS_ACCESS_KEY_ID
  require_env AWS_SECRET_ACCESS_KEY

  if [[ ! "${BACKUP_S3_ENDPOINT}" =~ ^https://[^[:space:]]+$ ]]; then
    echo "BACKUP_S3_ENDPOINT must be an HTTPS endpoint without whitespace." >&2
    exit 1
  fi
  if [[ "${BACKUP_S3_ENDPOINT}" == *"@"* ]]; then
    echo "BACKUP_S3_ENDPOINT must not embed credentials." >&2
    exit 1
  fi
  if [[ "${BACKUP_S3_BUCKET}" == */* || "${BACKUP_S3_BUCKET}" =~ [[:space:]] ]]; then
    echo "BACKUP_S3_BUCKET must be a bucket name, not a path." >&2
    exit 1
  fi

  BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX#/}"
  BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX%/}"
  if [[ -z "${BACKUP_S3_PREFIX}" || "${BACKUP_S3_PREFIX}" == *".."* ]]; then
    echo "BACKUP_S3_PREFIX must be a non-empty, normalized namespace." >&2
    exit 1
  fi
}

base_docker_args() {
  DOCKER_ARGS=(
    run --rm
    -e AWS_ACCESS_KEY_ID
    -e AWS_SECRET_ACCESS_KEY
    -e "AWS_DEFAULT_REGION=${BACKUP_S3_REGION}"
    -e "AWS_REGION=${BACKUP_S3_REGION}"
    -e AWS_EC2_METADATA_DISABLED=true
  )
  if [[ -n "${AWS_SESSION_TOKEN:-}" ]]; then
    DOCKER_ARGS+=(-e AWS_SESSION_TOKEN)
  fi
}

aws_cli() {
  base_docker_args
  docker "${DOCKER_ARGS[@]}" "${AWS_CLI_IMAGE}" "$@"
}

aws_cli_mount_ro() {
  local source_dir="$1"
  shift
  base_docker_args
  docker "${DOCKER_ARGS[@]}" \
    -v "${source_dir}:/data:ro" \
    "${AWS_CLI_IMAGE}" "$@"
}

aws_cli_mount_rw() {
  local target_dir="$1"
  shift
  base_docker_args
  docker "${DOCKER_ARGS[@]}" \
    -v "${target_dir}:/data" \
    "${AWS_CLI_IMAGE}" "$@"
}

object_key() {
  local filename="$1"
  printf '%s/%s' "${BACKUP_S3_PREFIX}" "${filename}"
}

object_uri() {
  local filename="$1"
  printf 's3://%s/%s' "${BACKUP_S3_BUCKET}" "$(object_key "${filename}")"
}

bundle_files() {
  local archive_name="$1"
  printf '%s\n' \
    "${archive_name}" \
    "${archive_name}.sha256" \
    "${archive_name}.manifest.json" \
    "${archive_name}.manifest.json.sha256"
}

check_tooling() {
  docker run --rm "${AWS_CLI_IMAGE}" --version
}

upload_bundle() {
  validate_config
  local source_dir archive_name file remote_hash local_hash
  source_dir="$(cd "$1" && pwd -P)"
  archive_name="$2"

  while IFS= read -r file; do
    if [[ ! -s "${source_dir}/${file}" ]]; then
      echo "Backup bundle file is missing or empty: ${file}" >&2
      exit 1
    fi
  done < <(bundle_files "${archive_name}")

  while IFS= read -r file; do
    aws_cli_mount_ro "${source_dir}" \
      s3 cp "/data/${file}" "$(object_uri "${file}")" \
      --endpoint-url "${BACKUP_S3_ENDPOINT}" \
      --only-show-errors
  done < <(bundle_files "${archive_name}")

  while IFS= read -r file; do
    aws_cli \
      s3api head-object \
      --bucket "${BACKUP_S3_BUCKET}" \
      --key "$(object_key "${file}")" \
      --endpoint-url "${BACKUP_S3_ENDPOINT}" \
      --output json >/dev/null

    local_hash="$(sha256sum "${source_dir}/${file}" | awk '{print $1}')"
    remote_hash="$(
      aws_cli \
        s3 cp "$(object_uri "${file}")" - \
        --endpoint-url "${BACKUP_S3_ENDPOINT}" \
        --only-show-errors \
      | sha256sum \
      | awk '{print $1}'
    )"

    if [[ "${remote_hash}" != "${local_hash}" ]]; then
      echo "Remote S3 verification failed for ${file}." >&2
      exit 1
    fi
  done < <(bundle_files "${archive_name}")

  printf 'Uploaded and re-hashed backup bundle at s3://%s/%s/.\n' \
    "${BACKUP_S3_BUCKET}" "${BACKUP_S3_PREFIX}"
}

download_latest() {
  validate_config
  local target_dir keys latest_key archive_name file
  target_dir="$1"
  install -d -m 700 "${target_dir}"
  target_dir="$(cd "${target_dir}" && pwd -P)"

  keys="$(
    aws_cli \
      s3api list-objects-v2 \
      --bucket "${BACKUP_S3_BUCKET}" \
      --prefix "${BACKUP_S3_PREFIX}/lojasaph-production-" \
      --endpoint-url "${BACKUP_S3_ENDPOINT}" \
      --query 'Contents[].Key' \
      --output text
  )"

  latest_key="$(
    printf '%s\n' "${keys}" \
      | tr '\t' '\n' \
      | sed '/^$/d;/^None$/d' \
      | grep -E '\.tar\.gz$' \
      | sort \
      | tail -n 1 \
      || true
  )"

  if [[ -z "${latest_key}" ]]; then
    echo "No Production PostgreSQL backup archive exists in the configured S3 namespace." >&2
    exit 1
  fi

  archive_name="${latest_key##*/}"
  if [[ "${archive_name}" != lojasaph-production-*.tar.gz ]]; then
    echo "Latest S3 object does not match the expected Lojasaph archive naming contract." >&2
    exit 1
  fi

  while IFS= read -r file; do
    aws_cli_mount_rw "${target_dir}" \
      s3 cp "$(object_uri "${file}")" "/data/${file}" \
      --endpoint-url "${BACKUP_S3_ENDPOINT}" \
      --only-show-errors
  done < <(bundle_files "${archive_name}")

  printf '%s\n' "${archive_name}"
}

usage() {
  cat >&2 <<'EOF'
Usage:
  s3-backup-storage.sh check-tooling
  s3-backup-storage.sh upload-bundle <local-dir> <archive-name>
  s3-backup-storage.sh download-latest <target-dir>
EOF
  exit 2
}

command="${1:-}"
case "${command}" in
  check-tooling)
    [[ "$#" -eq 1 ]] || usage
    check_tooling
    ;;
  upload-bundle)
    [[ "$#" -eq 3 ]] || usage
    upload_bundle "$2" "$3"
    ;;
  download-latest)
    [[ "$#" -eq 2 ]] || usage
    download_latest "$2"
    ;;
  *)
    usage
    ;;
esac
