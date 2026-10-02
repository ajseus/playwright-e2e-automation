import { test, expect } from '@playwright/test';
import { login, resetLab, users } from './helpers.js';

test.describe('Autenticação @auth', () => {
  test.beforeEach(async ({ request }) => resetLab(request));

  test('usuário válido acessa o dashboard', async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Bem-vindo, QA User.')).toBeVisible();
  });

  test('senha inválida mostra mensagem genérica e não autentica', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(users.standard.email);
    await page.getByLabel('Senha').fill('senha-incorreta');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('usuário inexistente recebe a mesma mensagem da senha inválida', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill('nao.existe@test.local');
    await page.getByLabel('Senha').fill('qualquer-senha');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.');
  });

  test('campos obrigatórios são validados', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toHaveText('Preencha e-mail e senha.');
  });

  test('usuário bloqueado não autentica', async ({ page }) => {
    await login(page, users.blocked);
    await expect(page.getByRole('alert')).toContainText('Conta bloqueada');
  });

  test('usuário inativo não autentica', async ({ page }) => {
    await login(page, users.inactive);
    await expect(page.getByRole('alert')).toHaveText('Conta inativa.');
  });
});
