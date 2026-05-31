"""add knowledge source oss object key

Revision ID: 20260531_0006
Revises: 20260524_0005
Create Date: 2026-05-31 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260531_0006"
down_revision = "20260524_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("knowledge_sources") as batch_op:
        batch_op.add_column(sa.Column("oss_object_key", sa.String(length=500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("knowledge_sources") as batch_op:
        batch_op.drop_column("oss_object_key")
