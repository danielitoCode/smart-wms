import type { Setting } from '../../domain/entity/Setting';
import type { SettingDto, SettingListItemDto } from '../dto/SettingDto';

export const SettingMapper = {
	toDomain(dto: SettingDto): Setting {
		return { key: dto.key, value: dto.value };
	},
	toListItemDomain(dto: SettingListItemDto): Setting {
		return { key: dto.key, value: dto.value };
	}
};
