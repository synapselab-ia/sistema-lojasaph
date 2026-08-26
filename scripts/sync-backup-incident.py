#!/usr/bin/env python3
"""Create, update, and resolve idempotent GitHub issues for backup workflow failures."""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any


def required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Required environment variable is missing: {name}")
    return value


def api_request(method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
    api_url = required("GITHUB_API_URL").rstrip("/")
    token = required("GITHUB_TOKEN")
    body = None
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        f"{api_url}{path}",
        data=body,
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "sistema-lojasaph-backup-incident",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"GitHub API request failed with HTTP {exc.code}: {detail}") from exc

    if not raw:
        return None
    return json.loads(raw.decode("utf-8"))


def find_open_incident(repo: str, title: str, marker: str) -> dict[str, Any] | None:
    encoded_repo = urllib.parse.quote(repo, safe="/")
    issues = api_request("GET", f"/repos/{encoded_repo}/issues?state=open&per_page=100")
    if not isinstance(issues, list):
        raise RuntimeError("Unexpected GitHub API response while listing issues")

    for issue in issues:
        if not isinstance(issue, dict) or "pull_request" in issue:
            continue
        if issue.get("title") == title and marker in str(issue.get("body") or ""):
            return issue
    return None


def comment_exists(repo: str, issue_number: int, run_marker: str) -> bool:
    encoded_repo = urllib.parse.quote(repo, safe="/")
    comments = api_request(
        "GET", f"/repos/{encoded_repo}/issues/{issue_number}/comments?per_page=100"
    )
    if not isinstance(comments, list):
        raise RuntimeError("Unexpected GitHub API response while listing issue comments")
    return any(run_marker in str(comment.get("body") or "") for comment in comments)


def add_comment(repo: str, issue_number: int, body: str) -> None:
    encoded_repo = urllib.parse.quote(repo, safe="/")
    api_request(
        "POST",
        f"/repos/{encoded_repo}/issues/{issue_number}/comments",
        {"body": body},
    )


def main() -> None:
    repo = required("GITHUB_REPOSITORY")
    status = required("BACKUP_INCIDENT_STATUS").lower()
    key = required("BACKUP_INCIDENT_KEY").lower()
    title = required("BACKUP_INCIDENT_TITLE")
    workflow = required("BACKUP_INCIDENT_WORKFLOW")
    run_url = required("BACKUP_INCIDENT_RUN_URL")
    run_id = required("GITHUB_RUN_ID")
    run_attempt = required("GITHUB_RUN_ATTEMPT")
    details = os.environ.get("BACKUP_INCIDENT_DETAILS", "").strip()

    if status not in {"failure", "success"}:
        raise RuntimeError("BACKUP_INCIDENT_STATUS must be failure or success")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,63}", key):
        raise RuntimeError("BACKUP_INCIDENT_KEY must be a stable lowercase slug")
    if len(details) > 2000:
        raise RuntimeError("BACKUP_INCIDENT_DETAILS is unexpectedly large")

    marker = f"<!-- lojasaph-backup-incident:{key} -->"
    run_marker = f"<!-- lojasaph-backup-run:{key}:{run_id}:{run_attempt}:{status} -->"
    issue = find_open_incident(repo, title, marker)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    if status == "failure":
        event_body = "\n".join(
            line
            for line in [
                run_marker,
                f"Backup protection workflow failed at `{now}`.",
                "",
                f"- Workflow: `{workflow}`",
                f"- Run: {run_url}",
                f"- Attempt: `{run_attempt}`",
                f"- Details: {details}" if details else "",
                "",
                "No credentials, connection strings, object contents, or backup data are included here.",
            ]
            if line
        )

        if issue is None:
            encoded_repo = urllib.parse.quote(repo, safe="/")
            created = api_request(
                "POST",
                f"/repos/{encoded_repo}/issues",
                {
                    "title": title,
                    "body": f"{marker}\n\n{event_body}",
                },
            )
            number = created.get("number") if isinstance(created, dict) else None
            print(f"Opened persistent backup incident issue #{number}.")
            return

        number = int(issue["number"])
        if not comment_exists(repo, number, run_marker):
            add_comment(repo, number, event_body)
            print(f"Updated persistent backup incident issue #{number}.")
        else:
            print(f"Backup incident issue #{number} already records this run attempt.")
        return

    if issue is None:
        print("No open backup incident issue needs resolution.")
        return

    number = int(issue["number"])
    if not comment_exists(repo, number, run_marker):
        add_comment(
            repo,
            number,
            "\n".join(
                [
                    run_marker,
                    f"Backup protection workflow recovered at `{now}`.",
                    "",
                    f"- Workflow: `{workflow}`",
                    f"- Successful run: {run_url}",
                    "",
                    "The incident is being closed automatically after a successful workflow run.",
                ]
            ),
        )

    encoded_repo = urllib.parse.quote(repo, safe="/")
    api_request(
        "PATCH",
        f"/repos/{encoded_repo}/issues/{number}",
        {"state": "closed", "state_reason": "completed"},
    )
    print(f"Resolved backup incident issue #{number}.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError, json.JSONDecodeError) as exc:
        raise SystemExit(f"backup incident reporter error: {exc}") from exc
