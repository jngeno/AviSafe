"""add investigation_records and investigation_timeline_entries

Revision ID: f7d4b6e9a2c1
Revises: e5a2c8d1b3f7
Create Date: 2026-09-04 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f7d4b6e9a2c1'
down_revision: Union[str, Sequence[str], None] = 'e5a2c8d1b3f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'investigation_records',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'incident_id',
            sa.Integer(),
            sa.ForeignKey('incident_records.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('lead_investigator', sa.String(length=150), nullable=False, server_default=''),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='Open'),
        sa.Column('summary', sa.Text(), nullable=False, server_default=''),
        sa.Column('root_cause', sa.Text(), nullable=False, server_default=''),
        sa.Column('contributing_factors', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('started_at', sa.Date(), nullable=True),
        sa.Column('target_completion', sa.Date(), nullable=True),
        sa.Column('completed_at', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_investigation_records_incident_id', 'investigation_records', ['incident_id'])
    op.create_index('ix_investigation_records_status', 'investigation_records', ['status'])

    op.create_table(
        'investigation_timeline_entries',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'investigation_id',
            sa.Integer(),
            sa.ForeignKey('investigation_records.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('occurred_at', sa.Date(), nullable=True),
        sa.Column('note', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        'ix_investigation_timeline_entries_investigation_id',
        'investigation_timeline_entries',
        ['investigation_id'],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_investigation_timeline_entries_investigation_id', table_name='investigation_timeline_entries')
    op.drop_table('investigation_timeline_entries')
    op.drop_index('ix_investigation_records_status', table_name='investigation_records')
    op.drop_index('ix_investigation_records_incident_id', table_name='investigation_records')
    op.drop_table('investigation_records')
