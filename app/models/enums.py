import enum


class LeadStatus(str, enum.Enum):
    new = "new"
    in_work = "in_work"
    first_contact = "first_contact"
    need_identified = "need_identified"
    offer_sent = "offer_sent"
    thinking = "thinking"
    follow_up = "follow_up"
    paid = "paid"
    postponed = "postponed"
    rejected = "rejected"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class TaskPriority(str, enum.Enum):
    low = "low"
    normal = "normal"
    high = "high"


class ProjectStatus(str, enum.Enum):
    planned = "planned"
    in_progress = "in_progress"
    waiting_client = "waiting_client"
    on_hold = "on_hold"
    completed = "completed"
    cancelled = "cancelled"


class ProjectPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class InteractionType(str, enum.Enum):
    note = "note"
    call = "call"
    message = "message"
    telegram = "telegram"
    email = "email"
    meeting = "meeting"
    other = "other"
