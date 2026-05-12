from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, TokenPair, UserRead


class AuthService:
    @staticmethod
    def register(db: Session, payload: RegisterRequest) -> AuthResponse:
        conditions = [User.email == str(payload.email)]
        if payload.username:
            conditions.append(User.username == payload.username)

        existing = db.execute(select(User).where(or_(*conditions))).scalar_one_or_none()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with the same email or username already exists.",
            )

        user = User(
            email=str(payload.email),
            username=payload.username,
            nickname=payload.nickname,
            auth_provider="local",
            hashed_password=hash_password(payload.password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return AuthResponse(
            user=UserRead.model_validate(user),
            tokens=TokenPair(
                access_token=create_access_token(user.id),
                refresh_token=create_access_token(user.id),
            ),
        )

    @staticmethod
    def login(db: Session, payload: LoginRequest) -> AuthResponse:
        user = db.execute(
            select(User).where(or_(User.email == payload.account, User.username == payload.account))
        ).scalar_one_or_none()
        if user is None or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid account or password.",
            )

        return AuthResponse(
            user=UserRead.model_validate(user),
            tokens=TokenPair(
                access_token=create_access_token(user.id),
                refresh_token=create_access_token(user.id),
            ),
        )
