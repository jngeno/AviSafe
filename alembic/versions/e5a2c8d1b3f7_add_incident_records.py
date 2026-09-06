"""add incident_records

Revision ID: e5a2c8d1b3f7
Revises: c3b7e1a4f9d6
Create Date: 2026-09-04 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5a2c8d1b3f7'
down_revision: Union[str, Sequence[str], None] = 'c3b7e1a4f9d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'incident_records',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('event_type', sa.String(length=30), nullable=False, server_default='Safety Report'),
        sa.Column('category', sa.String(length=100), nullable=False, server_default=''),
        sa.Column('severity', sa.String(length=20), nullable=False, server_default='Medium'),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='New'),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('occurred_at', sa.Date(), nullable=True),
        sa.Column('location', sa.String(length=200), nullable=False, server_default=''),
        sa.Column('airport', sa.String(length=200), nullable=False, server_default=''),
        sa.Column('aircraft', sa.String(length=150), nullable=False, server_default=''),
        sa.Column('operator', sa.String(length=150), nullable=False, server_default=''),
        sa.Column('flight_phase', sa.String(length=100), nullable=False, server_default=''),
        sa.Column('weather', sa.String(length=100), nullable=False, server_default=''),
        sa.Column('assigned_investigator', sa.String(length=150), nullable=False, server_default=''),
        sa.Column(
            'linked_recommendation_id',
            sa.Integer(),
            sa.ForeignKey('safety_recommendations.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_incident_records_event_type', 'incident_records', ['event_type'])
    op.create_index('ix_incident_records_category', 'incident_records', ['category'])
    op.create_index('ix_incident_records_severity', 'incident_records', ['severity'])
    op.create_index('ix_incident_records_status', 'incident_records', ['status'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_incident_records_status', table_name='incident_records')
    op.drop_index('ix_incident_records_severity', table_name='incident_records')
    op.drop_index('ix_incident_records_category', table_name='incident_records')
    op.drop_index('ix_incident_records_event_type', table_name='incident_records')
    op.drop_table('incident_records')
