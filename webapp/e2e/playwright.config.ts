import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

type R2E2EConfig = {
	webBaseUrl: string;
};

const r2E2EConfig = JSON.parse(
	readFileSync(new URL('../../scripts/r2-e2e/config.json', import.meta.url), 'utf8')
) as R2E2EConfig;

export default defineConfig({
	testDir: './tests',
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	retries: 0,
	workers: 1,
	reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
	timeout: 30_000,
	expect: { timeout: 8_000 },
	use: {
		baseURL: process.env.R2_E2E_BASE_URL ?? r2E2EConfig.webBaseUrl,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		...devices['Desktop Chrome']
	}
});
