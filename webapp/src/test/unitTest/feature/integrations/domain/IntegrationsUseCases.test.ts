import { describe, expect, it, vi } from 'vitest';
import type { IntegrationsRepository } from '#core/feature/integrations/domain/repository/IntegrationsRepository';
import { GetCredentialsUseCase, SaveCredentialsUseCase, TestConnectionUseCase, ExecuteSyncUseCase, DeleteCredentialsUseCase } from '#core/feature/integrations/domain/usecase/IntegrationsUseCases';
const repository = { getCredentials: vi.fn(), saveCredentials: vi.fn(), testConnection: vi.fn(), executeSync: vi.fn(), deleteCredentials: vi.fn() } as unknown as IntegrationsRepository;
describe('Integrations application use cases', () => {
  it('rejects missing warehouse scope before reading credentials', async () => {
    await expect(new GetCredentialsUseCase(repository).execute('erp', 0)).rejects.toThrow('Almacén inválido');
  });
  it('rejects blank credential values and empty submissions', async () => {
    const useCase = new SaveCredentialsUseCase(repository);
    await expect(useCase.execute('erp', 3, {})).rejects.toThrow('Introduce al menos una credencial válida');
    await expect(useCase.execute('erp', 3, { api_key: '  ' })).rejects.toThrow('Introduce al menos una credencial válida');
    expect(repository.saveCredentials).not.toHaveBeenCalled();
  });
  it('requires warehouse id for connection tests', async () => {
    await expect(new TestConnectionUseCase(repository).execute('erp', -1)).rejects.toThrow('Almacén inválido');
    expect(repository.testConnection).not.toHaveBeenCalled();
  });
  it('only accepts the four backend sync types', async () => {
    await expect(new ExecuteSyncUseCase(repository).execute('erp', 3, 'unknown' as never)).rejects.toThrow('Tipo de sincronización inválido');
    expect(repository.executeSync).not.toHaveBeenCalled();
  });
  it('deletes credentials only with a valid warehouse scope', async () => {
    await expect(new DeleteCredentialsUseCase(repository).execute('erp', 0)).rejects.toThrow('Almacén inválido');
    expect(repository.deleteCredentials).not.toHaveBeenCalled();
  });
});
