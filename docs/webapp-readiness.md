# Webapp readiness and browser verification

## Purpose

Browser checks must distinguish an HTTP response from a hydrated, usable Svelte application.
Do not use the browser `load` event as the readiness condition: it also waits for secondary
resources such as images and fonts, which are not required for the login form or application shell.

## Readiness contract

The root Svelte layout exposes two diagnostic attributes on `document.documentElement`:

- `data-app-state="initializing"`: client mount started; shared theme/i18n initialization is running.
- `data-app-state="ready"` and `data-app-ready="true"`: client mount and shared initialization completed successfully.
- `data-app-state="error"`: shared initialization threw an exception.

These attributes are observability signals only. They must never be used for authentication,
authorization, feature grants, API access, or any security decision. Server-side authorization
and backend checks remain authoritative.

## Browser navigation contract

E2E navigation uses:

1. `page.goto(path, { waitUntil: 'domcontentloaded' })` to wait for document parsing.
2. An explicit assertion for `html[data-app-state="ready"]` with a bounded timeout.
3. Feature-specific assertions (form controls, headings, route and business behavior).

A missing readiness signal is a real startup/hydration failure and must fail with a bounded,
actionable timeout. Do not increase the global test timeout to conceal it.

## Development verification

From `webapp/e2e`, with the isolated R2 services running:

```powershell
npx playwright test -g "ADMIN inicia sesión" --reporter=line
npx playwright test --reporter=line
```

The R2 startup script separately checks Flask, Vite's HTTP response, and the same-origin API
proxy. Browser E2E then verifies client hydration and behavior. These checks are complementary.

## Production smoke verification

Build and serve the production frontend (or use the deployed frontend), then run only the
unauthenticated app-readiness smoke test:

```powershell
$env:R2_E2E_BASE_URL = "https://frontend.example.com"
npx playwright test tests/app-readiness.spec.ts --reporter=line
Remove-Item Env:R2_E2E_BASE_URL
```

This smoke test must not attempt to authenticate with synthetic E2E users against production.
Authenticated role/permission tests belong only to an isolated test environment with synthetic
accounts and isolated data.

## Security invariants

- No authentication or authorization behavior is bypassed or mocked by the readiness marker.
- No CORS policy, API contract, backend permission, session, cookie, or token behavior is changed.
- Never expose secrets, environment variables, internal configuration, or sensitive backend details
  through readiness attributes or public health responses.
- Production authorization must continue to be enforced by Flask for every protected operation.
- A frontend-ready state does not imply API-ready or security-ready; those are verified separately.
