import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
	ChangePasswordRequestDto,
	ChangePasswordResponseDto,
	LoginResponseDto,
	LogoutResponseDto,
	MeResponseDto,
	RefreshResponseDto
} from '../dto/AuthDto';

export class AuthRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	login(username: string, password: string): Promise<LoginResponseDto> {
		return this.api.post<LoginResponseDto>('/api/auth/login', { username, password });
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

	changePassword(input: ChangePasswordRequestDto): Promise<ChangePasswordResponseDto> {
		return this.api.post<ChangePasswordResponseDto>('/api/auth/change-password', input);
	}
}
