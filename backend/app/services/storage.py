"""
Cloudflare R2 storage service (S3-compatible).
Falls back to local storage in development if R2 is not configured.
"""
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
    """Upload an image to R2 and return its public URL."""
    if not settings.R2_ACCOUNT_ID:
        # Dev fallback — return a placeholder
        return f"https://placehold.co/600x400?text=dev"

    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    key = f"{folder}/{uuid.uuid4()}.{ext}"

    client = _get_r2_client()
    contents = await file.read()

    client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
        Body=contents,
        ContentType=file.content_type or "image/jpeg",
    )

    return f"{settings.R2_PUBLIC_URL}/{key}"


def delete_image(url: str) -> None:
    """Delete an image from R2 by its public URL."""
    if not settings.R2_ACCOUNT_ID:
        return
    key = url.replace(f"{settings.R2_PUBLIC_URL}/", "")
    client = _get_r2_client()
    client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)
