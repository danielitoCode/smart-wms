import { test, expect, type Page } from '@playwright/test';

const apiBase = process.env.R2_E2E_API_URL ?? 'http://127.0.0.1:55000';

async function login(page: Page, username: string) {
  await page.goto('/login');
  await page.locator('#login-username').fill(username);
  await page.locator('#login-password').fill('admin');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

test.describe('R2.11 — recepción en navegador', () => {
  test('ADMIN inicia sesión y abre Recepción', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/receiving');
    await expect(page.getByRole('heading', { name: 'Recepción' })).toBeVisible();
    await expect(page.getByText('Órdenes de compra')).toBeVisible();
  });

  test('USER con grant receiving abre la ruta de recepción', async ({ page }) => {
    await login(page, 'r2_user');
    await page.goto('/receiving');
    await expect(page.getByRole('heading', { name: 'Recepción' })).toBeVisible();
  });

  test('USER sin grant receiving recibe 403 del contrato Flask', async ({ page }) => {
    await login(page, 'r2_limited');
    const response = await page.request.get(
      `${apiBase}/api/receiving/po/PO-R2-E2E-NOT-FOUND`
    );
    expect(response.status()).toBe(403);
  });
});
