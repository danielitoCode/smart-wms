import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { createCustomerDependencies } from '../../di/customers.dependencies';
import type { Customer } from '../../domain/entity/Customer';

const dependencies = createCustomerDependencies();

export function createCustomersState() {
  let customers = $state<Customer[]>([]);
  let search = $state('');
  let loading = $state(false);
  let searched = $state(false);
  let error = $state<string | null>(null);

  async function find(): Promise<void> {
    if (search.trim().length < 2) {
      customers = [];
      searched = false;
      error = 'Escribe al menos dos caracteres para buscar clientes';
      return;
    }

    loading = true;
    error = null;
    try {
      customers = await dependencies.search.execute({ search });
      searched = true;
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo realizar la búsqueda de clientes');
    } finally {
      loading = false;
    }
  }

  return {
    get customers() { return customers; },
    get search() { return search; },
    get loading() { return loading; },
    get searched() { return searched; },
    get error() { return error; },
    setSearch(value: string) { search = value; },
    find
  };
}
