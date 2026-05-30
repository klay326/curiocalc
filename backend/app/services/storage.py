"""
Image storage service.

Uses Cloudflare R2 (S3-compatible) when configured.
Falls back to local disk storage otherwise, serving files via the
/uploads static mount on the backend.
"""
import os
import uuid
import boto3
from botocore.config import Config
from fastapi import UploadFile
from app.config import settings


def _get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


async def upload_image(file: UploadFile, folder: str = "general") -> str:
    """Upload an image and return its public URL."""
    contents = await file.read()

    if settings.R2_ACCOUNT_ID:
        # ── Cloudflare R2 ──────────────────────────────────────────────────────
        ext = file.filename.split(".")[-1].lower() if file.filename else "jpg"
        key = f"{folder}/{uuid.uuid4()}.{ext}"
        client = _get_r2_client()
        client.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=key,
            Body=contents,
            ContentType=file.content_type or "image/jpeg",
        )
        return f"{settings.R2_PUBLIC_URL}/{key}"

    # ── Local disk fallback ────────────────────────────────────────────────────
    ext = (file.filename or "image.jpg").rsplit(".", 1)[-1].lower()
    # Only allow safe image extensions
    if ext not in {"jpg", "jpeg", "png", "gif", "webp", "avif", "heic"}:
        ext = "jpg"
    upload_dir = os.path.join(settings.LOCAL_STORAGE_PATH, folder)
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    return f"{settings.LOCAL_STORAGE_URL}/uploads/{folder}/{filename}"


def delete_image(url: str) -> None:
    """Delete an image by its public URL."""
    if settings.R2_ACCOUNT_ID:
        key = url.replace(f"{settings.R2_PUBLIC_URL}/", "")
        _get_r2_client().delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
        return

    # Local disk: derive path from URL
    prefix = f"{settings.LOCAL_STORAGE_URL}/uploads/"
    if url.startswith(prefix):
        rel = url[len(prefix):]
        filepath = os.path.join(settings.LOCAL_STORAGE_PATH, rel)
        try:
            os.remove(filepath)
        except OSError:
            pass
