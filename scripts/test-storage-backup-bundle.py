#!/usr/bin/env python3
"""Regression tests for scripts/storage-backup-bundle.py."""

from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from argparse import Namespace
from hashlib import sha256
from pathlib import Path

SCRIPT = Path(__file__).with_name("storage-backup-bundle.py")
SPEC = importlib.util.spec_from_file_location("storage_backup_bundle", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

ORG = "11111111-1111-4111-8111-111111111111"
DOC = "22222222-2222-4222-8222-222222222222"
ATTACHMENT = "33333333-3333-4333-8333-333333333333"
KEY = f"{ORG}/{DOC}/{ATTACHMENT}"
BUCKET = "finance-attachments"
CONTENT = b"synthetic-storage-object\n"


class StorageBackupBundleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.metadata = self.root / "metadata.json"
        self.buckets = self.root / "buckets.json"
        self.objects = self.root / "objects.json"
        self.plan = self.root / "plan.json"
        self.material = self.root / "material"
        self.manifest = self.root / "manifest.json"

        self.write_json(
            self.metadata,
            [
                {
                    "attachment_id": ATTACHMENT,
                    "organization_id": ORG,
                    "payable_document_id": DOC,
                    "storage_bucket": BUCKET,
                    "storage_key": KEY,
                    "mime_type": "application/pdf",
                    "size_bytes": len(CONTENT),
                    "checksum_sha256": sha256(CONTENT).hexdigest(),
                    "created_at": "2026-08-27T12:00:00Z",
                }
            ],
        )
        self.write_json(self.buckets, [BUCKET])
        self.write_json(
            self.objects,
            {
                "Contents": [
                    {
                        "Key": KEY,
                        "Size": len(CONTENT),
                        "LastModified": "2026-08-27T12:00:01Z",
                    }
                ]
            },
        )

    def tearDown(self) -> None:
        self.temp.cleanup()

    @staticmethod
    def write_json(path: Path, payload: object) -> None:
        path.write_text(json.dumps(payload), encoding="utf-8")

    def prepare_args(self, **overrides: object) -> Namespace:
        values = {
            "metadata": str(self.metadata),
            "bucket_list": str(self.buckets),
            "object_list": [f"{BUCKET}={self.objects}"],
            "allow_buckets": BUCKET,
            "max_objects": "10",
            "max_total_bytes": "1048576",
            "max_object_bytes": "10485760",
            "output": str(self.plan),
        }
        values.update(overrides)
        return Namespace(**values)

    def prepare(self, **overrides: object) -> None:
        MODULE.prepare_plan(self.prepare_args(**overrides))

    def create_manifest(self) -> None:
        path = self.material / BUCKET / Path(*KEY.split("/"))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(CONTENT)
        MODULE.create_manifest(
            Namespace(
                plan=str(self.plan),
                material_root=str(self.material),
                output=str(self.manifest),
                backup_id="storage-20260827T120000Z-123-1",
                generated_at="2026-08-27T12:00:00Z",
                source_project_ref="synthetic-project",
                destination_namespace="production/storage/runs/storage-20260827T120000Z-123-1",
            )
        )

    def test_happy_path_creates_and_verifies_manifest(self) -> None:
        self.prepare()
        self.create_manifest()
        MODULE.verify_material(
            Namespace(
                manifest=str(self.manifest),
                material_root=str(self.material),
                reject_extra=True,
            )
        )
        manifest = json.loads(self.manifest.read_text(encoding="utf-8"))
        self.assertEqual(manifest["format"], "lojasaph-storage-backup-v1")
        self.assertEqual(manifest["object_count"], 1)
        self.assertEqual(manifest["total_bytes"], len(CONTENT))
        self.assertNotIn("original_filename", json.dumps(manifest))

    def test_unexpected_bucket_fails_closed(self) -> None:
        self.write_json(self.buckets, [BUCKET, "unexpected-bucket"])
        with self.assertRaisesRegex(ValueError, "unclassified"):
            self.prepare()

    def test_missing_object_fails_closed(self) -> None:
        self.write_json(self.objects, {"Contents": []})
        with self.assertRaisesRegex(ValueError, "missing"):
            self.prepare()

    def test_extra_object_fails_closed(self) -> None:
        payload = json.loads(self.objects.read_text(encoding="utf-8"))
        payload["Contents"].append({"Key": f"{ORG}/{DOC}/44444444-4444-4444-8444-444444444444", "Size": 3})
        self.write_json(self.objects, payload)
        with self.assertRaisesRegex(ValueError, "without finance attachment metadata"):
            self.prepare()

    def test_size_mismatch_fails_closed(self) -> None:
        payload = json.loads(self.objects.read_text(encoding="utf-8"))
        payload["Contents"][0]["Size"] += 1
        self.write_json(self.objects, payload)
        with self.assertRaisesRegex(ValueError, "size differs"):
            self.prepare()

    def test_guardrails_fail_closed(self) -> None:
        second_attachment = "44444444-4444-4444-8444-444444444444"
        second_key = f"{ORG}/{DOC}/{second_attachment}"
        metadata = json.loads(self.metadata.read_text(encoding="utf-8"))
        metadata.append(
            {
                **metadata[0],
                "attachment_id": second_attachment,
                "storage_key": second_key,
            }
        )
        self.write_json(self.metadata, metadata)
        objects = json.loads(self.objects.read_text(encoding="utf-8"))
        objects["Contents"].append(
            {
                "Key": second_key,
                "Size": len(CONTENT),
                "LastModified": "2026-08-27T12:00:02Z",
            }
        )
        self.write_json(self.objects, objects)

        with self.assertRaisesRegex(ValueError, "object-count guardrail"):
            self.prepare(max_objects="1")
        with self.assertRaisesRegex(ValueError, "total-byte guardrail"):
            self.prepare(max_total_bytes=str((len(CONTENT) * 2) - 1))
        with self.assertRaisesRegex(ValueError, "per-object byte guardrail"):
            self.prepare(max_object_bytes=str(len(CONTENT) - 1))

    def test_corrupt_source_material_is_rejected(self) -> None:
        self.prepare()
        path = self.material / BUCKET / Path(*KEY.split("/"))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"corrupt\n")
        with self.assertRaisesRegex(ValueError, "SHA-256|size changed"):
            MODULE.create_manifest(
                Namespace(
                    plan=str(self.plan),
                    material_root=str(self.material),
                    output=str(self.manifest),
                    backup_id="storage-test",
                    generated_at="2026-08-27T12:00:00Z",
                    source_project_ref="synthetic-project",
                    destination_namespace="production/storage/runs/storage-test",
                )
            )

    def test_restored_material_rejects_extra_and_corruption(self) -> None:
        self.prepare()
        self.create_manifest()

        extra = self.material / BUCKET / "extra"
        extra.write_text("extra", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "unexpected object"):
            MODULE.verify_material(
                Namespace(
                    manifest=str(self.manifest),
                    material_root=str(self.material),
                    reject_extra=True,
                )
            )
        extra.unlink()

        expected = self.material / BUCKET / Path(*KEY.split("/"))
        expected.write_bytes(b"corrupt but same-ish")
        with self.assertRaisesRegex(ValueError, "size differs|SHA-256 differs"):
            MODULE.verify_material(
                Namespace(
                    manifest=str(self.manifest),
                    material_root=str(self.material),
                    reject_extra=True,
                )
            )

    def test_empty_legitimate_state_is_valid(self) -> None:
        self.write_json(self.metadata, [])
        self.write_json(self.buckets, [])
        self.prepare(object_list=[])
        plan = json.loads(self.plan.read_text(encoding="utf-8"))
        self.assertEqual(plan["object_count"], 0)
        self.assertEqual(plan["total_bytes"], 0)


if __name__ == "__main__":
    unittest.main()
