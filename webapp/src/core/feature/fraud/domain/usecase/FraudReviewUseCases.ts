import type {FraudReviewRepository} from '../repository/FraudReviewRepository';
export class ListFraudReviewsUseCase{constructor(private r:FraudReviewRepository){}execute(w:number|null){return this.r.list(w);}}
export class UpdateFraudMemoUseCase{constructor(private r:FraudReviewRepository){}execute(id:number,memo:string){if(memo.length>2000)throw new Error('La observación supera el límite permitido');return this.r.updateMemo(id,memo);}}
export class PushFraudOrderToQueueUseCase{constructor(private r:FraudReviewRepository){}execute(id:number){return this.r.pushToQueue(id);}}