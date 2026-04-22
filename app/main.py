from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="LidoCRM API",
        version="0.1.0",
        lifespan=lifespan,
        debug=settings.debug or settings.dev,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(api_router, prefix="/api/v1")

    @application.get("/health")
    async def health():
        s = get_settings()
        if s.dev:
            return {"status": "ok", "dev": True}
        return {"status": "ok"}

    return application


app = create_app()
