"""Inventory adjustment request schemas."""

from typing import List

from pydantic import BaseModel, Field, field_validator, model_validator


class AdjustmentDecision(BaseModel):
    adjustment_id: int = Field(..., gt=0)
    action: str = Field(..., min_length=1)
    rejection_reason: str | None = Field(None, max_length=500)

    @field_validator("rejection_reason")
    @classmethod
    def validate_rejection_reason(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @model_validator(mode="after")
    def require_rejection_reason(self):
        if self.action == "reject" and not self.rejection_reason:
            raise ValueError("rejection_reason is required when rejecting an adjustment")
        return self

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        if v not in ("approve", "reject"):
            raise ValueError("action must be 'approve' or 'reject'")
        return v


class ReviewAdjustmentsRequest(BaseModel):
    decisions: List[AdjustmentDecision] = Field(..., min_length=1)


class DirectAdjustmentRequest(BaseModel):
    item_id: int = Field(..., gt=0)
    bin_id: int = Field(..., gt=0)
    warehouse_id: int = Field(..., gt=0)
    adjustment_type: str = Field(..., min_length=1, max_length=10)
    quantity: int = Field(..., gt=0, le=1000000)
    reason: str = Field(..., min_length=1, max_length=500)

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("reason must not be blank")
        return v

    @field_validator("adjustment_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        v = v.upper()
        if v not in ("ADD", "REMOVE"):
            raise ValueError("adjustment_type must be ADD or REMOVE")
        return v
