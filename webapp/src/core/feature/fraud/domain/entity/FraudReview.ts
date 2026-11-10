/**
 * Fraud review domain.
 *
 * A review is a separate assessment record associated with an order. The
 * SalesOrder FRAUD_REVIEW status remains an order lifecycle state and is not
 * duplicated here.
 */

export type FraudReviewStatus =
	| 'PENDING'
	| 'IN_REVIEW'
	| 'APPROVED'
	| 'REJECTED'
	| 'ESCALATED'
	| 'CLOSED'
	| (string & {});

export type FraudDecision = 'APPROVE' | 'REJECT' | 'ESCALATE' | 'NO_DECISION' | (string & {});

export type FraudSignal = {
	code: string;
	label?: string | null;
	description?: string | null;
	severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | (string & {});
	source?: string | null;
	observedAt?: string | null;
};

export type FraudReview = {
	fraudReviewId: number;
	salesOrderId: number;
	salesOrderNumber?: string | null;
	status: FraudReviewStatus;
	decision?: FraudDecision | null;
	signals: FraudSignal[];
	riskScore?: number | null;
	riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | (string & {}) | null;
	assignedTo?: number | null;
	reviewedBy?: number | null;
	reviewNotes?: string | null;
	decisionReason?: string | null;
	createdAt?: string | null;
	updatedAt?: string | null;
	reviewedAt?: string | null;
	closedAt?: string | null;
};

export type CreateFraudReview = {
	salesOrderId: number;
	signals?: FraudSignal[];
	riskScore?: number | null;
	riskLevel?: string | null;
};

export type UpdateFraudReview = {
	fraudReviewId: number;
	status?: FraudReviewStatus;
	assignedTo?: number | null;
	signals?: FraudSignal[];
	riskScore?: number | null;
	riskLevel?: string | null;
	reviewNotes?: string | null;
};

export type DecideFraudReview = {
	fraudReviewId: number;
	decision: FraudDecision;
	decisionReason?: string | null;
	reviewNotes?: string | null;
};
