"""Packing / pack verification request schemas."""

from typing import Optional

from pydantic import BaseModel, Field


class VerifyPackItemRequest(BaseModel):
    so_id: int = Field(..., gt=0)
    scanned_barcode: str = Field(..., min_length=1, max_length=128)
    quantity: int = Field(1, gt=0, le=100000)
    warehouse_id: Optional[int] = Field(default=None, gt=0)


class CompletePackingRequest(BaseModel):
    so_id: int = Field(..., gt=0)
    warehouse_id: Optional[int] = Field(default=None, gt=0)
