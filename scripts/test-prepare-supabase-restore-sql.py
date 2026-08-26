#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("prepare-supabase-restore-sql.py")


class PrepareSupabaseRestoreSqlTests(unittest.TestCase):
    def run_prepare(self, roles: str, schema: str) -> tuple[subprocess.CompletedProcess[str], str, str]:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            roles_path = root / "roles.sql"
            schema_path = root / "schema.sql"
            output_dir = root / "prepared"
            roles_path.write_text(roles, encoding="utf-8")
            schema_path.write_text(schema, encoding="utf-8")

            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--roles",
                    str(roles_path),
                    "--schema",
                    str(schema_path),
                    "--output-dir",
                    str(output_dir),
                ],
                text=True,
                capture_output=True,
                check=False,
            )

            prepared_roles = ""
            prepared_schema = ""
            if (output_dir / "roles.restore.sql").exists():
                prepared_roles = (output_dir / "roles.restore.sql").read_text(encoding="utf-8")
            if (output_dir / "schema.restore.sql").exists():
                prepared_schema = (output_dir / "schema.restore.sql").read_text(encoding="utf-8")
            return result, prepared_roles, prepared_schema

    def test_omits_managed_roles_but_preserves_custom_roles(self) -> None:
        result, roles, schema = self.run_prepare(
            roles=(
                'ALTER ROLE "supabase_admin" WITH NOSUPERUSER INHERIT;\n'
                'GRANT "postgres" TO "cli_login_postgres" WITH INHERIT FALSE GRANTED BY "supabase_admin";\n'
                'CREATE ROLE "lojasaph_reporter" NOLOGIN;\n'
                'ALTER ROLE "lojasaph_reporter" SET statement_timeout TO \'5s\';\n'
                'GRANT "lojasaph_reporter" TO "lojasaph_operator";\n'
                'RESET ALL;\n'
            ),
            schema=(
                'CREATE TABLE public.example(id bigint);\n'
                'ALTER TABLE public.example OWNER TO "supabase_admin";\n'
                'ALTER TABLE public.example OWNER TO "postgres";\n'
            ),
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('-- lojasaph: managed Supabase role omitted during restore: ALTER ROLE "supabase_admin"', roles)
        self.assertIn('-- lojasaph: managed Supabase role omitted during restore: GRANT "postgres" TO "cli_login_postgres"', roles)
        self.assertIn('CREATE ROLE "lojasaph_reporter" NOLOGIN;', roles)
        self.assertIn('ALTER ROLE "lojasaph_reporter" SET statement_timeout TO \'5s\';', roles)
        self.assertIn('GRANT "lojasaph_reporter" TO "lojasaph_operator";', roles)
        self.assertIn('RESET ALL;', roles)
        self.assertIn('-- lojasaph: managed Supabase role omitted during restore: ALTER TABLE public.example OWNER TO "supabase_admin";', schema)
        self.assertIn('ALTER TABLE public.example OWNER TO "postgres";', schema)

    def test_preserves_custom_role_granted_a_managed_role(self) -> None:
        result, roles, _ = self.run_prepare(
            roles='GRANT "authenticated" TO "lojasaph_worker";\n',
            schema='CREATE TABLE public.example(id bigint);\n',
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(roles, 'GRANT "authenticated" TO "lojasaph_worker";\n')

    def test_fails_closed_for_unclassified_role_membership(self) -> None:
        result, _, _ = self.run_prepare(
            roles='GRANT "lojasaph_reporter";\n',
            schema='CREATE TABLE public.example(id bigint);\n',
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unsupported role membership statement", result.stderr)

    def test_fails_closed_for_multiline_supabase_admin_owner(self) -> None:
        result, _, _ = self.run_prepare(
            roles='RESET ALL;\n',
            schema='ALTER TABLE public.example OWNER TO "supabase_admin" -- unexpected suffix\n',
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unsupported multi-line supabase_admin ownership statement", result.stderr)


if __name__ == "__main__":
    unittest.main()
