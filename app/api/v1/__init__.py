from fastapi import APIRouter

from app.api.v1 import calendar_export, leads, projects, tags, tasks

api_router = APIRouter()
api_router.include_router(calendar_export.router)
api_router.include_router(leads.router)
api_router.include_router(projects.router)
api_router.include_router(tasks.router)
api_router.include_router(tags.router)
