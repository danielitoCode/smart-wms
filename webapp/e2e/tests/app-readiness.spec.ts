import { test, expect, type Page } from '@playwright/test';

async function openReadyApp(page: Page) {
	await page.goto('/login', { waitUntil: 'domcontentloaded' });
	await expect(page.locator('html')).toHaveAttribute('data-app-state', 'ready', {
		timeout: 10_000
	});
}

test('production-safe smoke: Svelte app hydrates and login form is usable', async ({ page }) => {
	await openReadyApp(page);
	await expect(page.locator('#login-username')).toBeVisible();
	await expect(page.locator('#login-password')).toBeVisible();
	await expect(page.getByRole('main').getByRole('button')).toHaveCount(1);
});
