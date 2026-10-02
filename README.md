# QA Playwright Lab

Laboratório local de autenticação criado para praticar Playwright em nível de QA Sênior.

## O que existe no projeto

- Login válido e inválido
- Usuário bloqueado
- Usuário inativo
- Bloqueio temporário após 5 tentativas inválidas
- Dashboard protegido
- Perfis user/admin
- Área `/admin` com autorização por perfil
- Logout e invalidação de sessão
- Expiração de sessão
- MFA fake com código `123456`
- Senha expirada
- Recuperação de senha com link QA
- Testes independentes com reset de estado
- Suíte visual de demonstração em uma única janela
- Navegador maximizado e execução desacelerada (`slowMo: 1200`)
- Trace, screenshot e vídeo retidos em caso de falha

## Requisitos

- Node.js 20+ recomendado
- VS Code

## Instalação

```bash
npm install
npx playwright install chromium
```

No Windows, você também pode executar `INSTALAR.bat`.

## Rodar a aplicação manualmente

```bash
npm run dev
```

Abra:

`http://127.0.0.1:3000`

## Credenciais

| Perfil | Usuário | Senha |
|---|---|---|
| Padrão | qa.user@test.local | Qa@123456 |
| Admin | qa.admin@test.local | Admin@123456 |
| Bloqueado | qa.blocked@test.local | Blocked@123456 |
| Senha expirada | qa.expired@test.local | Expired@123456 |
| MFA | qa.mfa@test.local | Mfa@123456 |
| Inativo | qa.inactive@test.local | Inactive@123456 |

MFA QA: `123456`

# Modo recomendado para apresentação

Esta suíte usa **uma única janela maximizada** e executa um fluxo contínuo. Sempre que um cenário autenticado termina, o Playwright clica em **Sair** antes de continuar com o próximo usuário.

```bash
npm run test:demo
```

ou:

```bash
npx playwright test tests/demo-completa.spec.js
```

No Windows, execute:

`TESTAR_DEMO_COMPLETA.bat`

Fluxo da demonstração:

```text
Login usuário comum
→ Dashboard
→ Sair
→ Validação de sessão encerrada
→ Login Admin
→ Área Admin
→ Sair
→ Senha inválida
→ Usuário bloqueado
→ MFA
→ Dashboard
→ Sair
→ Senha expirada
→ Troca de senha
→ Sair
→ Recuperação de senha
→ Login com nova senha
→ Sair
```

## Demo em debug

```bash
npm run test:demo:debug
```

# Suíte profissional de regressão

Os arquivos de regressão continuam independentes entre si. Isso é intencional: um teste não deve depender do resultado do anterior.

Para executar somente a regressão, sem a suíte encadeada de demonstração:

```bash
npm run test:regression
```

No Windows:

`TESTAR_REGRESSAO.bat`

## Rodar TODOS os arquivos

O `playwright.config.js` usa `workers: 1`, portanto os arquivos são executados sequencialmente, embora cada teste profissional continue tendo isolamento de contexto.

```bash
npm test
```

ou:

```bash
npm run test:all
```

## Rodar um grupo de testes

```bash
npm run test:auth
npm run test:authorization
npm run test:session
npm run test:password
npm run test:mfa
npm run test:lockout
```

## Rodar apenas um arquivo

```bash
npx playwright test tests/auth.spec.js
```

## Rodar um único teste pelo nome

```bash
npx playwright test -g "usuário válido acessa o dashboard"
```

## Rodar por tag

```bash
npx playwright test -g @auth
npx playwright test -g @session
npx playwright test -g @mfa
npx playwright test -g @demo
```

## Rodar vendo o navegador

O navegador já está configurado para abrir maximizado e com `slowMo: 1200`.

```bash
npm run test:headed
```

Para uma apresentação mais limpa, prefira `npm run test:demo`.

## Playwright UI Mode

```bash
npm run test:ui
```

Excelente para escolher testes individualmente e acompanhar cada etapa visualmente.

## Debug passo a passo

```bash
npm run test:debug
```

Ou em apenas um teste:

```bash
npx playwright test tests/auth.spec.js -g "usuário válido" --debug
```

## Relatório HTML

Depois de executar:

```bash
npm run report
```

## Estrutura

```text
qa-playwright-lab/
├── public/
│   └── styles.css
├── tests/
│   ├── helpers.js
│   ├── demo-completa.spec.js
│   ├── auth.spec.js
│   ├── authorization.spec.js
│   ├── session.spec.js
│   ├── mfa.spec.js
│   ├── password.spec.js
│   └── lockout.spec.js
├── .vscode/
│   ├── extensions.json
│   └── tasks.json
├── INSTALAR.bat
├── ABRIR_APP.bat
├── TESTAR_DEMO_COMPLETA.bat
├── TESTAR_COM_NAVEGADOR.bat
├── TESTAR_REGRESSAO.bat
├── TESTAR_TUDO.bat
├── server.js
├── playwright.config.js
├── package.json
└── README.md
```

## Por que existem dois modos?

A suíte de demonstração é deliberadamente encadeada para ficar didática e visual durante uma reunião.

As suítes de regressão chamam `POST /test/reset` antes de cada cenário. Isso devolve o ambiente ao estado inicial e evita dependência entre testes.

Em um projeto real, prefira a arquitetura independente para regressão. A suíte encadeada deve ser tratada como demonstração ou jornada E2E específica, não como substituta de toda a estratégia de testes.

O endpoint `/test/reset` existe apenas porque este projeto é um laboratório local. Não copie endpoints de manipulação de estado para produção.

## Pontos para discutir em uma entrevista de QA Sênior

- Estratégia de locators
- Idempotência e isolamento
- Auth x authorization
- Session management
- Brute force e lockout
- MFA
- Segurança de mensagens de erro
- Dados de teste
- Test pyramid
- Trace e evidências
- Retry x flaky tests
- Execução paralela x sequencial
- CI/CD

## Nota sobre janela maximizada

O projeto usa `viewport: null` junto com `--start-maximized` para aproveitar a janela real do Chromium. Por isso, o projeto **não** herda `devices['Desktop Chrome']`: esse preset inclui `deviceScaleFactor`, opção incompatível com `viewport: null` no contexto do navegador.
