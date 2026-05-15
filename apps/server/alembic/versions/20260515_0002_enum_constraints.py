from __future__ import annotations

from alembic import op


revision = "20260515_0002"
down_revision = "20260514_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE knowledge_cards
        SET
            card_type = CASE
                WHEN card_type IN ('concept', 'method', 'summary', 'example', 'correction')
                    THEN card_type
                ELSE 'concept'
            END,
            status = CASE
                WHEN status IN ('draft', 'active', 'archived')
                    THEN status
                ELSE 'active'
            END,
            source_type = CASE
                WHEN source_type IN ('manual', 'document', 'chat', 'ai')
                    THEN source_type
                ELSE 'manual'
            END
        WHERE
            card_type NOT IN ('concept', 'method', 'summary', 'example', 'correction')
            OR status NOT IN ('draft', 'active', 'archived')
            OR source_type NOT IN ('manual', 'document', 'chat', 'ai')
        """
    )
    op.execute(
        """
        UPDATE documents
        SET parse_status = 'pending'
        WHERE parse_status NOT IN ('pending', 'processing', 'success', 'failed')
        """
    )
    op.execute(
        """
        UPDATE messages
        SET
            role = CASE
                WHEN role IN ('user', 'assistant') THEN role
                ELSE 'assistant'
            END,
            status = CASE
                WHEN status IN ('streaming', 'done', 'failed', 'aborted') THEN status
                ELSE 'done'
            END
        WHERE role NOT IN ('user', 'assistant')
           OR status NOT IN ('streaming', 'done', 'failed', 'aborted')
        """
    )
    op.execute(
        """
        UPDATE users
        SET auth_provider = 'local'
        WHERE auth_provider NOT IN ('local', 'oauth')
        """
    )

    op.create_check_constraint(
        "ck_knowledge_cards_card_type",
        "knowledge_cards",
        "card_type IN ('concept', 'method', 'summary', 'example', 'correction')",
    )
    op.create_check_constraint(
        "ck_knowledge_cards_status",
        "knowledge_cards",
        "status IN ('draft', 'active', 'archived')",
    )
    op.create_check_constraint(
        "ck_knowledge_cards_source_type",
        "knowledge_cards",
        "source_type IN ('manual', 'document', 'chat', 'ai')",
    )
    op.create_check_constraint(
        "ck_documents_parse_status",
        "documents",
        "parse_status IN ('pending', 'processing', 'success', 'failed')",
    )
    op.create_check_constraint(
        "ck_messages_role",
        "messages",
        "role IN ('user', 'assistant')",
    )
    op.create_check_constraint(
        "ck_messages_status",
        "messages",
        "status IN ('streaming', 'done', 'failed', 'aborted')",
    )
    op.create_check_constraint(
        "ck_users_auth_provider",
        "users",
        "auth_provider IN ('local', 'oauth')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_auth_provider", "users", type_="check")
    op.drop_constraint("ck_messages_status", "messages", type_="check")
    op.drop_constraint("ck_messages_role", "messages", type_="check")
    op.drop_constraint("ck_documents_parse_status", "documents", type_="check")
    op.drop_constraint("ck_knowledge_cards_source_type", "knowledge_cards", type_="check")
    op.drop_constraint("ck_knowledge_cards_status", "knowledge_cards", type_="check")
    op.drop_constraint("ck_knowledge_cards_card_type", "knowledge_cards", type_="check")
