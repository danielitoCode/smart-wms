import type { SalesOrderRepository } from '../repository/SalesOrderRepository';
import type { UpdateSalesOrderAddressInput } from '../entity/SalesOrder';

export class UpdateSalesOrderAddressUseCase {
  constructor(private readonly repository: SalesOrderRepository) {}

  execute(id: number, input: UpdateSalesOrderAddressInput): Promise<void> {
    if (!Number.isInteger(id) || id < 1) {
      throw new Error('El identificador del pedido no es válido');
    }

    const hasChanges = [input.billingAddress, input.shippingAddress].some((address) =>
      address != null && Object.values(address).some((value) => value !== null && value !== undefined)
    );

    if (!hasChanges) {
      throw new Error('Indica al menos un campo de dirección para actualizar');
    }

    return this.repository.updateAddress(id, input);
  }
}
