"""add recommendation source, created_at, and nullable experiment_id

Revision ID: a1f9c3d0e7b2
Revises: 85dc718432ee
Create Date: 2026-08-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1f9c3d0e7b2'
down_revision: Union[str, Sequence[str], None] = '85dc718432ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'safety_recommendations',
        sa.Column('source', sa.String(length=20), nullable=False, server_default='rule_engine'),
    )
    op.add_column(
        'safety_recommendations',
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.alter_column(
        'safety_recommendations',
        'experiment_id',
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'safety_recommendations',
        'experiment_id',
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.drop_column('safety_recommendations', 'created_at')
    op.drop_column('safety_recommendations', 'source')
