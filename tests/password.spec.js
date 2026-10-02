import { test, expect } from '@playwright/test';
import { login, resetLab, users } from './helpers.js';

test.describe('Senha @password', () => {
  test.beforeEach(async ({ request }) => resetLab(request));

  test('senha expirada obriga troca antes de acessar dashboard', async ({ page }) => {
    await login(page, users.expired);
    await expect(page).toHaveURL(/\/change-password\?token=/);
    await expect(page.getByRole('heading', { name: 'Sua senha expirou' })).toBeVisible();

    await page.getByLabel('Nova senha').fill('NovaSenha@123');
    await page.getByLabel('Confirmar senha').fill('NovaSenha@123');
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('fluxo de esqueci minha senha altera a senha', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('E-mail').fill(users.standard.email);
    await page.getByRole('button', { name: 'Gerar link de recuperação' }).click();

    await expect(page.getByRole('status')).toContainText('Se o e-mail existir');
    await page.getByTestId('qa-reset-link').click();

    await page.getByLabel('Nova senha').fill('MinhaNova@123');
    await page.getByLabel('Confirmar senha').fill('MinhaNova@123');
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();
    await expect(page.getByRole('status')).toHaveText('Senha alterada com sucesso.');

    await page.getByRole('link', { name: 'Entrar com nova senha' }).click();
    await page.getByLabel('E-mail').fill(users.standard.email);
    await page.getByLabel('Senha').fill('MinhaNova@123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('recuperação não revela se um e-mail existe', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('E-mail').fill('fantasma@test.local');
    await page.getByRole('button', { name: 'Gerar link de recuperação' }).click();
    await expect(page.getByRole('status')).toHaveText('Se o e-mail existir, enviaremos instruções de recuperação.');
  });
});
