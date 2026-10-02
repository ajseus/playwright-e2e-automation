import { test, expect } from '@playwright/test';
import { resetLab, users } from './helpers.js';

test.describe('Proteção contra brute force @lockout', () => {
  test.beforeEach(async ({ request }) => resetLab(request));

  test('bloqueia temporariamente após 5 tentativas inválidas', async ({ page }) => {
    for (let i = 1; i <= 5; i++) {
      await page.goto('/login');
      await page.getByLabel('E-mail').fill(users.standard.email);
      await page.getByLabel('Senha').fill(`errada-${i}`);
      await page.getByRole('button', { name: 'Entrar' }).click();
    }

    await expect(page.getByRole('alert')).toContainText('temporariamente bloqueada');

    await page.goto('/login');
    await page.getByLabel('E-mail').fill(users.standard.email);
    await page.getByLabel('Senha').fill(users.standard.password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('alert')).toContainText('temporariamente bloqueada');
    await expect(page).not.toHaveURL(/\/dashboard$/);
  });
});
