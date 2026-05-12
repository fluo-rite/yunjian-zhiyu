from datetime import datetime

from pydantic import EmailStr, Field

from app.schemas.common import CamelModel


class RegisterRequest(CamelModel):
    email: EmailStr
    username: str | None = Field(default=None, min_length=3, max_length=32)
    password: str = Field(min_length=8, max_length=64)
    nickname: str | None = Field(default=None, min_length=1, max_length=50)


class LoginRequest(CamelModel):
    account: str = Field(min_length=1)
    password: str = Field(min_length=8, max_length=64)


class UserRead(CamelModel):
    id: str
    email: EmailStr
    username: str | None = None
    nickname: str | None = None
    auth_provider: str
    created_at: datetime
    updated_at: datetime


class TokenPair(CamelModel):
    access_token: str
    refresh_token: str


class AuthResponse(CamelModel):
    user: UserRead
    tokens: TokenPair
