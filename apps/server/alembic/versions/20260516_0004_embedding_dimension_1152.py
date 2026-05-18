from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision = "20260516_0004"
down_revision = "20260515_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE knowledge_cards
        SET
            embedding = NULL,
            embedding_model = NULL,
            embedding_updated_at = NULL
        """
    )

    with op.batch_alter_table("knowledge_cards") as batch_op:
        batch_op.drop_column("embedding")
        batch_op.add_column(sa.Column("embedding", Vector(768), nullable=True))


def downgrade() -> None:
    op.execute(
        """
        UPDATE knowledge_cards
        SET
            embedding = NULL,
            embedding_model = NULL,
            embedding_updated_at = NULL
        """
    )

    with op.batch_alter_table("knowledge_cards") as batch_op:
        batch_op.drop_column("embedding")
        batch_op.add_column(sa.Column("embedding", Vector(1536), nullable=True))
