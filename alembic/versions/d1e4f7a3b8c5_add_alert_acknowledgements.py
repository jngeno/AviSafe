"""add alert_acknowledgements

Revision ID: d1e4f7a3b8c5
Revises: b3f8a1d6c9e2
Create Date: 2026-09-04 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1e4f7a3b8c5'
down_revision: Union[str, Sequence[str], None] = 'b3f8a1d6c9e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'alert_acknowledgements',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('alert_key', sa.String(length=255), nullable=False),
        sa.Column('acknowledged_by', sa.String(length=150), nullable=False, server_default=''),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        'ix_alert_acknowledgements_alert_key', 'alert_acknowledgements', ['alert_key'], unique=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_alert_acknowledgements_alert_key', table_name='alert_acknowledgements')
    op.drop_table('alert_acknowledgements')
