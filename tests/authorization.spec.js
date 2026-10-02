import { test, expect } from '@playwright/test';
import { login, resetLab, users } from './helpers.js';

test.describe('Autorização @authorization', () => {
  test.beforeEach(async ({ request }) => resetLab(request));

  test('usuário não autenticado é redirecionado ao tentar rota protegida', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?reason=auth/);
    await expect(page.getByRole('status')).toHaveText('Faça login para continuar.');
  });

  test('usuário comum recebe 403 ao acessar /admin', async ({ page }) => {
    await login(page, users.standard);
    const response = await page.goto('/admin');
    expect(response.status()).toBe(403);
    await expect(page.getByRole('heading', { name: 'Acesso não autorizado' })).toBeVisible();
  });

  test('usuário admin acessa painel administrativo', async ({ page }) => {
    await login(page, users.admin);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
    await expect(page.getByText('Painel administrativo')).toBeVisible();
  });
});
