from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        ...,
        description="Async SQLAlchemy URL, e.g. postgresql+asyncpg://user:pass@host/db",
    )

    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = False

    #: Режим разработки/проверки: вместе с DEBUG даёт детальные ответы, SQL в лог, dev в /health
    dev: bool = False

    telegram_bot_token: str = ""
    telegram_allowed_user_ids: str = ""

    reminder_interval_seconds: int = 60

    #: IANA timezone for "today" / digest boundaries (e.g. Europe/Moscow)
    app_timezone: str = "UTC"

    #: Comma-separated origins for CORS (Vite dev server, production UI host)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    #: Публичный URL API для ссылки экспорта iCal (для Google Calendar). Пример: https://crm.example.com
    public_api_base_url: str = ""

    #: Секрет для JWT (в проде задайте длинную случайную строку ≥32 символов)
    auth_jwt_secret: str = Field(
        default="dev-insecure-lidocrm-jwt-secret-replace-in-production-32b",
        min_length=32,
    )
    auth_jwt_expire_minutes: int = 60 * 24 * 7  # 7 суток
    auth_allow_registration: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

    @property
    def allowed_telegram_user_ids_set(self) -> set[int]:
        if not self.telegram_allowed_user_ids.strip():
            return set()
        parts = self.telegram_allowed_user_ids.replace(" ", "").split(",")
        return {int(x) for x in parts if x.isdigit()}


@lru_cache
def get_settings() -> Settings:
    return Settings()


def reset_settings_cache() -> None:
    get_settings.cache_clear()
