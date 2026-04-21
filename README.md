# LidoCRM

Персональная CRM: лиды, воронка, задачи, проекты, экспорт календаря (iCal), Telegram-бот.

## Требования

- [Docker](https://docs.docker.com/get-docker/) и Docker Compose v2
- Сборка UI: Node.js 20+
- Локальная разработка без Docker: Python 3.11+

## Продакшен (сервер)

**Стек в Docker** по умолчанию: Postgres, миграции, **API**, **бот**, **web** (собранный SPA + nginx). Сервис **`frontend`** (Vite) только с профилем `dev` — сюда **не** входит.

**Про «SSR»:** в приложении нет **серверного** рендера React (как в Next.js): это **SPA** — `npm run build` отдаёт статику, в браузере по-прежнему гидратация. Полноценный SSR = отдельная миграция (Next/Remix/Vite SSR). Сейчас — **всё в одном `compose`**, UI в контейнере `web` без Node в рантайме (только nginx + файлы).

### 1. Всё в Docker, включая UI

1. `cp .env.example .env` — **сильный** `POSTGRES_PASSWORD`, `TELEGRAM_*`, `CORS_ORIGINS` (домен(ы) с UI и, при `WEB_PORT` по умолчанию, `http://localhost:8080` / `http://127.0.0.1:8080` — из `.env.example`), при необходимости `PUBLIC_API_BASE_URL`.

2. Сборка и запуск (образ `web` соберёт `frontend` в multi-stage, ручной `npm run build` на хосте **не** нужен):

   ```bash
   docker compose up -d --build
   ```

   Поднимаются: `postgres` → `migrate` → `api`, `bot`, **`web`**. Состояние БД: volume `pgdata`.

3. **Веб-интерфейс** — контейнер `web`: `http://127.0.0.1:8080` (порт задайте в `.env`: `WEB_PORT=8080` или, например, `WEB_PORT=80` на Linux при необходимости). Прокси **внутри** Docker: `location /api/` → `http://api:8000` (см. `frontend/nginx.default.conf`).

4. **API с хоста** (для отладки/health), только loopback: `http://127.0.0.1:8000` — порт **не** слушает снаружи.

### 2. Вариант без UI в Docker: статика + nginx на хосте

Если нужен **только** системный nginx (или certbot сразу на хосте) и **без** сервиса `web`:

```bash
docker compose up -d --build postgres migrate api bot
```

Дальше вручную: `cd frontend && npm ci && npm run build`, копия `dist` (например в `/var/www/lidocrm/`), конфиг по **`deploy/server-nginx.example.conf`**, `location /api/` → `http://127.0.0.1:8000`, HTTPS — `certbot` и т.д. (см. «DNS и HTTPS» ниже).

### Логи и БД (prod)

```bash
docker compose logs -f api
docker compose logs -f web
docker compose logs -f bot
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Остановка: `docker compose down` (volume `pgdata` с данными PostgreSQL остаётся, пока не удалите `docker volume rm`).

## Разработка: Docker + Vite

**Бэк + Vite (5173) в Docker** — включите профиль `dev` (тогда поднимается `frontend` с прокси `/api` → `api:8000`):

```bash
docker compose --profile dev up --build
```

UI: `http://127.0.0.1:5173`. **Только** Vite **на хосте**: `cd frontend && npm ci && npm run dev` (прокси на `127.0.0.1:8000`).

**Бэк на хосте, без Docker** — см. раздел «Локальная разработка (без Docker)» ниже.

## DNS и HTTPS (кратко)

- **Когда** выпускать сертификат: после раскатки **DNS** и когда по домену отвечает ваш nginx (часто порт 80).
- **Где** команды: **SSH на сервере** с `sudo` (Debian/Ubuntu и т.д.).

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d crm.example.com
sudo certbot renew --dry-run
```

**Certbot standalone** (если 80 на время выдачи свободен):

```bash
sudo certbot certonly --standalone -d crm.example.com --email you@mail.com --agree-tos
```

**Только DNS challenge** (80 занят):

```bash
sudo certbot certonly --manual --preferred-challenges dns -d crm.example.com
```

## Локальная разработка (без Docker)

1. PostgreSQL, `DATABASE_URL` в `.env` на `localhost`.

2. `pip install -e .` и `alembic upgrade head`

3. `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

4. `cd frontend && npm ci && npm run dev` — Vite (5173) проксирует `/api` на `8000` (см. `frontend/vite.config.ts`).

## Переменные окружения (кратко)

| Переменная | Назначение |
|------------|------------|
| `POSTGRES_*` | Пользователь, пароль, БД; в Docker — и для Postgres, и для URL подключения в compose |
| `DATABASE_URL` | Запуск API/бота **на хосте**; в compose URL к БД задаётся в `docker-compose.yml` |
| `CORS_ORIGINS` | Origins веб-интерфейса (через запятую) |
| `PUBLIC_API_BASE_URL` | Публичный URL для iCal / внешних ссылок |
| `TELEGRAM_*` | Бот |
| `APP_TIMEZONE` | Таймзона для «сегодня» и напоминаний |

## Лицензия

По желанию владельца репозитория.
