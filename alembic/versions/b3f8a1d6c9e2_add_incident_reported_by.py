"""add incident_records.reported_by

Revision ID: b3f8a1d6c9e2
Revises: a8c2f5e7d4b9
Create Date: 2026-09-04 01:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3f8a1d6c9e2'
down_revision: Union[str, Sequence[str], None] = 'a8c2f5e7d4b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'incident_records',
        sa.Column('reported_by', sa.String(length=150), nullable=False, server_default=''),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('incident_records', 'reported_by')
