import type { Connector, SyncType } from '../entity/Connector';
import type { IntegrationsRepository } from '../repository/IntegrationsRepository';
const validName = (name: string) => { if (!name.trim()) throw new Error('Conector inválido'); return name; };
const validWarehouse = (id: number) => { if (!Number.isInteger(id) || id <= 0) throw new Error('Almacén inválido'); return id; };
export class ListConnectorsUseCase { constructor(private readonly r: IntegrationsRepository) {} execute() { return this.r.listConnectors(); } }
export class GetConfigSchemaUseCase { constructor(private readonly r: IntegrationsRepository) {} execute(name: string): Promise<Connector> { return this.r.getConfigSchema(validName(name)); } }
export class GetCredentialsUseCase { constructor(private readonly r: IntegrationsRepository) {} execute(name: string, wid: number) { return this.r.getCredentials(validName(name), validWarehouse(wid)); } }
export class SaveCredentialsUseCase { constructor(private readonly r: IntegrationsRepository) {} execute(name: string, wid: number, values: Record<string,string>) { validName(name); validWarehouse(wid); if (!Object.keys(values).length || Object.values(values).some(v => typeof v !== 'string' || !v.trim())) throw new Error('Introduce al menos una credencial válida'); return this.r.saveCredentials(name, wid, values); } }
export class TestConnectionUseCase { constructor(private readonly r: IntegrationsRepository) {} execute(name: string, wid: number) { return this.r.testConnection(validName(name), validWarehouse(wid)); } }
export class GetSyncStatusUseCase { constructor(private readonly r: IntegrationsRepository) {} execute(name: string, wid: number) { return this.r.getSyncStatus(validName(name), validWarehouse(wid)); } }
export class ResetSyncUseCase { constructor(private readonly r: IntegrationsRepository) {} execute(name: string, wid: number, type?: SyncType | null) { return this.r.resetSync(validName(name), validWarehouse(wid), type); } }
export class ExecuteSyncUseCase { constructor(private readonly r: IntegrationsRepository) {} execute(name: string, wid: number, type: SyncType) { if (!['orders','items','inventory','fulfillment'].includes(type)) throw new Error('Tipo de sincronización inválido'); return this.r.executeSync(validName(name), validWarehouse(wid), type); } }
export class DeleteCredentialsUseCase { constructor(private readonly r: IntegrationsRepository) {} execute(name: string, wid: number) { return this.r.deleteCredentials(validName(name), validWarehouse(wid)); } }
