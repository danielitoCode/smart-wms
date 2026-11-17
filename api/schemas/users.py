"""User administration request schemas."""

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

VALID_ROLES = ("ADMIN", "USER")


class UpdateUserPagePermissionsRequest(BaseModel):
    """Replace a user's complete page + override grant set in one PUT."""

    page_keys: List[str] = Field(default_factory=list, max_length=200)

    @field_validator("page_keys")
    @classmethod
    def validate_page_keys(cls, values: List[str]) -> List[str]:
        cleaned = [value.strip() for value in values]
        if any(not value for value in cleaned):
            raise ValueError("page_keys cannot contain empty values")
        return list(dict.fromkeys(cleaned))


class CreateUserRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=150)
    password: str = Field(..., min_length=1, max_length=256)
    full_name: str = Field(..., min_length=1, max_length=256)
    role: str = Field(..., min_length=1, max_length=32)
    warehouse_ids: List[int] = Field(default_factory=list)
    warehouse_id: Optional[int] = Field(None, gt=0)
    allowed_functions: List[str] = Field(default_factory=list)

    @field_validator("username", "full_name")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("value cannot be empty")
        return value

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        if value not in VALID_ROLES:
            raise ValueError(f"role must be one of: {', '.join(VALID_ROLES)}")
        return value

    @field_validator("warehouse_ids")
    @classmethod
    def validate_warehouse_ids(cls, values: List[int]) -> List[int]:
        if any(value <= 0 for value in values):
            raise ValueError("warehouse_ids must contain positive IDs")
        if len(values) != len(set(values)):
            raise ValueError("warehouse_ids cannot contain duplicates")
        return values

    @field_validator("allowed_functions")
    @classmethod
    def normalize_allowed_functions(cls, values: List[str]) -> List[str]:
        cleaned = [value.strip() for value in values]
        if any(not value for value in cleaned):
            raise ValueError("allowed_functions cannot contain empty values")
        return list(dict.fromkeys(cleaned))


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=256)
    role: Optional[str] = Field(None, min_length=1, max_length=32)
    warehouse_id: Optional[int] = Field(None, gt=0)
    warehouse_ids: Optional[List[int]] = None
    allowed_functions: Optional[List[str]] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=1, max_length=256)

    @field_validator("full_name")
    @classmethod
    def strip_full_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("full_name cannot be empty")
        return value

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VALID_ROLES:
            raise ValueError(f"role must be one of: {', '.join(VALID_ROLES)}")
        return value

    @field_validator("warehouse_ids")
    @classmethod
    def validate_warehouse_ids(cls, values: Optional[List[int]]) -> Optional[List[int]]:
        if values is None:
            return values
        if any(value <= 0 for value in values):
            raise ValueError("warehouse_ids must contain positive IDs")
        if len(values) != len(set(values)):
            raise ValueError("warehouse_ids cannot contain duplicates")
        return values

    @field_validator("allowed_functions")
    @classmethod
    def normalize_allowed_functions(cls, values: Optional[List[str]]) -> Optional[List[str]]:
        if values is None:
            return values
        cleaned = [value.strip() for value in values]
        if any(not value for value in cleaned):
            raise ValueError("allowed_functions cannot contain empty values")
        return list(dict.fromkeys(cleaned))
