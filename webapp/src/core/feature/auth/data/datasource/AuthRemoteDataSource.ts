import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
	LoginResponseDto,
	LogoutResponseDto,
	MeResponseDto,
	RefreshResponseDto
} from '../dto/AuthDto';

export class AuthRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	login(username: string, password: string): Promise<LoginResponseDto> {
		return this.api.post<LoginResponseDto>(
			'/api/auth/login',
			{ username, password },
			{ anonymous: true }
		);
	}

	me(): Promise<MeResponseDto> {
		return this.api.get<MeResponseDto>('/api/auth/me');
	}

	refresh(): Promise<RefreshResponseDto> {
		return this.api.post<RefreshResponseDto>('/api/auth/refresh');
	}

	logout(): Promise<LogoutResponseDto> {
		return this.api.post<LogoutResponseDto>('/api/auth/logout');
	}
}
