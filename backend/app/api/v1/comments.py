import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db, get_current_user
from app.models.comment import Comment
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentPublic

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
    comment = Comment(
        calculator_id=calc_id,
        user_id=current_user.id,
        content=payload.content,
        rating=payload.rating,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return _to_public(comment, current_user)


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
