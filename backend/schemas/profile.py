from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


class InstitutionDetailsOut(BaseModel):
    """Institution fields returned as part of the profile response."""
    name: str
    type: str
    category: str
    plan: str
    board: Optional[str]
    location: Optional[str]
    student_count: Optional[int]
    staff_count: Optional[int]
    institution_subtype: Optional[str]
    location_verified: bool
    student_count_verified: bool
    staff_count_verified: bool
    institution_subtype_verified: bool


class ProfileResponse(BaseModel):
    name: Optional[str]
    email: Optional[str]
    institution: Optional[InstitutionDetailsOut] = None


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Name cannot be blank")
        return v.strip() if v else v


class UpdateInstitutionDetailsRequest(BaseModel):
    location: Optional[str] = None
    student_count: Optional[int] = None
    staff_count: Optional[int] = None
    institution_subtype: Optional[str] = None

    @field_validator("location", "institution_subtype", mode="before")
    @classmethod
    def empty_to_none(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not str(v).strip():
            return None
        return v.strip() if v else v

    @field_validator("student_count", "staff_count")
    @classmethod
    def non_negative(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("Must be a non-negative integer")
        return v


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v
