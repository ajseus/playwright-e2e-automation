import { test, expect } from '@playwright/test';
import { users } from './helpers.js';

/**
 * SUÍTE DE DEMONSTRAÇÃO
 * --------------------
 * Diferente das suítes de regressão, esta suíte mantém o MESMO navegador,
 * contexto e página durante toda a apresentação.
 *
 * Objetivo: tornar a execução visual e didática, fazendo logout entre
 * cenários autenticados em vez de abrir uma nova janela a cada teste.
 */
test.describe.serial('Demonstração completa QA @demo', () => {
  let context;
  let page;

  async function preencherLogin(user) {
    await page.getByLabel('E-mail').fill(user.email);
    await page.getByLabel('Senha').fill(user.password);
    await page.getByRole('button', { name: 'Entrar' }).click();
  }

  async function logout() {
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login/);
  }

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      baseURL: 'http://127.0.0.1:3000',
      viewport: null
    });

    page = await context.newPage();

    const reset = await context.request.post('/test/reset');
    expect(reset.ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('01 - usuário válido entra no dashboard', async () => {
    await page.goto('/login');
    await preencherLogin(users.standard);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Bem-vindo, QA User.')).toBeVisible();
  });

  test('02 - usuário faz logout e sessão é invalidada', async () => {
    await logout();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?reason=auth/);
    await expect(page.getByRole('status')).toHaveText('Faça login para continuar.');
  });

  test('03 - administrador entra e acessa área restrita', async () => {
  await page.goto('/login');
  await preencherLogin(users.admin);

  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/admin');

  await expect(page).toHaveURL(/\/admin$/);

  await expect(
    page.getByRole('heading', {
      name: 'Admin',
      exact: true
    })
  ).toBeVisible();

  await expect(
    page.getByRole('heading', {
      name: 'Painel administrativo',
      exact: true
    })
  ).toBeVisible();
});

  test('04 - administrador encerra a sessão pelo botão Sair', async () => {
    await logout();
  });

  test('05 - senha inválida é rejeitada sem abrir nova janela', async () => {
    await page.getByLabel('E-mail').fill(users.standard.email);
    await page.getByLabel('Senha').fill('senha-incorreta');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos.');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('06 - usuário bloqueado não autentica', async () => {
    await page.getByLabel('E-mail').fill(users.blocked.email);
    await page.getByLabel('Senha').fill(users.blocked.password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByRole('alert')).toContainText('Conta bloqueada');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('07 - usuário com MFA valida o segundo fator e sai', async () => {
    await page.getByLabel('E-mail').fill(users.mfa.email);
    await page.getByLabel('Senha').fill(users.mfa.password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/mfa$/);
    await page.getByLabel('Código de verificação').fill('123456');
    await page.getByRole('button', { name: 'Validar código' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await logout();
  });

  test('08 - senha expirada é alterada e usuário encerra a sessão', async () => {
    await preencherLogin(users.expired);

    await expect(page).toHaveURL(/\/change-password\?token=/);
    await page.getByLabel('Nova senha').fill('NovaSenha@123');
    await page.getByLabel('Confirmar senha').fill('NovaSenha@123');
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await logout();
  });

  test('09 - recuperação de senha conclui login com a nova senha', async () => {
    await page.goto('/forgot-password');
    await page.getByLabel('E-mail').fill(users.standard.email);
    await page.getByRole('button', { name: 'Gerar link de recuperação' }).click();

    await expect(page.getByRole('status')).toContainText('Se o e-mail existir');
    await page.getByTestId('qa-reset-link').click();

    await page.getByLabel('Nova senha').fill('MinhaNova@123');
    await page.getByLabel('Confirmar senha').fill('MinhaNova@123');
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();

    await page.getByRole('link', { name: 'Entrar com nova senha' }).click();
    await page.getByLabel('E-mail').fill(users.standard.email);
    await page.getByLabel('Senha').fill('MinhaNova@123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await logout();
  });
});
