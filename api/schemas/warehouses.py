"""Warehouse request schemas."""

from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class CreateWarehouseRequest(BaseModel):
    warehouse_code: str = Field(..., min_length=1, max_length=32)
    warehouse_name: str = Field(..., min_length=1, max_length=256)
    address: Optional[str] = Field(None, max_length=512)


class UpdateWarehouseRequest(BaseModel):
    warehouse_code: Optional[str] = Field(None, min_length=1, max_length=32)
    warehouse_name: Optional[str] = Field(None, min_length=1, max_length=256)
    address: Optional[str] = Field(None, max_length=512)
    is_active: Optional[bool] = None


class InterWarehouseTransferRequest(BaseModel):
    item_id: int = Field(..., gt=0)
    from_bin_id: int = Field(..., gt=0)
    from_warehouse_id: int = Field(..., gt=0)
    to_bin_id: int = Field(..., gt=0)
    to_warehouse_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0, le=100000)
    reason: Optional[str] = Field(None, max_length=200)
    idempotency_key: UUID

    @model_validator(mode="after")
    def warehouses_must_differ(self):
        if self.from_warehouse_id == self.to_warehouse_id:
            raise ValueError("Source and destination warehouses must be different")
        if self.from_bin_id == self.to_bin_id:
            raise ValueError("Source and destination bins must be different")
        return self
