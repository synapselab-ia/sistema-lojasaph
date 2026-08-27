#!/usr/bin/env python3
"""Build and verify versioned manifests for Lojasaph Supabase Storage protection."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

FORMAT_NAME = "lojasaph-storage-backup-v1"
FORMAT_VERSION = 1
FINANCE_BUCKET = "finance-attachments"
PRODUCT_MAX_OBJECT_BYTES = 10 * 1024 * 1024
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
BUCKET_RE = re.compile(r"^[a-z0-9][a-z0-9.-]{0,62}$")


def fail(message: str) -> None:
    raise ValueError(message)


def require_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        fail(f"{field} must be a non-empty string")
    return value.strip()


def require_positive_int(value: Any, field: str) -> int:
    if isinstance(value, bool):
        fail(f"{field} must be a positive integer")
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be a positive integer") from exc
    if parsed <= 0:
        fail(f"{field} must be a positive integer")
    return parsed


def validate_utc(value: Any, field: str) -> str:
    text = require_text(value, field)
    if not text.endswith("Z"):
        fail(f"{field} must be UTC and end in Z")
    datetime.fromisoformat(text[:-1] + "+00:00")
    return text


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    path.chmod(0o600)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_allowlist(raw: str) -> list[str]:
    buckets: list[str] = []
    for item in raw.split(","):
        bucket = item.strip()
        if not bucket:
            continue
        if not BUCKET_RE.fullmatch(bucket):
            fail("bucket allowlist contains an invalid bucket name")
        if bucket not in buckets:
            buckets.append(bucket)
    if buckets != [FINANCE_BUCKET]:
        fail(f"initial Storage protection allowlist must be exactly {FINANCE_BUCKET}")
    return buckets


def parse_bucket_list(path: Path) -> list[str]:
    payload = load_json(path)
    if not isinstance(payload, list):
        fail("source bucket list must be a JSON array")
    buckets: list[str] = []
    for item in payload:
        name = require_text(item, "source bucket name")
        if not BUCKET_RE.fullmatch(name):
            fail("source bucket list contains an invalid bucket name")
        if name in buckets:
            fail("source bucket list contains duplicates")
        buckets.append(name)
    return sorted(buckets)


def parse_object_list(spec: str) -> tuple[str, Path]:
    if "=" not in spec:
        fail("--object-list must use bucket=path")
    bucket, path = spec.split("=", 1)
    bucket = bucket.strip()
    if not BUCKET_RE.fullmatch(bucket):
        fail("--object-list contains an invalid bucket name")
    return bucket, Path(path).resolve()


def normalize_s3_objects(bucket: str, path: Path) -> list[dict[str, Any]]:
    payload = load_json(path)
    if not isinstance(payload, dict):
        fail(f"S3 object listing for {bucket} must be a JSON object")
    contents = payload.get("Contents", [])
    if contents is None:
        contents = []
    if not isinstance(contents, list):
        fail(f"S3 object listing for {bucket} has invalid Contents")
    objects: list[dict[str, Any]] = []
    for item in contents:
        if not isinstance(item, dict):
            fail(f"S3 object listing for {bucket} contains an invalid entry")
        key = require_text(item.get("Key"), "S3 object key")
        size = item.get("Size")
        if isinstance(size, bool) or not isinstance(size, int) or size < 0:
            fail("S3 object size must be a non-negative integer")
        last_modified = item.get("LastModified")
        if last_modified is not None and not isinstance(last_modified, str):
            fail("S3 LastModified must be text when present")
        objects.append(
            {
                "bucket": bucket,
                "key": key,
                "size_bytes": size,
                "source_updated_at": last_modified,
            }
        )
    return objects


def canonical_uuid(value: Any, field: str) -> str:
    text = require_text(value, field)
    try:
        parsed = uuid.UUID(text)
    except ValueError as exc:
        raise ValueError(f"{field} must be a UUID") from exc
    canonical = str(parsed)
    if text.lower() != canonical:
        fail(f"{field} must use canonical UUID text")
    return canonical


def normalize_metadata(path: Path, allowed_buckets: set[str]) -> list[dict[str, Any]]:
    payload = load_json(path)
    if not isinstance(payload, list):
        fail("finance attachment metadata must be a JSON array")
    normalized: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    seen_objects: set[tuple[str, str]] = set()

    for item in payload:
        if not isinstance(item, dict):
            fail("finance attachment metadata contains an invalid row")
        attachment_id = canonical_uuid(item.get("attachment_id"), "attachment_id")
        organization_id = canonical_uuid(item.get("organization_id"), "organization_id")
        payable_document_id = canonical_uuid(
            item.get("payable_document_id"), "payable_document_id"
        )
        bucket = require_text(item.get("storage_bucket"), "storage_bucket")
        if bucket not in allowed_buckets:
            fail("finance attachment metadata references an unsupported bucket")
        if bucket != FINANCE_BUCKET:
            fail("finance attachment metadata references a non-canonical bucket")

        key = require_text(item.get("storage_key"), "storage_key")
        expected_key = f"{organization_id}/{payable_document_id}/{attachment_id}"
        if key != expected_key:
            fail("finance attachment metadata has a non-canonical storage key")

        size = item.get("size_bytes")
        if isinstance(size, bool) or not isinstance(size, int) or not (1 <= size <= PRODUCT_MAX_OBJECT_BYTES):
            fail("finance attachment metadata has an invalid object size")

        checksum = require_text(item.get("checksum_sha256"), "checksum_sha256")
        if not SHA256_RE.fullmatch(checksum):
            fail("finance attachment metadata has an invalid SHA-256")

        mime_type = require_text(item.get("mime_type"), "mime_type")
        created_at = item.get("created_at")
        if created_at is not None:
            created_at = require_text(created_at, "created_at")

        identity = (bucket, key)
        if attachment_id in seen_ids or identity in seen_objects:
            fail("finance attachment metadata contains duplicate identities")
        seen_ids.add(attachment_id)
        seen_objects.add(identity)

        normalized.append(
            {
                "attachment_id": attachment_id,
                "organization_id": organization_id,
                "payable_document_id": payable_document_id,
                "bucket": bucket,
                "key": key,
                "mime_type": mime_type,
                "size_bytes": size,
                "expected_sha256": checksum,
                "business_created_at": created_at,
            }
        )
    return sorted(normalized, key=lambda row: (row["bucket"], row["key"]))


def prepare_plan(args: argparse.Namespace) -> None:
    allowlist = parse_allowlist(args.allow_buckets)
    allowed = set(allowlist)
    max_objects = require_positive_int(args.max_objects, "max_objects")
    max_total_bytes = require_positive_int(args.max_total_bytes, "max_total_bytes")
    max_object_bytes = require_positive_int(args.max_object_bytes, "max_object_bytes")

    source_buckets = parse_bucket_list(Path(args.bucket_list).resolve())
    unexpected = sorted(set(source_buckets) - allowed)
    if unexpected:
        fail("source contains an unclassified Storage bucket")

    metadata = normalize_metadata(Path(args.metadata).resolve(), allowed)

    object_specs: dict[str, Path] = {}
    for spec in args.object_list:
        bucket, path = parse_object_list(spec)
        if bucket in object_specs:
            fail("duplicate --object-list bucket")
        object_specs[bucket] = path

    for bucket in object_specs:
        if bucket not in source_buckets:
            fail("object listing was provided for a bucket absent from source bucket inventory")
        if bucket not in allowed:
            fail("object listing was provided for an unsupported bucket")

    source_objects: list[dict[str, Any]] = []
    for bucket in source_buckets:
        if bucket not in allowed:
            continue
        listing = object_specs.get(bucket)
        if listing is None:
            fail("source bucket exists but its object inventory was not provided")
        source_objects.extend(normalize_s3_objects(bucket, listing))

    seen_source: set[tuple[str, str]] = set()
    for item in source_objects:
        identity = (item["bucket"], item["key"])
        if identity in seen_source:
            fail("source Storage inventory contains duplicate object keys")
        seen_source.add(identity)

    if len(source_objects) > max_objects:
        fail("Storage object-count guardrail exceeded")

    total_bytes = sum(int(item["size_bytes"]) for item in source_objects)
    if total_bytes > max_total_bytes:
        fail("Storage total-byte guardrail exceeded")
    if any(int(item["size_bytes"]) > max_object_bytes for item in source_objects):
        fail("Storage per-object byte guardrail exceeded")

    metadata_map = {(row["bucket"], row["key"]): row for row in metadata}
    source_map = {(row["bucket"], row["key"]): row for row in source_objects}

    missing = sorted(set(metadata_map) - set(source_map))
    extra = sorted(set(source_map) - set(metadata_map))
    if missing:
        fail("Storage inventory is missing an object referenced by finance attachment metadata")
    if extra:
        fail("Storage inventory contains an object without finance attachment metadata")

    plan_objects: list[dict[str, Any]] = []
    for identity in sorted(metadata_map):
        meta = metadata_map[identity]
        source = source_map[identity]
        if source["size_bytes"] != meta["size_bytes"]:
            fail("Storage object size differs from finance attachment metadata")
        plan_objects.append(
            {
                **meta,
                "source_updated_at": source.get("source_updated_at"),
            }
        )

    plan = {
        "format": "lojasaph-storage-backup-plan-v1",
        "allowlisted_buckets": allowlist,
        "present_source_buckets": source_buckets,
        "object_count": len(plan_objects),
        "total_bytes": total_bytes,
        "guardrails": {
            "max_objects": max_objects,
            "max_total_bytes": max_total_bytes,
            "max_object_bytes": max_object_bytes,
        },
        "objects": plan_objects,
    }
    write_json(Path(args.output).resolve(), plan)


def load_plan(path: Path) -> dict[str, Any]:
    payload = load_json(path)
    if not isinstance(payload, dict) or payload.get("format") != "lojasaph-storage-backup-plan-v1":
        fail("unexpected Storage backup plan format")
    objects = payload.get("objects")
    if not isinstance(objects, list):
        fail("Storage backup plan objects are missing")
    return payload


def object_material_path(root: Path, bucket: str, key: str) -> Path:
    return root / bucket / Path(*key.split("/"))


def create_manifest(args: argparse.Namespace) -> None:
    plan = load_plan(Path(args.plan).resolve())
    material_root = Path(args.material_root).resolve()
    output = Path(args.output).resolve()

    manifest_objects: list[dict[str, Any]] = []
    for item in plan["objects"]:
        if not isinstance(item, dict):
            fail("Storage backup plan contains an invalid object")
        bucket = require_text(item.get("bucket"), "bucket")
        key = require_text(item.get("key"), "key")
        path = object_material_path(material_root, bucket, key)
        if not path.is_file():
            fail("source Storage material is missing an expected object")
        expected_size = item.get("size_bytes")
        if path.stat().st_size != expected_size:
            fail("source Storage object size changed during transfer")
        actual_sha = sha256_file(path)
        if actual_sha != item.get("expected_sha256"):
            fail("source Storage object SHA-256 differs from business metadata")
        manifest_objects.append(
            {
                "bucket": bucket,
                "key": key,
                "size_bytes": expected_size,
                "sha256": actual_sha,
                "mime_type": item.get("mime_type"),
                "source_updated_at": item.get("source_updated_at"),
                "business_created_at": item.get("business_created_at"),
                "attachment_id": item.get("attachment_id"),
                "organization_id": item.get("organization_id"),
                "payable_document_id": item.get("payable_document_id"),
            }
        )

    generated_at = validate_utc(args.generated_at, "generated_at_utc")
    manifest = {
        "format": FORMAT_NAME,
        "version": FORMAT_VERSION,
        "backup_id": require_text(args.backup_id, "backup_id"),
        "environment": "production",
        "coverage": "storage",
        "generated_at_utc": generated_at,
        "source": {
            "platform": "supabase_storage",
            "project_ref": require_text(args.source_project_ref, "source_project_ref"),
        },
        "destination": {
            "provider": "cloudflare_r2",
            "namespace": require_text(args.destination_namespace, "destination_namespace"),
        },
        "protected_buckets": plan.get("allowlisted_buckets"),
        "object_count": len(manifest_objects),
        "total_bytes": sum(int(item["size_bytes"]) for item in manifest_objects),
        "objects": manifest_objects,
        "tooling": {
            "script": "scripts/storage-backup-bundle.py",
            "version": FORMAT_VERSION,
        },
    }
    write_json(output, manifest)


def load_manifest(path: Path) -> dict[str, Any]:
    payload = load_json(path)
    if not isinstance(payload, dict):
        fail("Storage backup manifest must be a JSON object")
    if payload.get("format") != FORMAT_NAME or payload.get("version") != FORMAT_VERSION:
        fail("unsupported Storage backup manifest format")
    if payload.get("environment") != "production" or payload.get("coverage") != "storage":
        fail("Storage backup manifest environment or coverage is invalid")
    validate_utc(payload.get("generated_at_utc"), "generated_at_utc")
    require_text(payload.get("backup_id"), "backup_id")
    buckets = payload.get("protected_buckets")
    if buckets != [FINANCE_BUCKET]:
        fail("Storage backup manifest bucket contract is invalid")
    objects = payload.get("objects")
    if not isinstance(objects, list):
        fail("Storage backup manifest objects are missing")
    if payload.get("object_count") != len(objects):
        fail("Storage backup manifest object_count is inconsistent")
    calculated_total = 0
    seen: set[tuple[str, str]] = set()
    for item in objects:
        if not isinstance(item, dict):
            fail("Storage backup manifest contains an invalid object")
        bucket = require_text(item.get("bucket"), "bucket")
        key = require_text(item.get("key"), "key")
        if bucket != FINANCE_BUCKET:
            fail("Storage backup manifest contains an unsupported bucket")
        attachment_id = canonical_uuid(item.get("attachment_id"), "attachment_id")
        organization_id = canonical_uuid(item.get("organization_id"), "organization_id")
        payable_document_id = canonical_uuid(item.get("payable_document_id"), "payable_document_id")
        if key != f"{organization_id}/{payable_document_id}/{attachment_id}":
            fail("Storage backup manifest contains a non-canonical object key")
        size = item.get("size_bytes")
        if isinstance(size, bool) or not isinstance(size, int) or size < 1:
            fail("Storage backup manifest contains an invalid size")
        checksum = require_text(item.get("sha256"), "sha256")
        if not SHA256_RE.fullmatch(checksum):
            fail("Storage backup manifest contains an invalid SHA-256")
        identity = (bucket, key)
        if identity in seen:
            fail("Storage backup manifest contains duplicate object keys")
        seen.add(identity)
        calculated_total += size
    if payload.get("total_bytes") != calculated_total:
        fail("Storage backup manifest total_bytes is inconsistent")
    return payload


def iter_material_files(root: Path) -> set[tuple[str, str]]:
    found: set[tuple[str, str]] = set()
    if not root.exists():
        return found
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        if len(relative.parts) < 2:
            fail("Storage material contains a file outside bucket/key layout")
        bucket = relative.parts[0]
        key = "/".join(relative.parts[1:])
        found.add((bucket, key))
    return found


def verify_material(args: argparse.Namespace) -> None:
    manifest = load_manifest(Path(args.manifest).resolve())
    material_root = Path(args.material_root).resolve()
    expected: set[tuple[str, str]] = set()
    for item in manifest["objects"]:
        bucket = item["bucket"]
        key = item["key"]
        expected.add((bucket, key))
        path = object_material_path(material_root, bucket, key)
        if not path.is_file():
            fail("restored Storage material is missing an expected object")
        if path.stat().st_size != item["size_bytes"]:
            fail("restored Storage object size differs from manifest")
        if sha256_file(path) != item["sha256"]:
            fail("restored Storage object SHA-256 differs from manifest")
    if args.reject_extra:
        extra = iter_material_files(material_root) - expected
        if extra:
            fail("restored Storage material contains an unexpected object")
    print(f"Verified {len(expected)} Storage object(s) against manifest.")


def verify_object_set(args: argparse.Namespace) -> None:
    manifest = load_manifest(Path(args.manifest).resolve())
    payload = load_json(Path(args.inventory).resolve())
    if not isinstance(payload, list):
        fail("restored Storage object inventory must be a JSON array")
    expected = {(item["bucket"], item["key"]) for item in manifest["objects"]}
    actual: set[tuple[str, str]] = set()
    for item in payload:
        if not isinstance(item, dict):
            fail("restored Storage object inventory contains an invalid row")
        bucket = require_text(item.get("bucket"), "bucket")
        key = require_text(item.get("key"), "key")
        identity = (bucket, key)
        if identity in actual:
            fail("restored Storage object inventory contains duplicates")
        actual.add(identity)
    if actual != expected:
        fail("restored Storage object set differs from manifest")
    print(f"Verified restored Storage object set with {len(actual)} object(s).")


def emit_objects(args: argparse.Namespace) -> None:
    payload = load_plan(Path(args.input).resolve()) if args.kind == "plan" else load_manifest(Path(args.input).resolve())
    for item in payload["objects"]:
        values = [
            item["bucket"],
            item["key"],
            str(item["size_bytes"]),
            str(item.get("mime_type") or "application/octet-stream"),
        ]
        if any("\t" in value or "\n" in value or "\r" in value for value in values):
            fail("Storage object metadata contains unsupported control characters")
        print("\t".join(values))


def summary(args: argparse.Namespace) -> None:
    manifest = load_manifest(Path(args.manifest).resolve())
    print(
        "\t".join(
            [
                manifest["generated_at_utc"],
                str(manifest["total_bytes"]),
                str(manifest["object_count"]),
                manifest["backup_id"],
            ]
        )
    )


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    commands = root.add_subparsers(dest="command", required=True)

    prepare = commands.add_parser("prepare", help="validate metadata/object inventory and build a transfer plan")
    prepare.add_argument("--metadata", required=True)
    prepare.add_argument("--bucket-list", required=True)
    prepare.add_argument("--object-list", action="append", default=[])
    prepare.add_argument("--allow-buckets", required=True)
    prepare.add_argument("--max-objects", required=True)
    prepare.add_argument("--max-total-bytes", required=True)
    prepare.add_argument("--max-object-bytes", required=True)
    prepare.add_argument("--output", required=True)
    prepare.set_defaults(handler=prepare_plan)

    create = commands.add_parser("create", help="hash downloaded source objects and create a versioned manifest")
    create.add_argument("--plan", required=True)
    create.add_argument("--material-root", required=True)
    create.add_argument("--output", required=True)
    create.add_argument("--backup-id", required=True)
    create.add_argument("--generated-at", required=True)
    create.add_argument("--source-project-ref", required=True)
    create.add_argument("--destination-namespace", required=True)
    create.set_defaults(handler=create_manifest)

    verify = commands.add_parser("verify-material", help="verify local or restored object material")
    verify.add_argument("--manifest", required=True)
    verify.add_argument("--material-root", required=True)
    verify.add_argument("--reject-extra", action="store_true")
    verify.set_defaults(handler=verify_material)

    object_set = commands.add_parser("verify-object-set", help="compare restored object keys with a manifest")
    object_set.add_argument("--manifest", required=True)
    object_set.add_argument("--inventory", required=True)
    object_set.set_defaults(handler=verify_object_set)

    emit = commands.add_parser("emit-objects", help="emit safe bucket/key rows for shell orchestration")
    emit.add_argument("--kind", choices=("plan", "manifest"), required=True)
    emit.add_argument("--input", required=True)
    emit.set_defaults(handler=emit_objects)

    info = commands.add_parser("summary", help="emit manifest completion fields")
    info.add_argument("--manifest", required=True)
    info.set_defaults(handler=summary)
    return root


def main() -> None:
    args = parser().parse_args()
    try:
        args.handler(args)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        raise SystemExit(f"Storage backup bundle error: {exc}") from exc


if __name__ == "__main__":
    main()
