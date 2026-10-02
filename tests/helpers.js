import { expect } from '@playwright/test';

export const users = {
  standard: { email: 'qa.user@test.local', password: 'Qa@123456' },
  admin: { email: 'qa.admin@test.local', password: 'Admin@123456' },
  blocked: { email: 'qa.blocked@test.local', password: 'Blocked@123456' },
  expired: { email: 'qa.expired@test.local', password: 'Expired@123456' },
  mfa: { email: 'qa.mfa@test.local', password: 'Mfa@123456' },
  inactive: { email: 'qa.inactive@test.local', password: 'Inactive@123456' }
};

export async function resetLab(request) {
  const response = await request.post('/test/reset');
  expect(response.ok()).toBeTruthy();
}

export async function login(page, user = users.standard) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(user.email);
  await page.getByLabel('Senha').fill(user.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}
