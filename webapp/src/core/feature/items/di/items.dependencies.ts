import { apiClient } from '../../../infrastructure/api/ApiClient';
import { ItemRemoteDataSource } from '../data/datasource/ItemRemoteDataSource';
import { ItemRepositoryImpl } from '../data/repository/ItemRepositoryImpl';
import { ListItemsUseCase } from '../domain/usecase/ListItemsUseCase';
import { SearchItemsUseCase } from '../domain/usecase/SearchItemsUseCase';

export function createItemsDependencies() {
	const datasource = new ItemRemoteDataSource(apiClient);
	const repository = new ItemRepositoryImpl(datasource);

	return {
		listItems: new ListItemsUseCase(repository),
		searchItems: new SearchItemsUseCase(repository)
	};
}

export type ItemsDependencies = ReturnType<typeof createItemsDependencies>;
