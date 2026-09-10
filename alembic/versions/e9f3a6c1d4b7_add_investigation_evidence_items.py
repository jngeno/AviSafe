"""add investigation_evidence_items

Revision ID: e9f3a6c1d4b7
Revises: c7e2b4f8a1d3
Create Date: 2026-09-04 03:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e9f3a6c1d4b7'
down_revision: Union[str, Sequence[str], None] = 'c7e2b4f8a1d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'investigation_evidence_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'investigation_id',
            sa.Integer(),
            sa.ForeignKey('investigation_records.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('source_type', sa.String(length=50), nullable=False, server_default='Other'),
        sa.Column('reference', sa.String(length=500), nullable=False, server_default=''),
        sa.Column('added_by', sa.String(length=150), nullable=False, server_default=''),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        'ix_investigation_evidence_items_investigation_id',
        'investigation_evidence_items',
        ['investigation_id'],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_investigation_evidence_items_investigation_id', table_name='investigation_evidence_items')
    op.drop_table('investigation_evidence_items')
