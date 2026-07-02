import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.cache import rate_limit_check
from app.models.calculator import Calculator
from app.models.collection import CollectionEntry
from app.models.comment import Comment
from app.models.notification import Notification
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentPublic
from app.services.email import send_comment_email
from app.services.push import send_push_to_user

router = APIRouter(tags=["comments"])


def _to_public(comment: Comment, user: User) -> CommentPublic:
    return CommentPublic(
        id=comment.id,
        calculator_id=comment.calculator_id,
        user_id=comment.user_id,
        username=user.username,
        display_name=user.display_name,
        content=comment.content,
        rating=comment.rating,
        created_at=comment.created_at,
    )


@router.get("/calculators/{calc_id}/comments", response_model=list[CommentPublic])
async def list_comments(calc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Comment, User)
        .join(User, User.id == Comment.user_id)
        .where(Comment.calculator_id == calc_id)
        .order_by(Comment.created_at.desc())
    )
    rows = result.all()
    return [_to_public(c, u) for c, u in rows]


@router.post(
    "/calculators/{calc_id}/comments",
    response_model=CommentPublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    calc_id: uuid.UUID,
    payload: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not await rate_limit_check(f"rl:comment:{current_user.id}", max_requests=10, window=300):
        raise HTTPException(status_code=429, detail="Too many comments. Please slow down.")

    comment = Comment(
        calculator_id=calc_id,
        user_id=current_user.id,
        content=payload.content,
        rating=payload.rating,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    # Notify owners of this calc (up to 20, skip the commenter)
    calc_r = await db.execute(select(Calculator).where(Calculator.id == calc_id))
    calc = calc_r.scalar_one_or_none()
    if calc:
        owners_r = await db.execute(
            select(CollectionEntry.user_id, User.email, User.notification_prefs)
            .join(User, User.id == CollectionEntry.user_id)
            .where(
                CollectionEntry.calculator_id == calc_id,
                CollectionEntry.status == "owned",
                CollectionEntry.user_id != current_user.id,
            )
            .limit(20)
        )
        owner_rows = owners_r.all()
        snippet = payload.content[:120] if payload.content else ""
        for uid, owner_email, owner_prefs in owner_rows:
            db.add(Notification(
                user_id=uid,
                type="comment",
                actor_id=current_user.id,
                actor_username=current_user.username,
                actor_display_name=current_user.display_name,
                actor_avatar_url=current_user.avatar_url,
                calc_id=calc.id,
                calc_make=calc.make,
                calc_model=calc.model,
                body=snippet or None,
            ))
        if owner_rows:
            await db.commit()
            for uid, owner_email, owner_prefs in owner_rows:
                await send_push_to_user(
                    uid, db, f"New comment on {calc.make} {calc.model}",
                    f"@{current_user.username}: {snippet}",
                )
                if not (owner_prefs or {}).get("email_comment", True):
                    continue
                await send_comment_email(
                    owner_email,
                    current_user.username,
                    calc.make,
                    calc.model,
                    str(calc_id),
                    snippet,
                )

    return _to_public(comment, current_user)


class CommentUpdate(BaseModel):
    content: str
    rating: int | None = None


@router.patch("/comments/{comment_id}", response_model=CommentPublic)
async def update_comment(
    comment_id: uuid.UUID,
    payload: CommentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Comment, User).join(User, User.id == Comment.user_id).where(Comment.id == comment_id))
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Comment not found")
    comment, user = row
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    comment.content = payload.content
    comment.rating = payload.rating
    await db.commit()
    await db.refresh(comment)
    return _to_public(comment, user)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.delete(comment)
    await db.commit()
