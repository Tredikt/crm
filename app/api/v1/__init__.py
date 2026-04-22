from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.api.v1 import auth, calendar_export, leads, projects, tags, tasks

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(calendar_export.public_router)

protected = APIRouter(dependencies=[Depends(get_current_user)])
protected.include_router(calendar_export.router)
protected.include_router(leads.router)
protected.include_router(projects.router)
protected.include_router(tasks.router)
protected.include_router(tags.router)
api_router.include_router(protected)
