# LidoCRM

Персональная CRM: лиды, воронка, задачи, проекты, экспорт календаря (iCal), Telegram-бот.

## Требования

- [Docker](https://docs.docker.com/get-docker/) и Docker Compose v2
- Сборка UI: Node.js 20+
- Локальная разработка без Docker: Python 3.11+

## Бэкенд (Docker)

1. `cp .env.example .env` — задайте `POSTGRES_*`, `TELEGRAM_*`, `CORS_ORIGINS` (и при необходимости `PUBLIC_API_BASE_URL`).

2. `docker compose up --build -d` — поднимаются Postgres, миграции, **api** и **bot** (Vite **не** стартует: это только бэкенд в контейнерах).

3. **API** доступен на хосте только с **loopback**: `http://127.0.0.1:8000` (см. `ports` в `docker-compose.yml`). С интернета напрямую порт **не** слушает.

4. **UI в разработке (порт 5173):** либо `docker compose --profile dev up` — поднимается Vite в контейнере и `http://127.0.0.1:5173`, прокси `/api` → контейнер `api`; либо на **хосте** `cd frontend && npm ci && npm run dev` (тот же 5173, прокси на `127.0.0.1:8000`).

5. **Продакшен:** фронт не в Docker — соберите `npm run build` и отдайте `dist` через nginx на сервере (см. ниже).

### Полезные команды

Бэкенд + Vite на 5173 (профиль `dev`):

```bash
docker compose --profile dev up --build
```

```bash
docker compose logs -f api
docker compose logs -f bot
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Остановка: `docker compose down` (данные БД в volume `pgdata` сохраняются).

## Продакшен: UI и nginx на сервере

1. **Соберите** SPA (в репо `VITE_API_BASE` по умолчанию не нужен в `.env` — в `frontend` заложен префикс `/api/v1`):

   ```bash
   cd frontend && npm ci && npm run build
   ```

2. Скопируйте содержимое `frontend/dist` в каталог, с которого **системный nginx** отдаёт файлы, например `/var/www/lidocrm/`.

3. Подключите **nginx** на хосте: копия примера — **`deploy/server-nginx.example.conf`**. Прямой `location /api/` → `http://127.0.0.1:8000` (тот же порт, что публикует контейнер `api`).

4. В **`.env`** на сервере укажите `CORS_ORIGINS=https://ваш-домен` и при необходимости `PUBLIC_API_BASE_URL=https://ваш-домен`.

5. **DNS** A/AAAA на IP сервера, затем **HTTPS** (например `sudo certbot --nginx -d ваш-домен` после настройки `server` на :80). Подробности — в разделе ниже.

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
