"""Put-away request schemas."""

from typing import Optional

from pydantic import BaseModel, Field, model_validator


class ConfirmPutawayRequest(BaseModel):
    item_id: int = Field(..., gt=0)
    from_bin_id: Optional[int] = Field(None, gt=0)
    from_bin_barcode: Optional[str] = Field(None, min_length=1, max_length=100)
    to_bin_id: Optional[int] = Field(None, gt=0)
    to_bin_barcode: Optional[str] = Field(None, min_length=1, max_length=100)
    quantity: int = Field(..., gt=0, le=100000)
    lot_number: Optional[str] = Field(None, max_length=100)

    @model_validator(mode="after")
    def validate_bin_identifiers(self):
        if self.from_bin_id is None and not self.from_bin_barcode:
            raise ValueError("from_bin_id or from_bin_barcode is required")
        if self.to_bin_id is None and not self.to_bin_barcode:
            raise ValueError("to_bin_id or to_bin_barcode is required")
        if self.from_bin_id is not None and self.from_bin_id == self.to_bin_id:
            raise ValueError("from_bin_id and to_bin_id must be different")
        if (
            self.from_bin_barcode
            and self.to_bin_barcode
            and self.from_bin_barcode.strip() == self.to_bin_barcode.strip()
        ):
            raise ValueError("Source and destination barcodes must be different")
        return self


class UpdatePreferredRequest(BaseModel):
    item_id: int = Field(..., gt=0)
    bin_id: int = Field(..., gt=0)
    set_as_primary: bool = Field(True)
