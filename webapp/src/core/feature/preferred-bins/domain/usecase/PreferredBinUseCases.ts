import type {PreferredBinsRepository} from '../repository/PreferredBinsRepository';
import type {PreferredBinCandidate} from '../entity/PreferredBin';
export class ListPreferredBinsUseCase{constructor(private r:PreferredBinsRepository){}execute(q?:{search?:string;itemId?:number}){return this.r.list(q);}}
export class CreatePreferredBinUseCase{constructor(private r:PreferredBinsRepository){}execute(v:PreferredBinCandidate){if(v.itemId<=0||v.binId<=0||v.priority<1)throw new Error('Item, ubicación y prioridad deben ser válidos');return this.r.create(v);}}
export class UpdatePreferredBinUseCase{constructor(private r:PreferredBinsRepository){}execute(id:number,priority:number){if(priority<1||priority>100)throw new Error('La prioridad debe estar entre 1 y 100');return this.r.update(id,priority);}}
export class DeletePreferredBinUseCase{constructor(private r:PreferredBinsRepository){}execute(id:number){return this.r.remove(id);}}