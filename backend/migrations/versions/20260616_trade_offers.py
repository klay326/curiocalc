"""add trade_offers table

Revision ID: trade_offers_001
Revises:
Create Date: 2026-06-16
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'trade_offers_001'
down_revision = None

def upgrade():
    op.create_table(
        'trade_offers',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('from_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('to_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('offering_ids', sa.Text, nullable=False, server_default='[]'),
        sa.Column('requesting_ids', sa.Text, nullable=False, server_default='[]'),
        sa.Column('message', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_trade_offers_from_user_id', 'trade_offers', ['from_user_id'])
    op.create_index('ix_trade_offers_to_user_id', 'trade_offers', ['to_user_id'])

def downgrade():
    op.drop_table('trade_offers')
