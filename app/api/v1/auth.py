from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import TokenResponse, UserLogin, UserRead, UserRegister, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: UserRegister,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    settings = get_settings()
    if not settings.auth_allow_registration:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Регистрация отключена (AUTH_ALLOW_REGISTRATION=false)",
        )
    repo = UserRepository(db)
    if await repo.get_by_email_normalized(body.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже зарегистрирован",
        )
    user = await repo.create(body.email, hash_password(body.password))
    await db.commit()
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: UserLogin,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    repo = UserRepository(db)
    user = await repo.get_by_email_normalized(body.email)
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserRead)
async def me(
    current: Annotated[User, Depends(get_current_user)],
) -> UserRead:
    return UserRead.model_validate(current)


@router.patch("/me", response_model=UserRead)
async def update_me(
    body: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current: Annotated[User, Depends(get_current_user)],
) -> UserRead:
    patch = body.model_dump(exclude_unset=True)
    if "telegram_user_id" in patch:
        tg = patch["telegram_user_id"]
        if tg is not None:
            from sqlalchemy import select

            q = select(User).where(
                User.telegram_user_id == tg,
                User.id != current.id,
            )
            existing = await db.scalar(q)
            if existing is not None:
                raise HTTPException(
                    status_code=409,
                    detail="Этот Telegram ID уже привязан к другому пользователю",
                )
        current.telegram_user_id = tg
    await db.commit()
    await db.refresh(current)
    return UserRead.model_validate(current)
