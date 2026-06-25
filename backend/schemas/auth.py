from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    # Institution fields (must match an existing institution via invite_code)
    invite_code: str

    # Admin account fields
    admin_name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("admin_name", "invite_code")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("This field cannot be empty")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str

    @field_validator("otp")
    @classmethod
    def otp_format(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be a 6-digit numeric code")
        return v


class ResendOtpRequest(BaseModel):
    email: EmailStr


class UserOut(BaseModel):
    id: str
    display_name: Optional[str]
    email: Optional[str]
    institution_id: Optional[str]
    role: str
    language: str
    email_verified: bool = True


class InstitutionOut(BaseModel):
    id: str
    name: str
    type: str
    board: Optional[str]
    location: Optional[str]
    student_count: Optional[int]
    staff_count: Optional[int]
    plan: str
    category: str = "school"  # added Phase 6a
    # institution_subtype + verification flags — added post-Phase 8
    institution_subtype: Optional[str] = None
    student_count_verified: bool = False
    staff_count_verified: bool = False
    institution_subtype_verified: bool = False
    location_verified: bool = False


class AuthResponse(BaseModel):
    user: UserOut
    institution: InstitutionOut


class RegisterPendingResponse(BaseModel):
    """
    Returned by POST /auth/register when registration succeeds but email is unverified.
    No session is issued — the client should redirect to the verify-OTP screen.
    """
    email: str
    message: str = "Registration successful. Please verify your email."
