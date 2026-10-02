import { test, expect } from '@playwright/test';
import { login, resetLab } from './helpers.js';

test.describe('Sessão @session', () => {
  test.beforeEach(async ({ request }) => resetLab(request));

  test('logout invalida a sessão e impede retorno à área protegida', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?reason=auth/);
  });

  test('sessão expirada redireciona para login', async ({ page }) => {
    await login(page);
    const expire = await page.request.post('/test/expire-session');
    expect(expire.ok()).toBeTruthy();

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login\?reason=auth/);
  });
});
