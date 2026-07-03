"""add post-trade-offers tables: reports, device_tokens, calculator_likes, comment_likes, calculator_votes; notification_prefs column

Revision ID: post_trade_offers_001
Revises: trade_offers_001
Create Date: 2026-07-01
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'post_trade_offers_001'
down_revision = 'trade_offers_001'


def upgrade():
    # Tables that may already exist in production via create_all — use IF NOT EXISTS
    op.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            target_type VARCHAR(20) NOT NULL,
            comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
            reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            reason TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            resolved_at TIMESTAMPTZ
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_reports_reporter_id ON reports(reporter_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_reports_status ON reports(status)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS device_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL,
            platform VARCHAR(20) NOT NULL DEFAULT 'ios',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_device_tokens_token UNIQUE (token)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_device_tokens_user_id ON device_tokens(user_id)")

    op.execute("""
        CREATE TABLE IF NOT EXISTS calculator_likes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            calculator_id UUID NOT NULL REFERENCES calculators(id) ON DELETE CASCADE,
            created_at TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT uq_calc_like UNIQUE (user_id, calculator_id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_calculator_likes_user_id ON calculator_likes(user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_calculator_likes_calculator_id ON calculator_likes(calculator_id)")

    op.execute("""
        ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSON NOT NULL DEFAULT '{}'
    """)

    # New tables (did not exist before this migration)
    op.create_table(
        'comment_likes',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('comment_id', UUID(as_uuid=True), sa.ForeignKey('comments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'comment_id', name='uq_comment_like'),
    )
    op.create_index('ix_comment_likes_user_id', 'comment_likes', ['user_id'])
    op.create_index('ix_comment_likes_comment_id', 'comment_likes', ['comment_id'])

    op.create_table(
        'calculator_votes',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('calculator_id', UUID(as_uuid=True), sa.ForeignKey('calculators.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rarity_score', sa.Float, nullable=True),
        sa.Column('weirdness_score', sa.Float, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'calculator_id', name='uq_calc_vote'),
    )
    op.create_index('ix_calculator_votes_user_id', 'calculator_votes', ['user_id'])
    op.create_index('ix_calculator_votes_calculator_id', 'calculator_votes', ['calculator_id'])


def downgrade():
    op.drop_table('calculator_votes')
    op.drop_table('comment_likes')
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS notification_prefs")
    op.drop_table('calculator_likes')
    op.drop_table('device_tokens')
    op.drop_table('reports')
