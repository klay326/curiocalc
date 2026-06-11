"""
Image storage service.

Uses Cloudflare R2 (S3-compatible) when configured.
Falls back to local disk storage otherwise, serving files via the
/uploads static mount on the backend.

All uploads are compressed/resized via Pillow before storing.
"""
import io
import os
import uuid

import boto3
from botocore.config import Config
from fastapi import UploadFile
from PIL import Image

from app.config import settings

_MAX_PX = 2048   # longest edge in pixels
_QUALITY = 85    # JPEG quality


def _compress(contents: bytes) -> tuple[bytes, str]:
    """
    Resize to max _MAX_PX on the longest edge and encode as JPEG.
    Returns (compressed_bytes, 'jpg').  Falls back to original bytes on error.
    """
    try:
        img = Image.open(io.BytesIO(contents))
        # Preserve EXIF orientation
        try:
            from PIL.ImageOps import exif_transpose
            img = exif_transpose(img)
        except Exception:
            pass
        # Flatten alpha / palette
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        w, h = img.size
        if max(w, h) > _MAX_PX:
            scale = _MAX_PX / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=_QUALITY, optimize=True)
        return buf.getvalue(), "jpg"
    except Exception:
        return contents, "jpg"


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
    raw = await file.read()
    contents, ext = _compress(raw)

    if settings.R2_ACCOUNT_ID:
        # ── Cloudflare R2 ──────────────────────────────────────────────────────
        key = f"{folder}/{uuid.uuid4()}.{ext}"
        _get_r2_client().put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=key,
            Body=contents,
            ContentType="image/jpeg",
        )
        return f"{settings.R2_PUBLIC_URL}/{key}"

    # ── Local disk fallback ────────────────────────────────────────────────────
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
    prefix = f"{settings.LOCAL_STORAGE_URL}/uploads/"
    if url.startswith(prefix):
        rel = url[len(prefix):]
        filepath = os.path.join(settings.LOCAL_STORAGE_PATH, rel)
        try:
            os.remove(filepath)
        except OSError:
            pass
