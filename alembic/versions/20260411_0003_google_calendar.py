"""google calendar integration and event ids on tasks/leads

Revision ID: 0003_google_calendar
Revises: 0002_projects
Create Date: 2026-04-11

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_google_calendar"
down_revision: Union[str, None] = "0002_projects"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "calendar_integration",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("access_token", sa.Text(), nullable=True),
        sa.Column("access_token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("calendar_id", sa.String(length=256), nullable=False, server_default="primary"),
        sa.Column("oauth_state", sa.String(length=128), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column(
        "tasks",
        sa.Column("google_calendar_event_id", sa.String(length=1024), nullable=True),
    )
    op.create_index(
        op.f("ix_tasks_google_calendar_event_id"),
        "tasks",
        ["google_calendar_event_id"],
        unique=False,
    )
    op.add_column(
        "leads",
        sa.Column("next_action_google_event_id", sa.String(length=1024), nullable=True),
    )
    op.create_index(
        op.f("ix_leads_next_action_google_event_id"),
        "leads",
        ["next_action_google_event_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_leads_next_action_google_event_id"), table_name="leads")
    op.drop_column("leads", "next_action_google_event_id")
    op.drop_index(op.f("ix_tasks_google_calendar_event_id"), table_name="tasks")
    op.drop_column("tasks", "google_calendar_event_id")
    op.drop_table("calendar_integration")
