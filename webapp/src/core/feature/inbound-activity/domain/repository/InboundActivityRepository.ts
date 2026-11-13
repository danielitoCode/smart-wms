import type { InboundActivityDetail, InboundActivityQuery, InboundActivityRow } from '../entity/InboundActivity';

export type InboundActivityPage = {
	rows: InboundActivityRow[];
	page: number;
	perPage: number;
	total: number;
};

export interface InboundActivityRepository {
	list(query?: InboundActivityQuery): Promise<InboundActivityPage>;
	getDetail(resource: string, inboundId: number): Promise<InboundActivityDetail>;
}
