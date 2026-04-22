"""Окружение тестов: по умолчанию SQLite-файл `tests/._test.sqlite` (см. .gitignore)."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from pathlib import Path

# До любого `import app.*`
if os.environ.get("TEST_DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]
else:
    _sqlite = Path(__file__).resolve().parent / "._test.sqlite"
    _sqlite.unlink(missing_ok=True)
    os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_sqlite.as_posix()}"

if len(os.environ.get("AUTH_JWT_SECRET", "")) < 32:
    os.environ["AUTH_JWT_SECRET"] = "t" * 32
# Не тянем DEV/DEBUG из .env разработчика: стабильные assert и меньше шума SQL в логе
os.environ["DEV"] = "false"
os.environ["DEBUG"] = "false"
os.environ.setdefault("TELEGRAM_BOT_TOKEN", "test")
os.environ.setdefault("TELEGRAM_ALLOWED_USER_IDS", "")
os.environ.setdefault("CORS_ORIGINS", "http://test")

import httpx
import pytest_asyncio
from sqlalchemy import text

from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401, E402 — маппинг на Base

from app.main import app  # noqa: E402


@pytest_asyncio.fixture(autouse=True)
async def _reset_db() -> AsyncIterator[None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        if engine.dialect.name == "sqlite":
            await conn.execute(text("PRAGMA foreign_keys=ON"))
    yield


@pytest_asyncio.fixture
async def client() -> AsyncIterator[httpx.AsyncClient]:
    # httpx ≥0.28: lifespan=…; в более старых версиях без него
    try:
        transport = httpx.ASGITransport(app=app, lifespan="on")
    except TypeError:
        transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_token(client: httpx.AsyncClient) -> str:
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": "user@example.com", "password": "secretpass8"},
    )
    assert r.status_code == 201, r.text
    return r.json()["access_token"]


@pytest_asyncio.fixture
async def auth_headers(auth_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {auth_token}"}
