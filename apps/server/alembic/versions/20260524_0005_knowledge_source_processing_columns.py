"""add knowledge source processing columns

Revision ID: 20260524_0005
Revises: 20260516_0004
Create Date: 2026-05-24 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260524_0005"
down_revision = "20260516_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("knowledge_sources") as batch_op:
        batch_op.add_column(sa.Column("failure_reason", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("processing_meta", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("knowledge_sources") as batch_op:
        batch_op.drop_column("processing_meta")
        batch_op.drop_column("failure_reason")
