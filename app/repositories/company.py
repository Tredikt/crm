from sqlalchemy import select

from app.models import Company
from app.repositories.base import BaseRepository


class CompanyRepository(BaseRepository[Company]):
    def __init__(self, session):
        super().__init__(session, Company)

    async def list_filtered(
        self,
        *,
        user_id: int,
        search: str | None = None,
        include_inactive: bool = False,
        limit: int = 200,
        offset: int = 0,
    ) -> list[Company]:
        q = select(Company).where(Company.user_id == user_id)
        if not include_inactive:
            q = q.where(Company.is_active == True)  # noqa: E712
        if search:
            like = f"%{search.strip()}%"
            q = q.where(Company.name.ilike(like))
        q = q.order_by(Company.name.asc(), Company.id.desc()).limit(limit).offset(offset)
        result = await self.session.scalars(q)
        return list(result.all())

    async def get_owned(self, company_id: int, user_id: int) -> Company | None:
        q = select(Company).where(Company.id == company_id, Company.user_id == user_id)
        return await self.session.scalar(q)
