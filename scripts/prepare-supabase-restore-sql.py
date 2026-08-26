#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# Mirrors the reserved-role contract used by Supabase CLI role dumps. Managed
# roles already exist in a Supabase target and supautils intentionally blocks
# callers from recreating or altering them during a logical restore.
RESERVED_ROLE = re.compile(
    r"^(?:"
    r"anon|authenticated|authenticator|cli_login_.*|dashboard_user|pgbouncer|"
    r"postgres|service_role|supabase_.*|pgsodium_keyholder|pgsodium_keyiduser|"
    r"pgsodium_keymaker|pgtle_admin"
    r")$"
)

IDENT = r'(?:"(?P<quoted>(?:[^"]|"")+)"|(?P<plain>[A-Za-z_][A-Za-z0-9_$]*))'
CREATE_OR_ALTER_ROLE = re.compile(
    rf"^\s*(?:CREATE|ALTER)\s+ROLE\s+{IDENT}(?:\s|;|$)", re.IGNORECASE
)
GRANT_TO_ROLE = re.compile(
    rf"^\s*GRANT\b.+?\bTO\s+{IDENT}(?:\s|;|$)", re.IGNORECASE
)
REVOKE_FROM_ROLE = re.compile(
    rf"^\s*REVOKE\b.+?\bFROM\s+{IDENT}(?:\s|;|$)", re.IGNORECASE
)
SUPABASE_ADMIN_OWNER = re.compile(
    r'^\s*ALTER\s+.+\s+OWNER\s+TO\s+"?supabase_admin"?\s*;\s*$',
    re.IGNORECASE,
)


def role_name(match: re.Match[str]) -> str:
    quoted = match.group("quoted")
    if quoted is not None:
        return quoted.replace('""', '"')
    plain = match.group("plain")
    if plain is None:
        raise ValueError("role identifier was not captured")
    return plain


def comment_managed(line: str) -> str:
    newline = "\n" if line.endswith("\n") else ""
    body = line[:-1] if newline else line
    return f"-- lojasaph: managed Supabase role omitted during restore: {body}{newline}"


def normalize_roles(source: Path, destination: Path) -> int:
    skipped = 0
    output: list[str] = []

    for line_number, line in enumerate(source.read_text(encoding="utf-8").splitlines(keepends=True), 1):
        stripped = line.lstrip()
        if not stripped or stripped.startswith("--") or stripped.startswith("\\"):
            output.append(line)
            continue

        role_match = CREATE_OR_ALTER_ROLE.match(line)
        if role_match:
            if RESERVED_ROLE.fullmatch(role_name(role_match)):
                output.append(comment_managed(line))
                skipped += 1
            else:
                output.append(line)
            continue

        grant_match = GRANT_TO_ROLE.match(line)
        if grant_match:
            if RESERVED_ROLE.fullmatch(role_name(grant_match)):
                output.append(comment_managed(line))
                skipped += 1
            else:
                output.append(line)
            continue

        revoke_match = REVOKE_FROM_ROLE.match(line)
        if revoke_match:
            if RESERVED_ROLE.fullmatch(role_name(revoke_match)):
                output.append(comment_managed(line))
                skipped += 1
            else:
                output.append(line)
            continue

        # Role dumps should be line-oriented pg_dumpall output. If a statement
        # looks role-related but does not match the supported grammar, abort
        # instead of silently discarding potentially meaningful custom access.
        if re.match(r"^\s*(?:CREATE|ALTER)\s+ROLE\b", line, re.IGNORECASE):
            raise ValueError(f"unsupported role definition at roles.sql line {line_number}")
        if re.match(r"^\s*(?:GRANT|REVOKE)\b", line, re.IGNORECASE):
            raise ValueError(f"unsupported role membership statement at roles.sql line {line_number}")

        output.append(line)

    destination.write_text("".join(output), encoding="utf-8")
    return skipped


def normalize_schema(source: Path, destination: Path) -> int:
    skipped = 0
    output: list[str] = []

    for line_number, line in enumerate(source.read_text(encoding="utf-8").splitlines(keepends=True), 1):
        stripped = line.lstrip()
        if stripped.startswith("--"):
            output.append(line)
            continue

        if SUPABASE_ADMIN_OWNER.match(line):
            output.append(comment_managed(line))
            skipped += 1
            continue

        if re.search(r'\bOWNER\s+TO\s+"?supabase_admin"?\b', line, re.IGNORECASE):
            raise ValueError(
                f"unsupported multi-line supabase_admin ownership statement at schema.sql line {line_number}"
            )

        output.append(line)

    destination.write_text("".join(output), encoding="utf-8")
    return skipped


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Prepare verified Supabase logical SQL for an isolated restore target."
    )
    parser.add_argument("--roles", required=True, type=Path)
    parser.add_argument("--schema", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    if not args.roles.is_file() or args.roles.stat().st_size == 0:
        parser.error("--roles must point to a non-empty roles.sql")
    if not args.schema.is_file() or args.schema.stat().st_size == 0:
        parser.error("--schema must point to a non-empty schema.sql")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    roles_output = args.output_dir / "roles.restore.sql"
    schema_output = args.output_dir / "schema.restore.sql"

    try:
        role_skips = normalize_roles(args.roles, roles_output)
        owner_skips = normalize_schema(args.schema, schema_output)
    except (OSError, UnicodeError, ValueError) as exc:
        print(f"restore SQL preparation failed: {exc}", file=sys.stderr)
        return 1

    if roles_output.stat().st_size == 0 or schema_output.stat().st_size == 0:
        print("restore SQL preparation produced an empty required output", file=sys.stderr)
        return 1

    print(
        "Prepared verified restore SQL "
        f"(managed role statements omitted: {role_skips}; "
        f"supabase_admin ownership statements omitted: {owner_skips})."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
