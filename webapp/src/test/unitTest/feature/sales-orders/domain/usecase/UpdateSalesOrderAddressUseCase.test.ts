import { describe, expect, it, vi } from 'vitest';
import { UpdateSalesOrderAddressUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/UpdateSalesOrderAddressUseCase';
import type { SalesOrderRepository } from '../../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';

describe('UpdateSalesOrderAddressUseCase', () => {
  it('validates the order identifier and requires at least one field', () => {
    const updateAddress = vi.fn();
    const useCase = new UpdateSalesOrderAddressUseCase({
      updateAddress
    } as unknown as SalesOrderRepository);

    expect(() => useCase.execute(0, { billingAddress: { line1: 'Main St' } })).toThrow(/identificador/);
    expect(() => useCase.execute(1, {})).toThrow(/dirección/);
    expect(updateAddress).not.toHaveBeenCalled();
  });

  it('forwards structured billing and shipping address changes', async () => {
    const updateAddress = vi.fn().mockResolvedValue(undefined);
    const useCase = new UpdateSalesOrderAddressUseCase({
      updateAddress
    } as unknown as SalesOrderRepository);
    const input = {
      billingAddress: { line1: '1 Main St', city: 'Havana' },
      shippingAddress: { postalCode: '10400' }
    };

    await useCase.execute(7, input);

    expect(updateAddress).toHaveBeenCalledWith(7, input);
  });

  it('allows an empty string to explicitly clear an address field', async () => {
    const updateAddress = vi.fn().mockResolvedValue(undefined);
    const useCase = new UpdateSalesOrderAddressUseCase({
      updateAddress
    } as unknown as SalesOrderRepository);

    await useCase.execute(7, { shippingAddress: { line2: '' } });

    expect(updateAddress).toHaveBeenCalledWith(7, { shippingAddress: { line2: '' } });
  });
});
