from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision = "20260515_0003"
down_revision = "20260515_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "knowledge_sources",
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("source_type", sa.String(length=20), nullable=False),
        sa.Column("raw_content", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("source_meta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "source_type IN ('manual_text', 'document', 'messages')",
            name="ck_knowledge_sources_source_type",
        ),
        sa.CheckConstraint(
            "status IN ('processing', 'ready', 'failed')",
            name="ck_knowledge_sources_status",
        ),
    )
    op.create_index(op.f("ix_knowledge_sources_user_id"), "knowledge_sources", ["user_id"], unique=False)
    op.create_index(op.f("ix_knowledge_sources_status"), "knowledge_sources", ["status"], unique=False)

    with op.batch_alter_table("knowledge_cards") as batch_op:
        batch_op.drop_constraint("ck_knowledge_cards_card_type", type_="check")
        batch_op.drop_constraint("ck_knowledge_cards_status", type_="check")
        batch_op.drop_constraint("ck_knowledge_cards_source_type", type_="check")
        batch_op.add_column(sa.Column("source_id", sa.String(length=36), nullable=True))
        batch_op.add_column(sa.Column("embedding", Vector(1536), nullable=True))
        batch_op.add_column(sa.Column("embedding_model", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("embedding_updated_at", sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column("content_hash", sa.String(length=64), nullable=True))

    op.execute(
        """
        UPDATE knowledge_cards
        SET
            status = CASE
                WHEN status = 'draft' THEN 'pending'
                WHEN status IN ('active', 'archived') THEN status
                ELSE 'pending'
            END,
            source_type = CASE
                WHEN source_type = 'manual' THEN 'manual_text'
                WHEN source_type = 'document' THEN 'document'
                WHEN source_type = 'chat' THEN 'messages'
                WHEN source_type = 'ai' THEN 'manual_text'
                ELSE 'manual_text'
            END
        """
    )

    with op.batch_alter_table("knowledge_cards") as batch_op:
        batch_op.drop_column("summary")
        batch_op.drop_column("card_type")
        batch_op.create_foreign_key(
            "fk_knowledge_cards_source_id_knowledge_sources",
            "knowledge_sources",
            ["source_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_index(op.f("ix_knowledge_cards_source_id"), ["source_id"], unique=False)
        batch_op.create_index(op.f("ix_knowledge_cards_content_hash"), ["content_hash"], unique=False)
        batch_op.create_check_constraint(
            "ck_knowledge_cards_status",
            "status IN ('pending', 'active', 'archived')",
        )
        batch_op.create_check_constraint(
            "ck_knowledge_cards_source_type",
            "source_type IN ('manual_text', 'document', 'messages')",
        )

    op.create_index(
        "ix_knowledge_cards_active_retrieval",
        "knowledge_cards",
        ["user_id", "status", "updated_at"],
        unique=False,
    )

    op.create_table(
        "card_groups",
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_card_groups_user_id"), "card_groups", ["user_id"], unique=False)

    op.create_table(
        "card_group_items",
        sa.Column("group_id", sa.String(length=36), nullable=False),
        sa.Column("card_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["card_id"], ["knowledge_cards.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["group_id"], ["card_groups.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("group_id", "card_id"),
        sa.UniqueConstraint("group_id", "card_id", name="uq_card_group_items_group_card"),
    )


def downgrade() -> None:
    op.drop_table("card_group_items")
    op.drop_index(op.f("ix_card_groups_user_id"), table_name="card_groups")
    op.drop_table("card_groups")

    op.drop_index("ix_knowledge_cards_active_retrieval", table_name="knowledge_cards")
    with op.batch_alter_table("knowledge_cards") as batch_op:
        batch_op.drop_constraint("ck_knowledge_cards_source_type", type_="check")
        batch_op.drop_constraint("ck_knowledge_cards_status", type_="check")
        batch_op.drop_index(op.f("ix_knowledge_cards_content_hash"))
        batch_op.drop_index(op.f("ix_knowledge_cards_source_id"))
        batch_op.drop_constraint("fk_knowledge_cards_source_id_knowledge_sources", type_="foreignkey")
        batch_op.add_column(sa.Column("card_type", sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column("summary", sa.Text(), nullable=True))
        batch_op.drop_column("content_hash")
        batch_op.drop_column("embedding_updated_at")
        batch_op.drop_column("embedding_model")
        batch_op.drop_column("embedding")
        batch_op.drop_column("source_id")
        batch_op.create_check_constraint(
            "ck_knowledge_cards_card_type",
            "card_type IN ('concept', 'method', 'summary', 'example', 'correction')",
        )
        batch_op.create_check_constraint(
            "ck_knowledge_cards_status",
            "status IN ('draft', 'active', 'archived')",
        )
        batch_op.create_check_constraint(
            "ck_knowledge_cards_source_type",
            "source_type IN ('manual', 'document', 'chat', 'ai')",
        )

    op.execute(
        """
        UPDATE knowledge_cards
        SET
            status = CASE
                WHEN status = 'pending' THEN 'draft'
                WHEN status IN ('active', 'archived') THEN status
                ELSE 'draft'
            END,
            source_type = CASE
                WHEN source_type = 'manual_text' THEN 'manual'
                WHEN source_type = 'document' THEN 'document'
                WHEN source_type = 'messages' THEN 'chat'
                ELSE 'manual'
            END,
            card_type = 'concept'
        """
    )

    op.drop_index(op.f("ix_knowledge_sources_status"), table_name="knowledge_sources")
    op.drop_index(op.f("ix_knowledge_sources_user_id"), table_name="knowledge_sources")
    op.drop_table("knowledge_sources")
