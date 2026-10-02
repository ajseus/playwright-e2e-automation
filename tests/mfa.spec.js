import { test, expect } from '@playwright/test';
import { login, resetLab, users } from './helpers.js';

test.describe('MFA @mfa', () => {
  test.beforeEach(async ({ request }) => resetLab(request));

  test('usuário com MFA precisa informar segundo fator', async ({ page }) => {
    await login(page, users.mfa);
    await expect(page).toHaveURL(/\/mfa$/);
    await expect(page.getByRole('heading', { name: 'Confirme sua identidade' })).toBeVisible();

    await page.getByLabel('Código de verificação').fill('123456');
    await page.getByRole('button', { name: 'Validar código' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('código MFA inválido é rejeitado', async ({ page }) => {
    await login(page, users.mfa);
    await page.getByLabel('Código de verificação').fill('000000');
    await page.getByRole('button', { name: 'Validar código' }).click();
    await expect(page.getByRole('alert')).toHaveText('Código de verificação inválido.');
  });
});
