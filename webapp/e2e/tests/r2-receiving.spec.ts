import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

type R2E2EConfig = {
	apiBaseUrl: string;
};

const r2E2EConfig = JSON.parse(
	readFileSync(new URL('../../../scripts/r2-e2e/config.json', import.meta.url), 'utf8')
) as R2E2EConfig;

const apiBase = process.env.R2_E2E_API_URL ?? r2E2EConfig.apiBaseUrl;

async function login(page: Page, username: string) {
	await page.goto('/login');
	await page.locator('#login-username').fill(username);
	await page.locator('#login-password').fill('admin');
	// El nombre visible del botón cambia según el idioma activo.
	// Acotamos al main para seleccionar el botón de envío sin depender del texto traducido.
	const submitButton = page.getByRole('main').getByRole('button');
	await expect(submitButton).toHaveCount(1);
	await expect(submitButton).toBeEnabled();
	await submitButton.click();
	await expect(page).not.toHaveURL(/\\/login(?:\\?|$)/);
}

test.describe('R2.11 — recepción en navegador', () => {
	test('ADMIN inicia sesión y abre Recepción', async ({ page }) => {
		await login(page, 'admin');
		await page.goto('/receiving');
		await expect(page).toHaveURL(/\\/receiving(?:\\?|$)/);
		// La pantalla debe renderizar contenido semántico, sin fijar el idioma de la UI.
		await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible();
	});

	test('USER con grant receiving abre la ruta de recepción', async ({ page }) => {
		await login(page, 'r2_user');
		await page.goto('/receiving');
		await expect(page).toHaveURL(/\\/receiving(?:\\?|$)/);
		await expect(page.getByRole('main').getByRole('heading').first()).toBeVisible();
	});

	test('USER sin grant receiving recibe 403 del contrato Flask', async ({ page }) => {
		await login(page, 'r2_limited');
		const response = await page.request.get(
			`${apiBase}/api/receiving/po/PO-R2-E2E-NOT-FOUND`
		);
		expect(response.status()).toBe(403);
	});
});
