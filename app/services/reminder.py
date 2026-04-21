from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Lead, Project, Task
from app.repositories import LeadRepository
from app.services.project import ProjectService
from app.services.task import TaskService


@dataclass
class ReminderDigest:
    overdue_tasks: list[Task]
    today_tasks: list[Task]
    leads_next_action_due: list[Lead]
    stale_leads: list[Lead]
    overdue_projects: list[Project]
    active_projects: list[Project]
    generated_at: datetime

    @property
    def has_any(self) -> bool:
        return bool(
            self.overdue_tasks
            or self.today_tasks
            or self.leads_next_action_due
            or self.stale_leads
            or self.overdue_projects
        )


class ReminderService:
    """Aggregates due items for bot push and /digest. Keeps DB reads in one place."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.tasks = TaskService(session)
        self.projects = ProjectService(session)
        self.leads = LeadRepository(session)

    def _now_utc(self) -> datetime:
        return datetime.now(tz=ZoneInfo("UTC"))

    async def build_digest(self, *, stale_days: int = 7) -> ReminderDigest:
        now = self._now_utc()
        overdue = await self.tasks.overdue()
        today = await self.tasks.due_today()
        due_leads = await self.leads.list_next_action_due(before=now)
        stale = await self.leads.list_no_contact_days(stale_days, now=now)
        overdue_projects = await self.projects.list_overdue()
        active_projects = await self.projects.list_active(limit=40)

        return ReminderDigest(
            overdue_tasks=overdue,
            today_tasks=today,
            leads_next_action_due=due_leads,
            stale_leads=stale,
            overdue_projects=overdue_projects,
            active_projects=active_projects,
            generated_at=now,
        )
