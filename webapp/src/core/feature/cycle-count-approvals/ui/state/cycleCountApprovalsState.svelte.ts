import { createCycleCountApprovalsDependencies } from '../../di/cycleCountApprovals.dependencies';
import type { CycleCountApproval } from '../../domain/entity/CycleCountApproval';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { authSession } from '../../../../infrastructure/auth/AuthSession';
import { canPerform } from '../../../auth/domain/policy/AccessPolicy';

const d = createCycleCountApprovalsDependencies();

export function createCycleCountApprovalsState() {
	let groups = $state<CycleCountApproval[]>([]);
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let sortBy = $state<'count' | 'bin'>('count');
	let decisions = $state<Record<number, 'approve' | 'reject'>>({});

	/** UX only — Flask still requires adjustments page key on decide endpoints. */
	function canApprove(): boolean {
		const u = authSession.getUser();
		if (!u) return false;
		return canPerform(u.role, u.allowedPages, u.allowedOverrides ?? [], {
			pageKey: 'adjustments',
			capability: 'approve_or_modify'
		});
	}

	function canOpenApprovalsPage(): boolean {
		const u = authSession.getUser();
		if (!u) return false;
		return canPerform(u.role, u.allowedPages, u.allowedOverrides ?? [], {
			pageKey: 'count-approvals',
			capability: 'open_page'
		});
	}

	async function load() {
		loading = true;
		error = null;
		try {
			groups = await d.list.execute();
			decisions = Object.fromEntries(
				groups.flatMap((g) => g.adjustments.map((a) => [a.adjustmentId, 'approve' as const]))
			);
		} catch (e) {
			error = toUserMessage(e, 'No se pudieron cargar las aprobaciones');
		} finally {
			loading = false;
		}
	}

	function setDecision(id: number, action: 'approve' | 'reject') {
		decisions = { ...decisions, [id]: action };
	}

	function setAll(g: CycleCountApproval, action: 'approve' | 'reject') {
		const next = { ...decisions };
		g.adjustments.forEach((a) => {
			next[a.adjustmentId] = action;
		});
		decisions = next;
	}

	async function submit(g: CycleCountApproval) {
		if (!canApprove()) {
			error = 'No tienes permiso para aprobar o rechazar ajustes';
			return false;
		}
		saving = true;
		error = null;
		try {
			await d.review.execute(
				g.cycleCountId,
				g.adjustments.map((a) => ({
					adjustmentId: a.adjustmentId,
					action: decisions[a.adjustmentId] ?? 'approve'
				}))
			);
			await load();
			return true;
		} catch (e) {
			error = toUserMessage(e, 'No se pudieron enviar las decisiones');
			return false;
		} finally {
			saving = false;
		}
	}

	return {
		get groups() {
			return groups;
		},
		get loading() {
			return loading;
		},
		get saving() {
			return saving;
		},
		get error() {
			return error;
		},
		get sortBy() {
			return sortBy;
		},
		get decisions() {
			return decisions;
		},
		get canApprove() {
			return canApprove();
		},
		get canOpenPage() {
			return canOpenApprovalsPage();
		},
		setSort(v: 'count' | 'bin') {
			sortBy = v;
		},
		setDecision,
		setAll,
		submit,
		load,
		get sortedGroups() {
			return [...groups].sort((a, b) =>
				sortBy === 'bin'
					? a.binCode.localeCompare(b.binCode, undefined, { numeric: true })
					: a.cycleCountId - b.cycleCountId
			);
		}
	};
}
