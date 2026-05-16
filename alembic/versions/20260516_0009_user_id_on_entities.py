"""add user_id to leads, tasks, tags, calendar_export_settings

Revision ID: 0009_user_id_on_entities
Revises: 0008_user_auth
Create Date: 2026-05-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_user_id_on_entities"
down_revision: Union[str, None] = "0008_user_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- leads ---
    op.add_column("leads", sa.Column("user_id", sa.Integer(), nullable=True))
    op.execute("UPDATE leads SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE user_id IS NULL")
    op.alter_column("leads", "user_id", nullable=False)
    op.create_foreign_key("fk_leads_user_id", "leads", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.create_index("ix_leads_user_id", "leads", ["user_id"])

    # --- tasks ---
    op.add_column("tasks", sa.Column("user_id", sa.Integer(), nullable=True))
    op.execute("UPDATE tasks SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE user_id IS NULL")
    op.alter_column("tasks", "user_id", nullable=False)
    op.create_foreign_key("fk_tasks_user_id", "tasks", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.create_index("ix_tasks_user_id", "tasks", ["user_id"])

    # --- tags: drop old global unique, add user_id, add composite unique ---
    op.drop_index("ix_tags_name", table_name="tags")
    op.add_column("tags", sa.Column("user_id", sa.Integer(), nullable=True))
    op.execute("UPDATE tags SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE user_id IS NULL")
    op.alter_column("tags", "user_id", nullable=False)
    op.create_foreign_key("fk_tags_user_id", "tags", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.create_index("ix_tags_user_id", "tags", ["user_id"])
    op.create_index("ix_tags_name", "tags", ["name"])
    op.create_unique_constraint("uq_tags_name_user", "tags", ["name", "user_id"])

    # --- calendar_export_settings ---
    op.add_column("calendar_export_settings", sa.Column("user_id", sa.Integer(), nullable=True))
    op.execute(
        "UPDATE calendar_export_settings SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE user_id IS NULL"
    )
    op.alter_column("calendar_export_settings", "user_id", nullable=False)
    op.create_foreign_key(
        "fk_cal_export_user_id",
        "calendar_export_settings",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_unique_constraint("uq_cal_export_user_id", "calendar_export_settings", ["user_id"])


def downgrade() -> None:
    op.drop_constraint("uq_cal_export_user_id", "calendar_export_settings", type_="unique")
    op.drop_constraint("fk_cal_export_user_id", "calendar_export_settings", type_="foreignkey")
    op.drop_column("calendar_export_settings", "user_id")

    op.drop_constraint("uq_tags_name_user", "tags", type_="unique")
    op.drop_index("ix_tags_name", table_name="tags")
    op.drop_index("ix_tags_user_id", table_name="tags")
    op.drop_constraint("fk_tags_user_id", "tags", type_="foreignkey")
    op.drop_column("tags", "user_id")
    op.create_index("ix_tags_name", "tags", ["name"], unique=True)

    op.drop_index("ix_tasks_user_id", table_name="tasks")
    op.drop_constraint("fk_tasks_user_id", "tasks", type_="foreignkey")
    op.drop_column("tasks", "user_id")

    op.drop_index("ix_leads_user_id", table_name="leads")
    op.drop_constraint("fk_leads_user_id", "leads", type_="foreignkey")
    op.drop_column("leads", "user_id")
