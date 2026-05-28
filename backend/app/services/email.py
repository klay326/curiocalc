"""
Async email notification service.
Configure via env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, NOTIFICATION_EMAIL
"""
import asyncio
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings

logger = logging.getLogger(__name__)


async def send_notification(subject: str, html: str) -> None:
    """Fire-and-forget email to the admin notification address."""
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.NOTIFICATION_EMAIL:
        logger.debug("Email not configured — skipping notification: %s", subject)
        return

    def _send() -> None:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
        msg["To"] = settings.NOTIFICATION_EMAIL
        msg["Subject"] = f"[CurioCalc] {subject}"
        msg.attach(MIMEText(html, "html"))

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
                smtp.ehlo()
                smtp.starttls()
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.send_message(msg)
            logger.info("Email sent: %s", subject)
        except Exception as exc:
            logger.error("Email send failed: %s — %s", subject, exc)

    # Run in thread so we don't block the event loop
    asyncio.create_task(asyncio.to_thread(_send))


# ── Notification helpers ──────────────────────────────────────────────────────

async def notify_new_user(username: str, email: str) -> None:
    await send_notification(
        f"New user: @{username}",
        f"""
        <p>A new user just registered on <strong>CurioCalc</strong>.</p>
        <ul>
          <li><strong>Username:</strong> @{username}</li>
          <li><strong>Email:</strong> {email}</li>
        </ul>
        <p><a href="https://curiocalc.org/u/{username}">View profile →</a></p>
        """,
    )


async def notify_calc_added(make: str, model: str, calc_id: str, added_by: str) -> None:
    await send_notification(
        f"Calculator added: {make} {model}",
        f"""
        <p><strong>{make} {model}</strong> was added to the CurioCalc database.</p>
        <ul>
          <li><strong>Added by:</strong> {added_by}</li>
        </ul>
        <p><a href="https://curiocalc.org/calculators/{calc_id}">View calculator →</a></p>
        """,
    )


async def notify_calc_updated(make: str, model: str, calc_id: str, updated_by: str) -> None:
    await send_notification(
        f"Calculator updated: {make} {model}",
        f"""
        <p><strong>{make} {model}</strong> was edited in the CurioCalc database.</p>
        <ul>
          <li><strong>Updated by:</strong> {updated_by}</li>
        </ul>
        <p><a href="https://curiocalc.org/calculators/{calc_id}">View calculator →</a></p>
        """,
    )


async def notify_calc_deleted(make: str, model: str, deleted_by: str) -> None:
    await send_notification(
        f"Calculator deleted: {make} {model}",
        f"""
        <p><strong>{make} {model}</strong> was <span style="color:red">permanently deleted</span>
           from the CurioCalc database.</p>
        <ul>
          <li><strong>Deleted by:</strong> {deleted_by}</li>
        </ul>
        """,
    )
