import csv
import io
from decimal import Decimal, InvalidOperation
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.enums import DealStatus, LeadStatus
from app.models.user import User
from app.schemas.deal import DealCreate
from app.schemas.lead import LeadCreate
from app.services.deal import DealService
from app.services.lead import LeadService

router = APIRouter(prefix="/import-export", tags=["import-export"])


def _csv_response(filename: str, rows: list[list[str]]) -> StreamingResponse:
    buf = io.StringIO()
    writer = csv.writer(buf)
    for row in rows:
        writer.writerow(row)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/leads.csv")
async def export_leads_csv(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> StreamingResponse:
    leads = await LeadService(db, current_user.id).list_leads(limit=5000, include_inactive=True)
    rows: list[list[str]] = [
        [
            "id",
            "full_name",
            "username",
            "telegram_id",
            "phone",
            "source",
            "niche",
            "status",
            "budget",
            "comment",
            "company_id",
            "is_active",
        ]
    ]
    for lead in leads:
        rows.append(
            [
                str(lead.id),
                lead.full_name,
                lead.username or "",
                str(lead.telegram_id or ""),
                lead.phone or "",
                lead.source or "",
                lead.niche or "",
                lead.status.value,
                lead.budget or "",
                (lead.comment or "").replace("\n", " "),
                str(lead.company_id or ""),
                "1" if lead.is_active else "0",
            ]
        )
    return _csv_response("leads.csv", rows)


@router.get("/deals.csv")
async def export_deals_csv(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> StreamingResponse:
    deals = await DealService(db, current_user.id).list_deals(limit=5000, include_inactive=True)
    rows: list[list[str]] = [
        [
            "id",
            "lead_id",
            "title",
            "amount",
            "currency",
            "status",
            "probability",
            "expected_close_date",
            "comment",
            "is_active",
        ]
    ]
    for deal in deals:
        rows.append(
            [
                str(deal.id),
                str(deal.lead_id),
                deal.title,
                str(deal.amount),
                deal.currency,
                deal.status.value,
                str(deal.probability),
                deal.expected_close_date.isoformat() if deal.expected_close_date else "",
                (deal.comment or "").replace("\n", " "),
                "1" if deal.is_active else "0",
            ]
        )
    return _csv_response("deals.csv", rows)


@router.post("/leads/import")
async def import_leads_csv(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    file: UploadFile = File(...),
) -> dict[str, int]:
    raw = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))
    svc = LeadService(db, current_user.id)
    created = 0
    for row in reader:
        name = (row.get("full_name") or row.get("name") or "").strip()
        if not name:
            continue
        status_raw = (row.get("status") or "new").strip()
        try:
            status = LeadStatus(status_raw)
        except ValueError:
            status = LeadStatus.new
        company_raw = (row.get("company_id") or "").strip()
        company_id = int(company_raw) if company_raw.isdigit() else None
        await svc.create(
            LeadCreate(
                full_name=name,
                username=(row.get("username") or None) or None,
                phone=(row.get("phone") or None) or None,
                source=(row.get("source") or None) or None,
                niche=(row.get("niche") or None) or None,
                budget=(row.get("budget") or None) or None,
                comment=(row.get("comment") or None) or None,
                status=status,
                company_id=company_id,
            )
        )
        created += 1
    return {"created": created}


@router.post("/deals/import")
async def import_deals_csv(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    file: UploadFile = File(...),
) -> dict[str, int]:
    raw = (await file.read()).decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))
    svc = DealService(db, current_user.id)
    created = 0
    for row in reader:
        title = (row.get("title") or "").strip()
        lead_raw = (row.get("lead_id") or "").strip()
        if not title or not lead_raw.isdigit():
            continue
        amount_raw = (row.get("amount") or "0").strip().replace(",", ".")
        try:
            amount = Decimal(amount_raw)
        except InvalidOperation:
            amount = Decimal("0")
        status_raw = (row.get("status") or "qualification").strip()
        try:
            status = DealStatus(status_raw)
        except ValueError:
            status = DealStatus.qualification
        prob_raw = (row.get("probability") or "10").strip()
        probability = int(prob_raw) if prob_raw.isdigit() else 10
        try:
            await svc.create(
                DealCreate(
                    lead_id=int(lead_raw),
                    title=title,
                    amount=amount,
                    currency=(row.get("currency") or "RUB").strip() or "RUB",
                    status=status,
                    probability=probability,
                    comment=(row.get("comment") or None) or None,
                )
            )
            created += 1
        except Exception:
            continue
    return {"created": created}
