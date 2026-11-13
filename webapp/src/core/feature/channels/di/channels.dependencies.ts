import { apiClient } from '../../../infrastructure/api/ApiClient';
import { ChannelsRemoteDataSource } from '../data/datasource/ChannelsRemoteDataSource';
import { ChannelsRepositoryImpl } from '../data/repository/ChannelsRepositoryImpl';
import { ListChannelsUseCase, CreateChannelUseCase, DeleteChannelUseCase } from '../domain/usecase/ChannelsUseCases';

export function createChannelsDependencies() {
	const repository = new ChannelsRepositoryImpl(new ChannelsRemoteDataSource(apiClient));
	return {
		list: new ListChannelsUseCase(repository),
		create: new CreateChannelUseCase(repository),
		remove: new DeleteChannelUseCase(repository)
	};
}
