import type { SalesOrderAddress } from '../entity/SalesOrder';
import type { SalesOrderRepository } from '../repository/SalesOrderRepository';

export type UpdateSalesOrderAddressInput = Partial<{
  billingAddress: Partial<SalesOrderAddress>;
  shippingAddress: Partial<SalesOrderAddress>;
}>;

export class UpdateSalesOrderAddressUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(id: number, input: UpdateSalesOrderAddressInput): Promise<void> {
    if (!Number.isInteger(id) || id < 1) {
      throw new Error('El identificador del pedido no es válido');
    }

    const addressGroups = [input.billingAddress, input.shippingAddress];
    const hasChanges = addressGroups.some((address) =>
      address != null && Object.values(address).some((value) => value !== null && value !== undefined)
    );

    if (!hasChanges) {
      throw new Error('Indica al menos un campo de dirección para actualizar');
    }

    return this.repository.updateAddress(id, input);
  }
}
