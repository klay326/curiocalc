"""enable pg_trgm + trigram index for typo-tolerant calculator search

Revision ID: search_trgm_001
Revises: post_trade_offers_001
Create Date: 2026-11-08
"""
from alembic import op

revision = 'search_trgm_001'
down_revision = 'post_trade_offers_001'


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_calculators_search_norm_trgm ON calculators
        USING gin ((regexp_replace(lower(make || ' ' || model), '[^a-z0-9]', '', 'g')) gin_trgm_ops)
    """)


def downgrade():
    op.execute("DROP INDEX IF EXISTS ix_calculators_search_norm_trgm")
