"""add safety_action_records and safety_action_comments

Revision ID: a8c2f5e7d4b9
Revises: f7d4b6e9a2c1
Create Date: 2026-09-04 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a8c2f5e7d4b9'
down_revision: Union[str, Sequence[str], None] = 'f7d4b6e9a2c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'safety_action_records',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False, server_default=''),
        sa.Column(
            'linked_recommendation_id',
            sa.Integer(),
            sa.ForeignKey('safety_recommendations.id', ondelete='SET NULL'),
            nullable=True,
        ),
        sa.Column('owner', sa.String(length=150), nullable=False, server_default=''),
        sa.Column('priority', sa.String(length=20), nullable=False, server_default='Medium'),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='Open'),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('verification_notes', sa.Text(), nullable=False, server_default=''),
        sa.Column('closed_at', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_safety_action_records_priority', 'safety_action_records', ['priority'])
    op.create_index('ix_safety_action_records_status', 'safety_action_records', ['status'])

    op.create_table(
        'safety_action_comments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column(
            'action_id',
            sa.Integer(),
            sa.ForeignKey('safety_action_records.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('author', sa.String(length=150), nullable=False, server_default=''),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_safety_action_comments_action_id', 'safety_action_comments', ['action_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_safety_action_comments_action_id', table_name='safety_action_comments')
    op.drop_table('safety_action_comments')
    op.drop_index('ix_safety_action_records_status', table_name='safety_action_records')
    op.drop_index('ix_safety_action_records_priority', table_name='safety_action_records')
    op.drop_table('safety_action_records')
