#!/usr/bin/env python3
"""Create and verify non-sensitive manifests for Lojasaph backup archives."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Any

FORMAT_NAME = "lojasaph-postgres-logical-backup"
FORMAT_VERSION = 1


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require_text(value: str, field: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field} must not be empty")
    return cleaned


def validate_utc_timestamp(value: str) -> str:
    cleaned = require_text(value, "generated_at_utc")
    if not cleaned.endswith("Z"):
        raise ValueError("generated_at_utc must use UTC and end in Z")
    datetime.fromisoformat(cleaned.removesuffix("Z") + "+00:00")
    return cleaned


def load_manifest(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("backup manifest must be a JSON object")
    return payload


def create_manifest(args: argparse.Namespace) -> None:
    archive = Path(args.archive).resolve()
    output = Path(args.output).resolve()

    if not archive.is_file() or archive.stat().st_size <= 0:
        raise ValueError("archive must exist and be non-empty")

    manifest = {
        "format": FORMAT_NAME,
        "version": FORMAT_VERSION,
        "backup_id": require_text(args.backup_id, "backup_id"),
        "environment": "production",
        "generated_at_utc": validate_utc_timestamp(args.generated_at),
        "coverage": ["postgres"],
        "archive": {
            "name": archive.name,
            "sha256": sha256_file(archive),
            "size_bytes": archive.stat().st_size,
        },
        "source": {
            "platform": "supabase",
            "project_ref": require_text(args.source_project_ref, "source_project_ref"),
        },
        "exporter": {
            "script": "scripts/export-supabase-backup.sh",
            "supabase_cli_version": require_text(
                args.supabase_cli_version, "supabase_cli_version"
            ),
            "git_sha": require_text(args.git_sha, "git_sha"),
        },
        "execution": {
            "repository": require_text(args.repository, "repository"),
            "workflow": require_text(args.workflow, "workflow"),
            "run_id": require_text(args.run_id, "run_id"),
            "run_attempt": require_text(args.run_attempt, "run_attempt"),
            "run_url": require_text(args.run_url, "run_url"),
        },
        "transport": {
            "contract": "s3-compatible",
            "retention_days": 30,
        },
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    output.chmod(0o600)


def verify_manifest(args: argparse.Namespace) -> None:
    archive = Path(args.archive).resolve()
    manifest_path = Path(args.manifest).resolve()

    if not archive.is_file() or archive.stat().st_size <= 0:
        raise ValueError("archive must exist and be non-empty")
    if not manifest_path.is_file() or manifest_path.stat().st_size <= 0:
        raise ValueError("manifest must exist and be non-empty")

    manifest = load_manifest(manifest_path)

    if manifest.get("format") != FORMAT_NAME:
        raise ValueError("unexpected backup manifest format")
    if manifest.get("version") != FORMAT_VERSION:
        raise ValueError("unsupported backup manifest version")
    if manifest.get("environment") != "production":
        raise ValueError("backup manifest environment must be production")

    validate_utc_timestamp(str(manifest.get("generated_at_utc", "")))
    require_text(str(manifest.get("backup_id", "")), "backup_id")

    coverage = manifest.get("coverage")
    if not isinstance(coverage, list) or "postgres" not in coverage:
        raise ValueError("backup manifest must declare postgres coverage")

    archive_meta = manifest.get("archive")
    if not isinstance(archive_meta, dict):
        raise ValueError("backup manifest archive metadata is missing")

    if archive_meta.get("name") != archive.name:
        raise ValueError("archive name does not match backup manifest")

    expected_size = archive_meta.get("size_bytes")
    if not isinstance(expected_size, int) or expected_size != archive.stat().st_size:
        raise ValueError("archive size does not match backup manifest")

    expected_sha = archive_meta.get("sha256")
    actual_sha = sha256_file(archive)
    if not isinstance(expected_sha, str) or expected_sha != actual_sha:
        raise ValueError("archive SHA-256 does not match backup manifest")

    transport = manifest.get("transport")
    if not isinstance(transport, dict) or transport.get("contract") != "s3-compatible":
        raise ValueError("backup manifest transport contract must be s3-compatible")

    print(f"Verified backup manifest for {archive.name}.")


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    subparsers = root.add_subparsers(dest="command", required=True)

    create = subparsers.add_parser("create", help="create a backup manifest")
    create.add_argument("--archive", required=True)
    create.add_argument("--output", required=True)
    create.add_argument("--backup-id", required=True)
    create.add_argument("--generated-at", required=True)
    create.add_argument("--source-project-ref", required=True)
    create.add_argument("--supabase-cli-version", required=True)
    create.add_argument("--git-sha", required=True)
    create.add_argument("--repository", required=True)
    create.add_argument("--workflow", required=True)
    create.add_argument("--run-id", required=True)
    create.add_argument("--run-attempt", required=True)
    create.add_argument("--run-url", required=True)
    create.set_defaults(handler=create_manifest)

    verify = subparsers.add_parser("verify", help="verify an archive against its manifest")
    verify.add_argument("--archive", required=True)
    verify.add_argument("--manifest", required=True)
    verify.set_defaults(handler=verify_manifest)

    return root


def main() -> None:
    args = parser().parse_args()
    try:
        args.handler(args)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        raise SystemExit(f"backup bundle error: {exc}") from exc


if __name__ == "__main__":
    main()
