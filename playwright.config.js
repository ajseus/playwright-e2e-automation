import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,

  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],

  use: {
    baseURL: 'http://127.0.0.1:3000',

    // Execução visível para demonstração.
    headless: false,

    // Usa o tamanho real da janela do Chromium.
    // Não combinar com presets de devices que definem deviceScaleFactor.
    viewport: null,

    launchOptions: {
      slowMo: 2500,
      args: ['--start-maximized']
    },

    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  webServer: {
    command: 'node server.js',
    url: 'http://127.0.0.1:3000/health',
    reuseExistingServer: true,
    timeout: 15_000,
    stdout: 'pipe',
    stderr: 'pipe'
  },

  projects: [
    {
      name: 'chromium'
    }
  ]
});
