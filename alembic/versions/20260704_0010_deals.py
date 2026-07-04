"""deals table

Revision ID: 0010_deals
Revises: 0009_user_id_on_entities
Create Date: 2026-07-04

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_deals"
down_revision: Union[str, None] = "0009_user_id_on_entities"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "deals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("lead_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="RUB"),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="qualification"),
        sa.Column("probability", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("expected_close_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_deals_user_id"), "deals", ["user_id"], unique=False)
    op.create_index(op.f("ix_deals_lead_id"), "deals", ["lead_id"], unique=False)
    op.create_index(op.f("ix_deals_status"), "deals", ["status"], unique=False)
    op.create_index(op.f("ix_deals_expected_close_date"), "deals", ["expected_close_date"], unique=False)
    op.create_index(op.f("ix_deals_is_active"), "deals", ["is_active"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_deals_is_active"), table_name="deals")
    op.drop_index(op.f("ix_deals_expected_close_date"), table_name="deals")
    op.drop_index(op.f("ix_deals_status"), table_name="deals")
    op.drop_index(op.f("ix_deals_lead_id"), table_name="deals")
    op.drop_index(op.f("ix_deals_user_id"), table_name="deals")
    op.drop_table("deals")
