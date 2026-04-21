"""Сборка .ics для подписки из Google Calendar и др."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from icalendar import Calendar, Event
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Lead, Project, Task, TaskStatus
from app.models.enums import ProjectStatus


def _utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


async def build_lidocrm_calendar_ics(session: AsyncSession) -> bytes:
    now = datetime.now(tz=UTC)

    tasks = (
        await session.scalars(
            select(Task).where(
                Task.due_at.is_not(None),
                Task.status.in_((TaskStatus.pending, TaskStatus.in_progress)),
            )
        )
    ).all()

    leads = (
        await session.scalars(
            select(Lead).where(
                Lead.is_active == True,  # noqa: E712
                Lead.next_action_at.is_not(None),
            )
        )
    ).all()

    projects = (
        await session.scalars(
            select(Project).where(
                Project.is_active == True,  # noqa: E712
                Project.deadline.is_not(None),
                Project.status.not_in((ProjectStatus.completed, ProjectStatus.cancelled)),
            )
        )
    ).all()

    cal = Calendar()
    cal.add("prodid", "-//LidoCRM//Export//RU")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")
    cal.add("method", "PUBLISH")
    cal.add("x-wr-calname", "LidoCRM")
    cal.add("x-wr-timezone", "UTC")

    for t in tasks:
        assert t.due_at is not None
        start = _utc(t.due_at)
        end = start + timedelta(hours=1)
        ev = Event()
        ev.add("uid", f"lidocrm-task-{t.id}@lidocrm")
        ev.add("summary", f"[CRM] {t.title}")
        if t.description:
            ev.add("description", t.description[:8000])
        ev.add("dtstart", start)
        ev.add("dtend", end)
        ev.add("dtstamp", now)
        cal.add_component(ev)

    for lead in leads:
        if not lead.next_action or not lead.next_action.strip():
            continue
        assert lead.next_action_at is not None
        start = _utc(lead.next_action_at)
        end = start + timedelta(hours=1)
        ev = Event()
        ev.add("uid", f"lidocrm-lead-next-{lead.id}@lidocrm")
        ev.add("summary", f"[CRM] {lead.full_name}: напоминание")
        ev.add("description", lead.next_action[:8000])
        ev.add("dtstart", start)
        ev.add("dtend", end)
        ev.add("dtstamp", now)
        cal.add_component(ev)

    for p in projects:
        assert p.deadline is not None
        start = _utc(p.deadline)
        end = start + timedelta(hours=1)
        ev = Event()
        ev.add("uid", f"lidocrm-project-{p.id}@lidocrm")
        ev.add("summary", f"[CRM] Проект: {p.title}")
        if p.description:
            ev.add("description", p.description[:4000])
        ev.add("dtstart", start)
        ev.add("dtend", end)
        ev.add("dtstamp", now)
        cal.add_component(ev)

    return cal.to_ical()
