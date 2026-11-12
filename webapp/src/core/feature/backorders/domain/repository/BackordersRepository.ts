import type {Backorder} from "#core/feature/backorders/domain/entity/Backorder.ts";

export interface BackordersRepository {
    getAllBackorder(): Promise<Backorder[]>
    getBackorderById(backorderId: number): Promise<Backorder | null>
    deleteBackorder(backorderId: number): Promise<void>
    modifyBackorder(backorder: Backorder): Promise<void>
    saveBackorder(backorder: Backorder): Promise<void>
}