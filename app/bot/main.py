import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher

from app.bot.handlers import reminder_loop, router
from app.config import get_settings

logging.basicConfig(level=logging.INFO, stream=sys.stdout)


async def run() -> None:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")
    bot = Bot(token=settings.telegram_bot_token)
    dp = Dispatcher()
    dp.include_router(router)
    asyncio.create_task(reminder_loop(bot))
    await dp.start_polling(bot)


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
