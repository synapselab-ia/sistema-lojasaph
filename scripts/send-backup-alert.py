#!/usr/bin/env python3
"""Send an operational backup alert without exposing SMTP credentials in argv/logs."""

from __future__ import annotations

import os
import smtplib
import ssl
from email.message import EmailMessage


def required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Required environment variable is missing: {name}")
    return value


def main() -> None:
    email = required("BACKUP_ALERT_EMAIL")
    app_password = required("BACKUP_ALERT_GMAIL_APP_PASSWORD")
    subject = required("BACKUP_ALERT_SUBJECT")
    body = required("BACKUP_ALERT_BODY")

    message = EmailMessage()
    message["From"] = email
    message["To"] = email
    message["Subject"] = subject
    message.set_content(body)

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context, timeout=30) as smtp:
        smtp.login(email, app_password)
        smtp.send_message(message)

    print("Backup alert email sent.")


if __name__ == "__main__":
    main()
