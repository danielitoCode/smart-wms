import type {FraudReviewDto, UpdateFraudMemoDto} from "#core/feature/fraud/data/dto/FraudReviewDto.ts";
import type {FraudReview, UpdateFraudMemo} from "#core/feature/fraud/domain/entity/FraudReview.ts";

export const FraudReviewMapper = {
    toFraudReview(fraudReviewDto: FraudReviewDto): FraudReview {
        return {
            createdAt: fraudReviewDto.created_at,
            customerName: fraudReviewDto.customer_name,
            customerPhone: fraudReviewDto.customer_phone,
            memo: fraudReviewDto.memo,
            orderOrigin: fraudReviewDto.order_origin,
            orderSource: fraudReviewDto.order_source,
            orderType: fraudReviewDto.order_type,
            salesOrderId: fraudReviewDto.sales_order_id,
            salesOrderNumber: fraudReviewDto.sales_order_number,
            status: fraudReviewDto.status,
            warehouseId: fraudReviewDto.warehouse_id
        }
    },
    toFraudReviewDto(fraudReview: FraudReview): FraudReviewDto {
        return {
            created_at: fraudReview.createdAt,
            customer_name: fraudReview.customerName,
            customer_phone: fraudReview.customerPhone,
            memo: fraudReview.memo,
            order_origin: fraudReview.orderOrigin,
            order_source: fraudReview.orderSource,
            order_type: fraudReview.orderType,
            sales_order_id: fraudReview.salesOrderId,
            sales_order_number: fraudReview.salesOrderNumber,
            status: fraudReview.status,
            warehouse_id: fraudReview.warehouseId

        }
    }
}

export const UpdateFraudMemoMapper = {
    toUpdateFraudMemo(updateFraudMemoMapperDto: UpdateFraudMemoDto): UpdateFraudMemo {
        return {
            memo: updateFraudMemoMapperDto.memo,
            salesOrderId: updateFraudMemoMapperDto.salesOrder_id
        }
    },
    toUpdateFraudMemoDto(updateFraudMemoMapper: UpdateFraudMemo): UpdateFraudMemoDto {
        return {
            memo: updateFraudMemoMapper.memo,
            salesOrder_id: updateFraudMemoMapper.salesOrderId
        }
    }
}
