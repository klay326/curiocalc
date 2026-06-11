"""
Async email notification service.
Configure via env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, NOTIFICATION_EMAIL
"""
import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


async def _send_to(to_email: str, subject: str, html: str) -> None:
    """Fire-and-forget email to an arbitrary address."""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.debug("Email not configured — skipping: %s", subject)
        return

    def _send() -> None:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.SMTP_FROM or settings.SMTP_USER
        msg["To"] = to_email
        msg["Subject"] = f"[CurioCalc] {subject}"
        msg.attach(MIMEText(html, "html"))
        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
                smtp.ehlo()
                smtp.starttls()
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.send_message(msg)
            logger.info("Email sent to %s: %s", to_email, subject)
        except Exception as exc:
            logger.error("Email send failed: %s — %s", subject, exc)

    asyncio.create_task(asyncio.to_thread(_send))


async def send_notification(subject: str, html: str) -> None:
    """Fire-and-forget email to the admin notification address."""
    if not settings.NOTIFICATION_EMAIL:
        logger.debug("No NOTIFICATION_EMAIL configured — skipping: %s", subject)
        return
    await _send_to(settings.NOTIFICATION_EMAIL, subject, html)


# ── Admin notifications ───────────────────────────────────────────────────────

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


# ── User-facing notifications ─────────────────────────────────────────────────

async def send_follow_email(to_email: str, actor_username: str, actor_display_name: str | None) -> None:
    name = actor_display_name or f"@{actor_username}"
    await _send_to(
        to_email,
        f"{name} followed you on CurioCalc",
        f"""
        <p><strong>{name}</strong>
        (<a href="https://curiocalc.org/u/{actor_username}">@{actor_username}</a>)
        started following you on <strong>CurioCalc</strong>.</p>
        <p><a href="https://curiocalc.org/u/{actor_username}">View their profile →</a></p>
        """,
    )


async def send_comment_email(
    to_email: str,
    actor_username: str,
    calc_make: str,
    calc_model: str,
    calc_id: str,
    snippet: str,
) -> None:
    await _send_to(
        to_email,
        f"New comment on {calc_make} {calc_model}",
        f"""
        <p><a href="https://curiocalc.org/u/{actor_username}">@{actor_username}</a>
        commented on <strong>{calc_make} {calc_model}</strong>:</p>
        <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;margin:12px 0;">
          {snippet}
        </blockquote>
        <p><a href="https://curiocalc.org/calculators/{calc_id}">View discussion →</a></p>
        """,
    )


async def send_password_reset_email(to_email: str, token: str) -> None:
    reset_url = f"https://curiocalc.org/reset-password?token={token}"
    await _send_to(
        to_email,
        "Reset your CurioCalc password",
        f"""
        <p>We received a request to reset your <strong>CurioCalc</strong> password.</p>
        <p style="margin:20px 0;">
          <a href="{reset_url}" style="background:#f59e0b;color:#1c1917;padding:10px 24px;border-radius:8px;font-weight:bold;text-decoration:none;">
            Reset password →
          </a>
        </p>
        <p style="color:#888;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        """,
    )


async def send_verification_email(to_email: str, token: str) -> None:
    verify_url = f"https://curiocalc.org/verify-email?token={token}"
    await _send_to(
        to_email,
        "Verify your CurioCalc email address",
        f"""
        <p>Thanks for joining <strong>CurioCalc</strong>! Please verify your email address.</p>
        <p style="margin:20px 0;">
          <a href="{verify_url}" style="background:#f59e0b;color:#1c1917;padding:10px 24px;border-radius:8px;font-weight:bold;text-decoration:none;">
            Verify email →
          </a>
        </p>
        <p style="color:#888;font-size:13px;">This link expires in 24 hours.</p>
        """,
    )
