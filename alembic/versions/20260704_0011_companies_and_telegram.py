"""companies table, lead.company_id, user.telegram_user_id

Revision ID: 0011_companies_and_telegram
Revises: 0010_deals
Create Date: 2026-07-04

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_companies_and_telegram"
down_revision: Union[str, None] = "0010_deals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=False),
        sa.Column("website", sa.String(length=1024), nullable=True),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
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
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_companies_user_id"), "companies", ["user_id"], unique=False)
    op.create_index(op.f("ix_companies_is_active"), "companies", ["is_active"], unique=False)

    op.add_column("leads", sa.Column("company_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_leads_company_id"), "leads", ["company_id"], unique=False)
    op.create_foreign_key(
        "leads_company_id_fkey",
        "leads",
        "companies",
        ["company_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column("users", sa.Column("telegram_user_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_users_telegram_user_id"), "users", ["telegram_user_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_telegram_user_id"), table_name="users")
    op.drop_column("users", "telegram_user_id")

    op.drop_constraint("leads_company_id_fkey", "leads", type_="foreignkey")
    op.drop_index(op.f("ix_leads_company_id"), table_name="leads")
    op.drop_column("leads", "company_id")

    op.drop_index(op.f("ix_companies_is_active"), table_name="companies")
    op.drop_index(op.f("ix_companies_user_id"), table_name="companies")
    op.drop_table("companies")
