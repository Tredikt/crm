from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Router
from aiogram.filters import BaseFilter, Command
from aiogram.types import CallbackQuery, Message, TelegramObject

from app.bot import formatting, keyboards
from sqlalchemy import select

from app.config import get_settings
from app.db.session import async_session_factory
from app.models.user import User
from app.services import LeadService, ReminderService
from app.services.lead import LeadFunnelCompleteError, LeadNotFoundError

log = logging.getLogger(__name__)
router = Router(name="crm")


async def _get_user_id_for_telegram(session, telegram_user_id: int) -> int | None:
    user = await session.scalar(select(User).where(User.telegram_user_id == telegram_user_id))
    if user is not None:
        return user.id
    users = list(await session.scalars(select(User).order_by(User.id)))
    if len(users) == 1:
        return users[0].id
    return None


async def _link_telegram_if_solo(session, telegram_user_id: int) -> bool:
    linked = await session.scalar(select(User).where(User.telegram_user_id == telegram_user_id))
    if linked is not None:
        return True
    unlinked = list(
        await session.scalars(select(User).where(User.telegram_user_id.is_(None)).order_by(User.id))
    )
    if len(unlinked) == 1:
        unlinked[0].telegram_user_id = telegram_user_id
        await session.commit()
        return True
    return False


class AllowedUsersFilter(BaseFilter):
    async def __call__(self, event: TelegramObject) -> bool:  # type: ignore[override]
        settings = get_settings()
        allowed = settings.allowed_telegram_user_ids_set
        uid: int | None = None
        if isinstance(event, Message) and event.from_user:
            uid = event.from_user.id
        if isinstance(event, CallbackQuery) and event.from_user:
            uid = event.from_user.id
        if uid is None:
            return False
        if not allowed:
            log.warning("TELEGRAM_ALLOWED_USER_IDS empty — bot open to anyone")
            return True
        return uid in allowed


router.message.filter(AllowedUsersFilter())
router.callback_query.filter(AllowedUsersFilter())


@router.message(Command("start"))
async def cmd_start(message: Message) -> None:
    linked_hint = ""
    if message.from_user:
        async with async_session_factory() as session:
            if await _link_telegram_if_solo(session, message.from_user.id):
                linked_hint = "\n\nTelegram привязан к вашему аккаунту CRM."
            elif await _get_user_id_for_telegram(session, message.from_user.id) is None:
                linked_hint = (
                    "\n\nЧтобы бот показывал ваши данные, укажите Telegram ID "
                    f"({message.from_user.id}) в Настройках CRM."
                )
    await message.answer(
        "LidoCRM — уведомления.\n\n"
        "При появлении просроченных задач и проектов или наступившего шага по лиду бот пришлёт сообщение. "
        "Под лидами с наступившим шагом будет кнопка «Этап завершён» — следующий этап воронки "
        "(остальное: задачи и статусы — в веб-интерфейсе).\n\n"
        "Команда /digest — полная текстовая сводка."
        f"{linked_hint}"
    )


@router.message(Command("digest"))
async def cmd_digest(message: Message) -> None:
    if not message.from_user:
        return
    async with async_session_factory() as session:
        user_id = await _get_user_id_for_telegram(session, message.from_user.id)
        if user_id is None:
            await message.answer(
                "Аккаунт не привязан. Укажите ваш Telegram ID в Настройках CRM "
                f"({message.from_user.id})."
            )
            return
        digest = await ReminderService(session, user_id).build_digest()
        await message.answer(formatting.format_digest(digest))


async def _send_answer(query: CallbackQuery, text: str, **kwargs) -> None:
    if query.message:
        await query.message.answer(text, **kwargs)
    elif query.from_user:
        await query.bot.send_message(query.from_user.id, text, **kwargs)


@router.callback_query()
async def on_callback(query: CallbackQuery) -> None:
    data = query.data or ""
    await query.answer()

    if data.startswith("lead:advance:"):
        lead_id = int(data.split(":")[2])
        if not query.from_user:
            return
        async with async_session_factory() as session:
            user_id = await _get_user_id_for_telegram(session, query.from_user.id)
            if user_id is None:
                await _send_answer(query, "Аккаунт не привязан. Настройте Telegram ID в CRM.")
                return
            svc = LeadService(session, user_id)
            try:
                lead = await svc.advance_funnel_stage(lead_id)
            except LeadNotFoundError:
                await _send_answer(query, "Лид не найден.")
                return
            except LeadFunnelCompleteError:
                await _send_answer(
                    query,
                    "Для этого статуса нет следующего этапа воронки. Измените этап в CRM.",
                )
                return
            label = formatting.format_lead_status_label(lead.status)
            await _send_answer(
                query,
                f"Этап обновлён → {label} ({lead.status.value})\n\n"
                f"{formatting.format_lead_card(lead)}",
            )
        return


def _push_dedup_key(digest) -> tuple:
    return (
        formatting.format_push_message(digest),
        tuple(x.id for x in digest.leads_next_action_due[:10]),
        len(digest.overdue_tasks),
        len(digest.today_tasks),
        len(digest.overdue_projects),
    )


async def reminder_loop(bot: Bot) -> None:
    settings = get_settings()
    recipients = settings.allowed_telegram_user_ids_set
    last_key_by_user: dict[int, tuple] = {}
    while True:
        await asyncio.sleep(max(15, settings.reminder_interval_seconds))
        if not recipients:
            continue
        try:
            async with async_session_factory() as session:
                for uid in recipients:
                    user_id = await _get_user_id_for_telegram(session, uid)
                    if user_id is None:
                        continue
                    digest = await ReminderService(session, user_id).build_digest()
                    if not digest.has_any:
                        last_key_by_user.pop(uid, None)
                        continue
                    msg = formatting.format_push_message(digest)
                    kb = keyboards.advance_keyboard_from_leads(digest.leads_next_action_due)
                    key = _push_dedup_key(digest)
                    if last_key_by_user.get(uid) == key:
                        continue
                    last_key_by_user[uid] = key
                    if not msg.strip() and kb is None:
                        continue
                    out = msg.strip() or "LidoCRM · есть элементы в сводке (/digest)."
                    await bot.send_message(uid, out, reply_markup=kb)
        except Exception:
            log.exception("reminder_loop tick failed")
