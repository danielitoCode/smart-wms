import { apiClient } from '../../../infrastructure/api/ApiClient';
import { ItemRemoteDataSource } from '../data/datasource/ItemRemoteDataSource';
import { ItemRepositoryImpl } from '../data/repository/ItemRepositoryImpl';
import { ArchiveItemUseCase } from '../domain/usecase/ArchiveItemUseCase';
import { CreateItemUseCase } from '../domain/usecase/CreateItemUseCase';
import { DeleteItemUseCase } from '../domain/usecase/DeleteItemUseCase';
import { GetItemDetailUseCase } from '../domain/usecase/GetItemDetailUseCase';
import { ListItemsUseCase } from '../domain/usecase/ListItemsUseCase';
import { SearchItemsUseCase } from '../domain/usecase/SearchItemsUseCase';
import { UpdateItemUseCase } from '../domain/usecase/UpdateItemUseCase';

export function createItemsDependencies() {
	const datasource = new ItemRemoteDataSource(apiClient);
	const repository = new ItemRepositoryImpl(datasource);

	return {
		listItems: new ListItemsUseCase(repository),
		getItemDetail: new GetItemDetailUseCase(repository),
		createItem: new CreateItemUseCase(repository),
		updateItem: new UpdateItemUseCase(repository),
		archiveItem: new ArchiveItemUseCase(repository),
		deleteItem: new DeleteItemUseCase(repository),
		searchItems: new SearchItemsUseCase(repository)
	};
}

export type ItemsDependencies = ReturnType<typeof createItemsDependencies>;
