"""Zone request schemas."""

from typing import Optional

from pydantic import BaseModel, Field, field_validator

VALID_ZONE_TYPES = ("RECEIVING", "STORAGE", "PICKING", "STAGING", "SHIPPING")


class CreateZoneRequest(BaseModel):
    warehouse_id: int = Field(..., gt=0)
    zone_code: str = Field(..., min_length=1, max_length=20)
    zone_name: str = Field(..., min_length=1, max_length=100)
    zone_type: str = Field(..., min_length=1, max_length=32)

    @field_validator("zone_type")
    @classmethod
    def validate_zone_type(cls, v: str) -> str:
        if v not in VALID_ZONE_TYPES:
            raise ValueError(f"zone_type must be one of: {', '.join(VALID_ZONE_TYPES)}")
        return v


class UpdateZoneRequest(BaseModel):
    zone_code: Optional[str] = Field(None, min_length=1, max_length=20)
    zone_name: Optional[str] = Field(None, min_length=1, max_length=100)
    zone_type: Optional[str] = Field(None, min_length=1, max_length=32)
    is_active: Optional[bool] = None

    @field_validator("zone_code", "zone_name")
    @classmethod
    def validate_non_null_text(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            raise ValueError("field cannot be null")
        return v

    @field_validator("zone_type")
    @classmethod
    def validate_zone_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v not in VALID_ZONE_TYPES:
            raise ValueError(f"zone_type must be one of: {', '.join(VALID_ZONE_TYPES)}")
        return v
