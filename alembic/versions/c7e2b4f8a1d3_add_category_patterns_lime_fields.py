"""add lime_top_features, consensus_features, agreement_ratio to category_patterns

Revision ID: c7e2b4f8a1d3
Revises: d1e4f7a3b8c5
Create Date: 2026-09-04 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c7e2b4f8a1d3'
down_revision: Union[str, Sequence[str], None] = 'd1e4f7a3b8c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'category_patterns',
        sa.Column('lime_top_features', postgresql.JSONB(), nullable=False, server_default='[]'),
    )
    op.add_column(
        'category_patterns',
        sa.Column('consensus_features', postgresql.JSONB(), nullable=False, server_default='[]'),
    )
    op.add_column(
        'category_patterns',
        sa.Column('agreement_ratio', sa.Float(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('category_patterns', 'agreement_ratio')
    op.drop_column('category_patterns', 'consensus_features')
    op.drop_column('category_patterns', 'lime_top_features')
