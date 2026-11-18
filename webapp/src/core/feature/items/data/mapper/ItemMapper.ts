import type {
	Item,
	ItemDetail,
	ItemInventoryLine,
	ItemListPage,
	ItemPreferredBin,
	ItemWriteInput
} from '../../domain/entity/Item';
import type {
	ItemDetailResponseDto,
	ItemDto,
	ItemInventoryDto,
	ItemListResponseDto,
	ItemPreferredBinDto,
	ItemWriteBodyDto
} from '../dto/ItemDto';

function aliasesOf(dto: ItemDto): string[] {
	if (Array.isArray(dto.barcode_aliases)) return dto.barcode_aliases.filter((x) => typeof x === 'string');
	return [];
}

export const ItemMapper = {
	toItem(dto: ItemDto): Item {
		return {
			id: dto.item_id ?? dto.id ?? 0,
			sku: dto.sku,
			name: dto.item_name ?? dto.name ?? '',
			description: dto.description ?? null,
			upc: dto.upc ?? null,
			mpn: dto.mpn ?? null,
			barcodeAliases: aliasesOf(dto),
			category: dto.category ?? null,
			weightLbs: dto.weight_lbs ?? null,
			lengthIn: dto.length_in ?? null,
			widthIn: dto.width_in ?? null,
			heightIn: dto.height_in ?? null,
			defaultBinId: dto.default_bin_id ?? null,
			defaultBinCode: dto.default_bin_code ?? null,
			reorderPoint: dto.reorder_point ?? null,
			reorderQty: dto.reorder_qty ?? null,
			isLotTracked: Boolean(dto.is_lot_tracked),
			isSerialTracked: Boolean(dto.is_serial_tracked),
			active: dto.is_active ?? dto.active ?? true,
			createdAt: dto.created_at ?? null,
			updatedAt: dto.updated_at ?? null
		};
	},

	toInventoryLine(dto: ItemInventoryDto): ItemInventoryLine {
		return {
			inventoryId: dto.inventory_id,
			binId: dto.bin_id,
			binCode: dto.bin_code ?? null,
			zoneName: dto.zone_name ?? null,
			quantityOnHand: dto.quantity_on_hand,
			quantityAllocated: dto.quantity_allocated
		};
	},

	toPreferredBin(dto: ItemPreferredBinDto): ItemPreferredBin {
		return {
			preferredBinId: dto.preferred_bin_id,
			binId: dto.bin_id,
			binCode: dto.bin_code ?? null,
			zoneName: dto.zone_name ?? null,
			priority: dto.priority
		};
	},

	/** Unwraps Flask { item, inventory, preferred_bins }. */
	toDetail(body: ItemDetailResponseDto | ItemDto): ItemDetail {
		if (body && typeof body === 'object' && 'item' in body && (body as ItemDetailResponseDto).item) {
			const wrap = body as ItemDetailResponseDto;
			return {
				item: ItemMapper.toItem(wrap.item),
				inventory: (wrap.inventory ?? []).map(ItemMapper.toInventoryLine),
				preferredBins: (wrap.preferred_bins ?? []).map(ItemMapper.toPreferredBin)
			};
		}
		return {
			item: ItemMapper.toItem(body as ItemDto),
			inventory: [],
			preferredBins: []
		};
	},

	toListPage(body: ItemListResponseDto): ItemListPage {
		return {
			items: (body.items ?? []).map(ItemMapper.toItem),
			total: body.total ?? 0,
			page: body.page ?? 1,
			perPage: body.per_page ?? 50,
			pages: body.pages ?? 1
		};
	},

	toWriteBody(input: Partial<ItemWriteInput>): ItemWriteBodyDto {
		const body: ItemWriteBodyDto = {};
		if (input.sku !== undefined) body.sku = input.sku;
		if (input.itemName !== undefined) body.item_name = input.itemName;
		if (input.description !== undefined) body.description = input.description;
		if (input.upc !== undefined) body.upc = input.upc;
		if (input.mpn !== undefined) body.mpn = input.mpn;
		if (input.category !== undefined) body.category = input.category;
		if (input.weightLbs !== undefined) body.weight_lbs = input.weightLbs;
		if (input.defaultBinId !== undefined) body.default_bin_id = input.defaultBinId;
		if (input.reorderPoint !== undefined) body.reorder_point = input.reorderPoint;
		if (input.reorderQty !== undefined) body.reorder_qty = input.reorderQty;
		if (input.isActive !== undefined) body.is_active = input.isActive;
		return body;
	}
};
