#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
EXECUTION_REFERENCE="${PROTECTION_EXECUTION_REFERENCE:-}"
PROTECTION_TYPE="${PROTECTION_TYPE:-automatic_database}"
COVERAGE="${PROTECTION_COVERAGE:-postgres}"
PROVIDER="${PROTECTION_PROVIDER:-cloudflare_r2}"
DESTINATION="${PROTECTION_DESTINATION:-s3_compatible_offsite}"

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "::error::Production database connection is not configured for protection-run persistence."
  exit 1
fi

if [[ -z "${EXECUTION_REFERENCE}" ]]; then
  if [[ -z "${GITHUB_RUN_ID:-}" || -z "${GITHUB_RUN_ATTEMPT:-}" ]]; then
    echo "::error::Protection execution reference is unavailable."
    exit 1
  fi
  EXECUTION_REFERENCE="github-actions:${GITHUB_RUN_ID}:${GITHUB_RUN_ATTEMPT}"
fi

if [[ "${EXECUTION_REFERENCE}" == *$'\n'* || "${EXECUTION_REFERENCE}" == *$'\r'* ]]; then
  echo "::error::Protection execution reference contains invalid control characters."
  exit 1
fi

case "${PROTECTION_TYPE}" in
  automatic_database|automatic_storage|manual_export|restore_drill) ;;
  *)
    echo "::error::Unsupported protection run type." >&2
    exit 1
    ;;
esac

case "${COVERAGE}" in
  postgres|storage|organization_export) ;;
  *)
    echo "::error::Unsupported protection coverage." >&2
    exit 1
    ;;
esac

run_psql() {
  if command -v psql >/dev/null 2>&1; then
    psql "${SUPABASE_DB_URL}" "$@"
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "::error::Neither psql nor Docker is available to persist protection state."
    exit 1
  fi

  docker run --rm -i \
    -e SUPABASE_DB_URL \
    postgres:17-alpine \
    sh -c 'exec psql "$SUPABASE_DB_URL" "$@"' sh "$@"
}

case "${MODE}" in
  start)
    run_psql \
      -X \
      -v ON_ERROR_STOP=1 \
      -qAt \
      -v execution_reference="${EXECUTION_REFERENCE}" \
      -v protection_type="${PROTECTION_TYPE}" \
      -v coverage="${COVERAGE}" \
      -v provider="${PROVIDER}" \
      -v destination="${DESTINATION}" <<'SQL'
select private.begin_protection_run(
  :'execution_reference',
  :'protection_type',
  :'coverage',
  :'provider',
  :'destination'
);
SQL
    ;;

  success)
    VALID_COPY_AT="${2:-}"
    SIZE_BYTES="${3:-}"

    if [[ -z "${VALID_COPY_AT}" ]]; then
      echo "::error::Successful protection run requires a valid-copy timestamp."
      exit 1
    fi

    if [[ ! "${SIZE_BYTES}" =~ ^[0-9]+$ ]]; then
      echo "::error::Successful protection run requires a non-negative archive size."
      exit 1
    fi

    run_psql \
      -X \
      -v ON_ERROR_STOP=1 \
      -qAt \
      -v execution_reference="${EXECUTION_REFERENCE}" \
      -v valid_copy_at="${VALID_COPY_AT}" \
      -v size_bytes="${SIZE_BYTES}" <<'SQL'
select private.complete_protection_run(
  :'execution_reference',
  'succeeded',
  :'valid_copy_at'::timestamptz,
  true,
  :'size_bytes'::bigint,
  null
);
SQL
    ;;

  failure)
    ERROR_SUMMARY="${2:-Protection run failed before verified completion.}"
    ERROR_SUMMARY="${ERROR_SUMMARY//$'\n'/ }"
    ERROR_SUMMARY="${ERROR_SUMMARY//$'\r'/ }"
    ERROR_SUMMARY="${ERROR_SUMMARY:0:500}"

    if [[ -z "${ERROR_SUMMARY//[[:space:]]/}" ]]; then
      ERROR_SUMMARY="Protection run failed before verified completion."
    fi

    run_psql \
      -X \
      -v ON_ERROR_STOP=1 \
      -qAt \
      -v execution_reference="${EXECUTION_REFERENCE}" \
      -v error_summary="${ERROR_SUMMARY}" <<'SQL'
select private.complete_protection_run(
  :'execution_reference',
  'failed',
  null,
  false,
  null,
  :'error_summary'
);
SQL
    ;;

  *)
    echo "usage: $0 {start|success <valid-copy-at> <size-bytes>|failure [sanitized-summary]}" >&2
    exit 2
    ;;
esac
