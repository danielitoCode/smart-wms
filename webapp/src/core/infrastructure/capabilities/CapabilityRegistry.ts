/**
 * Evidence-backed server capability inventory for the shared platform.
 * Status describes the Flask contract, not the completeness of its UI.
 */
export type CapabilityStatus = 'SUPPORTED' | 'PARTIAL' | 'NOT_SUPPORTED' | 'UNVERIFIED';

export type ServerCapability = {
	id: string;
	owner: string;
	status: CapabilityStatus;
	method: string;
	path: string;
	permission: string;
	warehouseScope: string;
	requestDto: string;
	responseDto: string;
	sideEffects: string;
	idempotency: string;
	evidence: readonly string[];
	notes?: string;
};

export const SERVER_CAPABILITIES = {
	'auth.login': {
		id: 'auth.login',
		owner: 'auth',
		status: 'SUPPORTED',
		method: 'POST',
		path: '/api/auth/login',
		permission: 'Public credentials endpoint; rate-limited by IP + username',
		warehouseScope: 'None',
		requestDto: 'LoginRequest { username, password }',
		responseDto: '{ token, user } plus HttpOnly sentry_auth and readable sentry_csrf cookies',
		sideEffects: 'Updates last_login and resets failed-login counters; sets auth/CSRF cookies',
		idempotency: 'Not idempotent; authentication attempt and counters are stateful',
		evidence: ['api/routes/auth.py@login', 'api/schemas/auth.py:LoginRequest', 'api/services/auth_service.py:authenticate_user', 'api/services/cookie_auth.py:set_auth_cookies']
	},
	'auth.me': {
		id: 'auth.me',
		owner: 'auth',
		status: 'SUPPORTED',
		method: 'GET',
		path: '/api/auth/me',
		permission: 'Authenticated session; account must remain active',
		warehouseScope: 'Returns assigned warehouse IDs; no selected-warehouse mutation',
		requestDto: 'No body',
		responseDto: 'UserDto with warehouse_ids, allowed_functions, allowed_pages, allowed_overrides and must_change_password',
		sideEffects: 'Read-only; reloads current identity and grants from database',
		idempotency: 'Idempotent read',
		evidence: ['api/routes/auth.py@me', 'api/middleware/auth_middleware.py@require_auth']
	},
	'auth.refresh': {
		id: 'auth.refresh',
		owner: 'auth',
		status: 'PARTIAL',
		method: 'POST',
		path: '/api/auth/refresh',
		permission: 'Requires a currently valid authenticated token',
		warehouseScope: 'None',
		requestDto: 'No body',
		responseDto: '{ token } plus replacement HttpOnly sentry_auth and sentry_csrf cookies',
		sideEffects: 'Issues a new eight-hour token and replaces auth/CSRF cookies',
		idempotency: 'Not guaranteed; rotates the session token/cookies',
		evidence: ['api/routes/auth.py@refresh', 'api/middleware/auth_middleware.py@require_auth', 'api/services/auth_service.py@decode_token', 'api/tests/test_auth.py::TestRefresh'],
		notes: 'This endpoint cannot recover an expired session: require_auth rejects an expired token before the refresh handler runs. A 401 from /me must lead to re-login, not another /refresh attempt.'
	},
	'auth.change-password': {
		id: 'auth.change-password',
		owner: 'auth',
		status: 'SUPPORTED',
		method: 'POST',
		path: '/api/auth/change-password',
		permission: 'Authenticated session; forced-change users are explicitly allowed to call this endpoint',
		warehouseScope: 'None',
		requestDto: 'ChangePasswordRequest { current_password, new_password }',
		responseDto: '{ message }',
		sideEffects: 'Updates password hash, clears must_change_password and writes audit event',
		idempotency: 'Not idempotent; password update and audit write',
		evidence: ['api/routes/auth.py@change_password', 'api/schemas/auth.py:ChangePasswordRequest']
	},
	'auth.logout': {
		id: 'auth.logout',
		owner: 'auth',
		status: 'SUPPORTED',
		method: 'POST',
		path: '/api/auth/logout',
		permission: 'Valid cookie session requires matching X-CSRF-Token; absent/invalid cookie is a safe no-op/cleanup',
		warehouseScope: 'None',
		requestDto: 'No body',
		responseDto: '{ message }',
		sideEffects: 'Clears sentry_auth and sentry_csrf cookies when applicable',
		idempotency: 'Idempotent cleanup',
		evidence: ['api/routes/auth.py@logout', 'api/services/cookie_auth.py:csrf_token_matches']
	},
	'authorization.page-grants': {
		id: 'authorization.page-grants',
		owner: 'auth',
		status: 'SUPPORTED',
		method: 'GET + middleware',
		path: '/api/auth/me; protected /api/admin routes',
		permission: 'ADMIN bypasses; other roles require the exact page_key; overrides are separate grants',
		warehouseScope: 'Independent of page grants; warehouse checks remain enforced separately',
		requestDto: 'No body for /me; route-specific requests for protected endpoints',
		responseDto: '/me includes allowed_pages and allowed_overrides',
		sideEffects: 'Read-only grant lookup; middleware rejects unauthorized requests with 403',
		idempotency: 'Idempotent read/check',
		evidence: ['api/routes/auth.py@me', 'api/middleware/auth_middleware.py@require_auth', 'api/middleware/auth_middleware.py@require_admin_or_page_permission', 'api/constants.py:ALL_PAGE_KEYS']
	},
	'warehouse.active-list': {
		id: 'warehouse.active-list',
		owner: 'warehouses',
		status: 'SUPPORTED',
		method: 'GET',
		path: '/api/warehouses/list',
		permission: 'Authenticated session',
		warehouseScope: 'ADMIN sees all active warehouses; other users are filtered by warehouse_scope_clause using assigned warehouse_ids',
		requestDto: 'No body',
		responseDto: '{ warehouses: [{ id, name, code }] }',
		sideEffects: 'Read-only active warehouse catalog',
		idempotency: 'Idempotent read',
		evidence: ['api/routes/warehouses.py@list_warehouses', 'api/middleware/auth_middleware.py@warehouse_scope_clause']
	},
	'warehouse.request-scope': {
		id: 'warehouse.request-scope',
		owner: 'infrastructure',
		status: 'PARTIAL',
		method: 'Authentication middleware',
		path: 'Warehouse-scoped Flask routes',
		permission: 'Non-admin user must be assigned to the requested warehouse',
		warehouseScope: 'Path, query and JSON body warehouse_id values must agree; mismatch returns 400 and unauthorized scope returns 403',
		requestDto: 'Route-specific; warehouse_id may be supplied in path, query or JSON body',
		responseDto: 'Route-specific; cross-warehouse reads use SQL scope clauses where implemented',
		sideEffects: 'Rejects unauthorized or mismatched requests before handler execution',
		idempotency: 'Validation only; does not mutate resources',
		evidence: ['api/middleware/auth_middleware.py@require_auth', 'api/middleware/auth_middleware.py@check_warehouse_access', 'api/middleware/auth_middleware.py@warehouse_scope_clause'],
		notes: 'Explicit warehouse_id values are validated centrally, but collection queries are isolated only when handlers apply warehouse_scope_clause. Full route/query audit is still required.'
	}
} as const satisfies Record<string, ServerCapability>;

export type ServerCapabilityId = keyof typeof SERVER_CAPABILITIES;

export function getServerCapability(id: ServerCapabilityId): ServerCapability {
	return SERVER_CAPABILITIES[id];
}

export function isServerCapabilitySupported(id: ServerCapabilityId): boolean {
	return SERVER_CAPABILITIES[id].status === 'SUPPORTED';
}
