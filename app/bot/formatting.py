from app.models import Lead, LeadStatus, Project, Task
from app.services import ReminderDigest


def _lead_line(lead: Lead) -> str:
    uname = f"@{lead.username}" if lead.username else "—"
    na = lead.next_action or "—"
    na_at = lead.next_action_at.strftime("%Y-%m-%d %H:%M") if lead.next_action_at else "—"
    return f"#{lead.id} {lead.full_name} ({uname})\n   статус: {lead.status.value} | next: {na} @ {na_at}"


def format_task_line(task: Task) -> str:
    due = task.due_at.strftime("%Y-%m-%d %H:%M") if task.due_at else "—"
    lead_part = ""
    if task.lead_id:
        lead_part = f" [лид #{task.lead_id}]"
    if task.project_id:
        lead_part += f" [проект #{task.project_id}]"
    return f"#{task.id} {task.title}{lead_part}\n   срок: {due} | приоритет: {task.priority.value}"


def format_project_line(project: Project) -> str:
    dl = project.deadline.strftime("%Y-%m-%d %H:%M") if project.deadline else "—"
    return (
        f"#{project.id} {project.title} (лид #{project.lead_id})\n"
        f"   статус: {project.status.value} | дедлайн: {dl} | приоритет: {project.priority.value}"
    )


def format_push_message(d: ReminderDigest) -> str:
    """Короткий текст для push: детали задач и лидов — в CRM, кнопки только для этапа."""
    lines: list[str] = ["LidoCRM · напоминание"]
    if d.overdue_tasks:
        lines.append(f"Просроченных задач: {len(d.overdue_tasks)} (отметьте в веб-интерфейсе).")
    if d.overdue_projects:
        lines.append(
            f"Просроченных проектов: {len(d.overdue_projects)} (дедлайн в CRM)."
        )
    if d.today_tasks:
        lines.append(f"Задач на сегодня: {len(d.today_tasks)}.")
    if d.stale_leads:
        lines.append(f"Без касания 7+ дн.: {len(d.stale_leads)} лид(ов).")
    if d.leads_next_action_due:
        lines.append(
            f"Лидов с наступившим шагом: {len(d.leads_next_action_due)}. "
            "Нажмите «Этап завершён» для нужного лида:"
        )
    if len(lines) == 1:
        return ""
    return "\n".join(lines)


def format_digest(d: ReminderDigest) -> str:
    lines: list[str] = []
    if d.overdue_tasks:
        lines.append("⚠️ Просроченные задачи:")
        lines.extend(format_task_line(t) for t in d.overdue_tasks)
        lines.append("")
    if d.overdue_projects:
        lines.append("⚠️ Просроченные проекты:")
        lines.extend(format_project_line(p) for p in d.overdue_projects)
        lines.append("")
    if d.today_tasks:
        lines.append("📅 Задачи на сегодня:")
        lines.extend(format_task_line(t) for t in d.today_tasks)
        lines.append("")
    overdue_ids = {p.id for p in d.overdue_projects}
    active_else = [p for p in d.active_projects if p.id not in overdue_ids]
    if active_else:
        lines.append("🚀 Проекты в работе (ещё не просрочены по дедлайну):")
        lines.extend(format_project_line(p) for p in active_else[:25])
        if len(active_else) > 25:
            lines.append(f"   … и ещё {len(active_else) - 25}")
        lines.append("")
    if d.leads_next_action_due:
        lines.append("✉️ Лиды — пора следующее действие:")
        lines.extend(_lead_line(x) for x in d.leads_next_action_due)
        lines.append("")
    if d.stale_leads:
        lines.append("💤 Давно без касания:")
        lines.extend(_lead_line(x) for x in d.stale_leads)
        lines.append("")
    if not lines:
        return "Нет элементов, требующих внимания."
    lines.insert(0, "Сводка CRM")
    return "\n".join(lines).strip()


def format_lead_card(lead: Lead) -> str:
    parts = [
        f"{lead.full_name} #{lead.id}",
        f"Статус: {lead.status.value}",
    ]
    if lead.username:
        parts.append(f"Username: @{lead.username}")
    if lead.telegram_id:
        parts.append(f"TG id: {lead.telegram_id}")
    if lead.phone:
        parts.append(f"Телефон: {lead.phone}")
    if lead.profile_url:
        parts.append(f"Ссылка: {lead.profile_url}")
    if lead.source:
        parts.append(f"Источник: {lead.source}")
    if lead.niche:
        parts.append(f"Ниша: {lead.niche}")
    if lead.budget:
        parts.append(f"Бюджет: {lead.budget}")
    if lead.comment:
        parts.append(f"Комментарий: {lead.comment}")
    lc = lead.last_contact_at.strftime("%Y-%m-%d %H:%M") if lead.last_contact_at else "—"
    parts.append(f"Последний контакт: {lc}")
    na = lead.next_action or "—"
    na_at = lead.next_action_at.strftime("%Y-%m-%d %H:%M") if lead.next_action_at else "—"
    parts.append(f"След. шаг: {na}")
    parts.append(f"След. шаг к: {na_at}")
    if lead.tags:
        parts.append("Теги: " + ", ".join(t.name for t in lead.tags))
    return "\n".join(parts)


def format_lead_status_label(status: LeadStatus) -> str:
    labels = {
        LeadStatus.new: "Новый",
        LeadStatus.in_work: "В работе",
        LeadStatus.first_contact: "Первый контакт",
        LeadStatus.need_identified: "Потребность выявлена",
        LeadStatus.offer_sent: "Оффер отправлен",
        LeadStatus.thinking: "Думает",
        LeadStatus.follow_up: "Фоллоу-ап",
        LeadStatus.paid: "Оплата",
        LeadStatus.postponed: "Отложено",
        LeadStatus.rejected: "Отказ",
    }
    return labels.get(status, status.value)
