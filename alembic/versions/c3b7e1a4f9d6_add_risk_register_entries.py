"""add risk_register_entries

Revision ID: c3b7e1a4f9d6
Revises: a1f9c3d0e7b2
Create Date: 2026-09-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3b7e1a4f9d6'
down_revision: Union[str, Sequence[str], None] = 'a1f9c3d0e7b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'risk_register_entries',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False, server_default=''),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column('likelihood', sa.Integer(), nullable=False),
        sa.Column('severity', sa.Integer(), nullable=False),
        sa.Column('risk_score', sa.Integer(), nullable=False),
        sa.Column('risk_level', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='Identified'),
        sa.Column('owner', sa.String(length=150), nullable=False, server_default=''),
        sa.Column('mitigation', sa.Text(), nullable=False, server_default=''),
        sa.Column(
            'linked_recommendation_id',
            sa.Integer(),
            sa.ForeignKey('safety_recommendations.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('review_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_risk_register_entries_category', 'risk_register_entries', ['category'])
    op.create_index('ix_risk_register_entries_risk_score', 'risk_register_entries', ['risk_score'])
    op.create_index('ix_risk_register_entries_risk_level', 'risk_register_entries', ['risk_level'])
    op.create_index('ix_risk_register_entries_status', 'risk_register_entries', ['status'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_risk_register_entries_status', table_name='risk_register_entries')
    op.drop_index('ix_risk_register_entries_risk_level', table_name='risk_register_entries')
    op.drop_index('ix_risk_register_entries_risk_score', table_name='risk_register_entries')
    op.drop_index('ix_risk_register_entries_category', table_name='risk_register_entries')
    op.drop_table('risk_register_entries')
