from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from app.models import Lead


def advance_keyboard_from_leads(leads: list[Lead]) -> InlineKeyboardMarkup | None:
    """Одна кнопка на лид: перевод на следующий этап воронки (не более 10 рядов)."""
    if not leads:
        return None
    rows: list[list[InlineKeyboardButton]] = []
    for lead in leads[:10]:
        short = lead.full_name[:24] + ("…" if len(lead.full_name) > 24 else "")
        rows.append(
            [
                InlineKeyboardButton(
                    text=f"✓ Этап: {short} · #{lead.id}",
                    callback_data=f"lead:advance:{lead.id}",
                )
            ]
        )
    return InlineKeyboardMarkup(inline_keyboard=rows)
