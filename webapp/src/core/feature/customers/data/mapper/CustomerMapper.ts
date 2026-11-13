import type { Customer } from '../../domain/entity/Customer';
import type { GlobalSearchResultDto } from '../dto/CustomerSearchDto';

export const CustomerMapper = {
  fromSearchResult(dto: GlobalSearchResultDto): Customer {
    const name = dto.label.trim();
    if (dto.type !== 'customer' || !name) {
      throw new Error('La búsqueda devolvió un registro de cliente no válido');
    }

    const countMatch = dto.sublabel?.match(/^(\d+)\s+orders?$/i);
    return {
      id: String(dto.id || name),
      name,
      orderCount: countMatch ? Number(countMatch[1]) : 0
    };
  }
};
