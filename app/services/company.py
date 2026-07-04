from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company
from app.repositories import CompanyRepository
from app.schemas.company import CompanyCreate, CompanyUpdate


class CompanyNotFoundError(Exception):
    pass


class CompanyService:
    def __init__(self, session: AsyncSession, user_id: int) -> None:
        self.session = session
        self.user_id = user_id
        self.companies = CompanyRepository(session)

    async def create(self, data: CompanyCreate) -> Company:
        company = Company(user_id=self.user_id, **data.model_dump())
        self.session.add(company)
        await self.session.commit()
        await self.session.refresh(company)
        return company

    async def get(self, company_id: int) -> Company | None:
        return await self.companies.get_owned(company_id, self.user_id)

    async def list_companies(
        self,
        *,
        search: str | None = None,
        include_inactive: bool = False,
        limit: int = 200,
        offset: int = 0,
    ) -> list[Company]:
        return await self.companies.list_filtered(
            user_id=self.user_id,
            search=search,
            include_inactive=include_inactive,
            limit=limit,
            offset=offset,
        )

    async def update(self, company_id: int, data: CompanyUpdate) -> Company | None:
        company = await self.companies.get_owned(company_id, self.user_id)
        if company is None:
            return None
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(company, key, value)
        await self.session.commit()
        await self.session.refresh(company)
        return company

    async def soft_delete(self, company_id: int) -> bool:
        company = await self.companies.get_owned(company_id, self.user_id)
        if company is None:
            return False
        company.is_active = False
        await self.session.commit()
        return True
