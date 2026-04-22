"""Интеграционные тесты HTTP API (локально: pytest). Покрывают маршруты из app/api/v1 и /health."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


# --- health ---


@pytest.mark.asyncio
async def test_health(client: AsyncClient) -> None:
    r = await client.get("/health")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok"
    assert "dev" not in j


# --- auth ---


@pytest.mark.asyncio
async def test_auth_register_login_me(
    client: AsyncClient,
    auth_token: str,
    auth_headers: dict[str, str],
) -> None:
    r = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "user@example.com"
    assert "id" in body

    r2 = await client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "secretpass8"},
    )
    assert r2.status_code == 200
    assert "access_token" in r2.json()


@pytest.mark.asyncio
async def test_auth_me_unauthorized(client: AsyncClient) -> None:
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_auth_register_duplicate(client: AsyncClient) -> None:
    r1 = await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@example.com", "password": "secretpass8"},
    )
    assert r1.status_code == 201
    r2 = await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@example.com", "password": "secretpass8"},
    )
    assert r2.status_code == 400


@pytest.mark.asyncio
async def test_auth_login_invalid(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "loginfail@example.com", "password": "secretpass8"},
    )
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "loginfail@example.com", "password": "wrongpassx"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_auth_register_forbidden_when_disabled(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import reset_settings_cache

    await client.post(
        "/api/v1/auth/register",
        json={"email": "first@example.com", "password": "secretpass8"},
    )
    monkeypatch.setenv("AUTH_ALLOW_REGISTRATION", "false")
    reset_settings_cache()
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": "blocked@example.com", "password": "secretpass8"},
    )
    assert r.status_code == 403
    monkeypatch.setenv("AUTH_ALLOW_REGISTRATION", "true")
    reset_settings_cache()


# --- protected without token ---


@pytest.mark.asyncio
async def test_protected_routes_require_auth(client: AsyncClient) -> None:
    for path, method in [
        ("/api/v1/leads", "GET"),
        ("/api/v1/tags", "GET"),
        ("/api/v1/projects", "GET"),
        ("/api/v1/tasks", "GET"),
        ("/api/v1/calendar-export/status", "GET"),
    ]:
        r = await client.request(method, path)
        assert r.status_code == 403, path


# --- tags ---


@pytest.mark.asyncio
async def test_tags_crud(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    r0 = await client.get("/api/v1/tags", headers=auth_headers)
    assert r0.status_code == 200
    assert r0.json() == []

    r1 = await client.post(
        "/api/v1/tags",
        headers=auth_headers,
        json={"name": "alpha"},
    )
    assert r1.status_code == 201
    tag = r1.json()
    assert tag["name"] == "alpha"
    tid = tag["id"]

    r2 = await client.get("/api/v1/tags", headers=auth_headers)
    assert len(r2.json()) == 1
    assert r2.json()[0]["id"] == tid


# --- leads + interactions + projects ---


@pytest.mark.asyncio
async def test_leads_and_related(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    r = await client.post(
        "/api/v1/leads",
        headers=auth_headers,
        json={"full_name": "Иван"},
    )
    assert r.status_code == 201
    lead_id = r.json()["id"]
    assert r.json()["full_name"] == "Иван"

    r_list = await client.get("/api/v1/leads", headers=auth_headers)
    assert r_list.status_code == 200
    assert len(r_list.json()) >= 1

    r_nc = await client.get("/api/v1/leads/no-contact", headers=auth_headers)
    assert r_nc.status_code == 200
    r_na = await client.get(
        "/api/v1/leads/next-action-due",
        headers=auth_headers,
    )
    assert r_na.status_code == 200

    r_one = await client.get(f"/api/v1/leads/{lead_id}", headers=auth_headers)
    assert r_one.status_code == 200

    r_patch = await client.patch(
        f"/api/v1/leads/{lead_id}",
        headers=auth_headers,
        json={"comment": "test"},
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["comment"] == "test"

    r_adv = await client.post(
        f"/api/v1/leads/{lead_id}/advance",
        headers=auth_headers,
    )
    assert r_adv.status_code == 200
    assert r_adv.json()["status"] == "in_work"

    r_int = await client.get(
        f"/api/v1/leads/{lead_id}/interactions",
        headers=auth_headers,
    )
    assert r_int.status_code == 200
    r_add_i = await client.post(
        f"/api/v1/leads/{lead_id}/interactions",
        headers=auth_headers,
        json={"type": "note", "text": "hello"},
    )
    assert r_add_i.status_code == 201

    r_lp = await client.get(
        f"/api/v1/leads/{lead_id}/projects",
        headers=auth_headers,
    )
    assert r_lp.status_code == 200
    r_cp = await client.post(
        f"/api/v1/leads/{lead_id}/projects",
        headers=auth_headers,
        json={"title": "P1"},
    )
    assert r_cp.status_code == 201
    project_id = r_cp.json()["id"]
    assert r_cp.json()["title"] == "P1"

    r_404 = await client.get("/api/v1/leads/99999", headers=auth_headers)
    assert r_404.status_code == 404

    r_pr0 = await client.get(
        f"/api/v1/projects/{project_id}",
        headers=auth_headers,
    )
    assert r_pr0.status_code == 200

    r_del = await client.delete(f"/api/v1/leads/{lead_id}", headers=auth_headers)
    assert r_del.status_code == 204


# --- projects ---


@pytest.mark.asyncio
async def test_projects_routes(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    r = await client.post(
        "/api/v1/leads",
        headers=auth_headers,
        json={"full_name": "Лид B"},
    )
    lead_id = r.json()["id"]
    r_p = await client.post(
        "/api/v1/projects",
        headers=auth_headers,
        json={"lead_id": lead_id, "title": "Pr"},
    )
    assert r_p.status_code == 201
    pid = r_p.json()["id"]

    for path in [
        f"/api/v1/projects/{pid}",
        "/api/v1/projects",
        "/api/v1/projects/active",
        "/api/v1/projects/overdue",
    ]:
        rr = await client.get(path, headers=auth_headers)
        assert rr.status_code == 200, path

    r_patch = await client.patch(
        f"/api/v1/projects/{pid}",
        headers=auth_headers,
        json={"title": "Pr2"},
    )
    assert r_patch.status_code == 200
    assert r_patch.json()["title"] == "Pr2"

    r_del = await client.delete(
        f"/api/v1/projects/{pid}",
        headers=auth_headers,
    )
    assert r_del.status_code == 204

    # soft delete: по id проект ещё читается, но is_active=false
    r_soft = await client.get(
        f"/api/v1/projects/{pid}",
        headers=auth_headers,
    )
    assert r_soft.status_code == 200
    assert r_soft.json()["is_active"] is False


# --- tasks ---


@pytest.mark.asyncio
async def test_tasks_routes(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    r = await client.post(
        "/api/v1/leads",
        headers=auth_headers,
        json={"full_name": "Лид C"},
    )
    lead_id = r.json()["id"]
    r_t = await client.post(
        "/api/v1/tasks",
        headers=auth_headers,
        json={"title": "T1", "lead_id": lead_id},
    )
    assert r_t.status_code == 201
    task_id = r_t.json()["id"]

    for path in [
        "/api/v1/tasks",
        "/api/v1/tasks/today",
        "/api/v1/tasks/overdue",
    ]:
        rr = await client.get(path, headers=auth_headers)
        assert rr.status_code == 200, path

    r_one = await client.get(
        f"/api/v1/tasks/{task_id}",
        headers=auth_headers,
    )
    assert r_one.status_code == 200

    r_patch = await client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=auth_headers,
        json={"title": "T2"},
    )
    assert r_patch.status_code == 200
    r_del = await client.delete(
        f"/api/v1/tasks/{task_id}",
        headers=auth_headers,
    )
    assert r_del.status_code == 204
    r_404 = await client.get(
        f"/api/v1/tasks/{task_id}",
        headers=auth_headers,
    )
    assert r_404.status_code == 404


# --- calendar export ---


@pytest.mark.asyncio
async def test_calendar_export(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    r0 = await client.get(
        "/api/v1/calendar-export/status",
        headers=auth_headers,
    )
    assert r0.status_code == 200
    rel = r0.json()["feed_url_relative"]
    assert "token=" in rel

    r1 = await client.post(
        "/api/v1/calendar-export/regenerate",
        headers=auth_headers,
    )
    assert r1.status_code == 200
    token = r1.json()["token"]
    assert len(token) > 0

    r_feed = await client.get(
        "/api/v1/calendar-export/feed.ics",
        params={"token": token},
    )
    assert r_feed.status_code == 200
    assert b"BEGIN:VCALENDAR" in r_feed.content or b"END:VCALENDAR" in r_feed.content

    r_bad = await client.get(
        "/api/v1/calendar-export/feed.ics",
        params={"token": "invalid"},
    )
    assert r_bad.status_code == 401
