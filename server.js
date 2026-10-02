import express from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MS = 2 * 60 * 1000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'public')));

const seedUsers = () => ({
  'qa.user@test.local': {
    email: 'qa.user@test.local', password: 'Qa@123456', name: 'QA User', role: 'user', status: 'active', mfa: false, passwordExpired: false, attempts: 0, lockedUntil: null
  },
  'qa.admin@test.local': {
    email: 'qa.admin@test.local', password: 'Admin@123456', name: 'QA Admin', role: 'admin', status: 'active', mfa: false, passwordExpired: false, attempts: 0, lockedUntil: null
  },
  'qa.blocked@test.local': {
    email: 'qa.blocked@test.local', password: 'Blocked@123456', name: 'Blocked User', role: 'user', status: 'blocked', mfa: false, passwordExpired: false, attempts: 0, lockedUntil: null
  },
  'qa.expired@test.local': {
    email: 'qa.expired@test.local', password: 'Expired@123456', name: 'Expired Password', role: 'user', status: 'active', mfa: false, passwordExpired: true, attempts: 0, lockedUntil: null
  },
  'qa.mfa@test.local': {
    email: 'qa.mfa@test.local', password: 'Mfa@123456', name: 'MFA User', role: 'user', status: 'active', mfa: true, passwordExpired: false, attempts: 0, lockedUntil: null
  },
  'qa.inactive@test.local': {
    email: 'qa.inactive@test.local', password: 'Inactive@123456', name: 'Inactive User', role: 'user', status: 'inactive', mfa: false, passwordExpired: false, attempts: 0, lockedUntil: null
  }
});

let users = seedUsers();
let sessions = new Map();
let mfaChallenges = new Map();
let resetTokens = new Map();

function resetState() {
  users = seedUsers();
  sessions = new Map();
  mfaChallenges = new Map();
  resetTokens = new Map();
}

function newId() {
  return crypto.randomBytes(24).toString('hex');
}

function createSession(email) {
  const sid = newId();
  sessions.set(sid, { email, expiresAt: Date.now() + SESSION_TTL_MS });
  return sid;
}

function getSession(req) {
  const sid = req.cookies.sid;
  if (!sid) return null;
  const session = sessions.get(sid);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(sid);
    return null;
  }
  const user = users[session.email];
  if (!user) return null;
  return { sid, session, user };
}

function requireAuth(req, res, next) {
  const auth = getSession(req);
  if (!auth) return res.redirect('/login?reason=auth');
  req.auth = auth;
  next();
}

function requireAdmin(req, res, next) {
  const auth = getSession(req);
  if (!auth) return res.redirect('/login?reason=auth');
  if (auth.user.role !== 'admin') return res.status(403).send(layout('Acesso negado', unauthorizedPage()));
  req.auth = auth;
  next();
}

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}

function layout(title, body) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} | Kuromi QA Club</title>
  <link rel="stylesheet" href="/static/styles.css" />
</head>
<body>${body}</body>
</html>`;
}

function shell(user, active, content) {
  const adminLink = user.role === 'admin' ? '<a href="/admin" class="nav-link">Admin</a>' : '';
  return `<div class="app-shell">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">K</span><span>Kuromi QA</span></div>
      <nav>
        <a href="/dashboard" class="nav-link ${active === 'dashboard' ? 'active' : ''}">Dashboard</a>
        <a href="/profile" class="nav-link ${active === 'profile' ? 'active' : ''}">Perfil</a>
        <a href="/settings" class="nav-link ${active === 'settings' ? 'active' : ''}">Configurações</a>
        ${adminLink}
      </nav>
      <div class="sidebar-footer">
        <div class="avatar">${esc(user.name.slice(0, 1))}</div>
        <div><strong>${esc(user.name)}</strong><small>${esc(user.role)}</small></div>
        <form action="/logout" method="post"><button class="link-button" type="submit">Sair</button></form>
      </div>
    </aside>
    <main class="main">${content}</main>
  </div>`;
}

function loginPage({ error = '', info = '', email = '' } = {}) {
  return `<div class="auth-layout">
    <section class="auth-hero">
      <div class="hero-grid"></div>
      <div class="hero-copy">
        <span class="eyebrow">KUROMI QA CLUB • PLAYWRIGHT</span>
        <h1>Teste com atitude.<br><em>Quebre com estilo.</em></h1>
        <p>Desenvolvido por Andressa Brito</p>
        <div class="hero-stats"><span><b>6</b> personas</span><span><b>20+</b> checks</span><span><b>100%</b> drama controlado</span></div>
      </div>
    </section>
    <section class="auth-panel">
      <div class="auth-card">
        <span class="pill">Kuromi testing room</span>
        <h2>Entrar</h2>
        <p class="muted">Escolha uma persona de QA e entre no clube.</p>
        ${info ? `<div class="alert success" role="status">${esc(info)}</div>` : ''}
        ${error ? `<div class="alert error" role="alert">${esc(error)}</div>` : ''}
        <form method="post" action="/login" novalidate>
          <label for="email">E-mail</label>
          <input id="email" name="email" type="email" value="${esc(email)}" autocomplete="username" />
          <label for="password">Senha</label>
          <input id="password" name="password" type="password" autocomplete="current-password" />
          <label class="checkbox"><input type="checkbox" name="remember" /> <span>Lembrar de mim</span></label>
          <button class="primary" type="submit">Entrar</button>
        </form>
        <a class="forgot" href="/forgot-password">Esqueci minha senha</a>
        <details class="credentials"><summary>Ver credenciais do laboratório</summary>
          <code>qa.user@test.local / Qa@123456</code>
          <code>qa.admin@test.local / Admin@123456</code>
          <code>qa.blocked@test.local / Blocked@123456</code>
          <code>qa.expired@test.local / Expired@123456</code>
          <code>qa.mfa@test.local / Mfa@123456</code>
        </details>
      </div>
    </section>
  </div>`;
}

function dashboardPage(user) {
  return shell(user, 'dashboard', `<header class="topbar"><div><span class="eyebrow">KUROMI CONTROL ROOM</span><h1>Dashboard</h1></div><span class="status-dot">Ambiente saudável</span></header>
  <section class="welcome-card"><div><span class="pill">Sessão autenticada</span><h2>Bem-vindo, ${esc(user.name)}.</h2><p>Você atravessou a autenticação. Agora começa a parte divertida do laboratório.</p></div><div class="orb">✓</div></section>
  <section class="metric-grid">
    <article class="metric"><span>Perfil</span><b>${esc(user.role)}</b><small>controle de autorização</small></article>
    <article class="metric"><span>Status</span><b>${esc(user.status)}</b><small>estado da conta</small></article>
    <article class="metric"><span>MFA</span><b>${user.mfa ? 'ativo' : 'inativo'}</b><small>segundo fator</small></article>
  </section>
  <section class="panel"><h3>Checklist do caos controlado</h3><div class="scenario-list"><span>Login válido</span><span>Login inválido</span><span>Rotas protegidas</span><span>Admin</span><span>Logout</span><span>MFA</span><span>Lockout</span><span>Reset de senha</span></div></section>`);
}

function unauthorizedPage() {
  return `<div class="center-page"><div class="error-code">403</div><h1>Acesso não autorizado</h1><p>Seu perfil não possui permissão para esta área.</p><a class="primary inline" href="/dashboard">Voltar ao dashboard</a></div>`;
}

app.get('/health', (_, res) => res.json({ ok: true }));

app.get('/', (req, res) => {
  if (getSession(req)) return res.redirect('/dashboard');
  return res.redirect('/login');
});

app.get('/login', (req, res) => {
  if (getSession(req)) return res.redirect('/dashboard');
  const info = req.query.reason === 'auth' ? 'Faça login para continuar.' : '';
  res.send(layout('Login', loginPage({ info })));
});

app.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).send(layout('Login', loginPage({ error: 'Preencha e-mail e senha.', email })));
  }

  const user = users[email];
  const now = Date.now();

  if (!user) {
    return res.status(401).send(layout('Login', loginPage({ error: 'E-mail ou senha inválidos.', email })));
  }

  if (user.status === 'blocked') {
    return res.status(403).send(layout('Login', loginPage({ error: 'Conta bloqueada. Entre em contato com o suporte.', email })));
  }
  if (user.status === 'inactive') {
    return res.status(403).send(layout('Login', loginPage({ error: 'Conta inativa.', email })));
  }
  if (user.lockedUntil && user.lockedUntil > now) {
    return res.status(429).send(layout('Login', loginPage({ error: 'Conta temporariamente bloqueada por excesso de tentativas.', email })));
  }
  if (user.lockedUntil && user.lockedUntil <= now) {
    user.lockedUntil = null;
    user.attempts = 0;
  }

  if (password !== user.password) {
    user.attempts += 1;
    if (user.attempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = Date.now() + LOCK_MS;
      return res.status(429).send(layout('Login', loginPage({ error: 'Conta temporariamente bloqueada por excesso de tentativas.', email })));
    }
    return res.status(401).send(layout('Login', loginPage({ error: 'E-mail ou senha inválidos.', email })));
  }

  user.attempts = 0;

  if (user.passwordExpired) {
    const token = newId();
    resetTokens.set(token, { email, type: 'expired', expiresAt: Date.now() + 10 * 60 * 1000 });
    return res.redirect(`/change-password?token=${token}`);
  }

  if (user.mfa) {
    const challenge = newId();
    mfaChallenges.set(challenge, { email, expiresAt: Date.now() + 5 * 60 * 1000 });
    res.cookie('mfa_challenge', challenge, { httpOnly: true, sameSite: 'lax' });
    return res.redirect('/mfa');
  }

  const sid = createSession(email);
  res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax' });
  res.redirect('/dashboard');
});

app.get('/mfa', (req, res) => {
  const challenge = mfaChallenges.get(req.cookies.mfa_challenge);
  if (!challenge || challenge.expiresAt <= Date.now()) return res.redirect('/login');
  res.send(layout('MFA', `<div class="center-page narrow"><span class="pill">Segundo fator</span><h1>Confirme sua identidade</h1><p>Para este laboratório, o código fixo de QA é <code>123456</code>.</p>
    <form method="post" action="/mfa" class="stack-form"><label for="code">Código de verificação</label><input id="code" name="code" inputmode="numeric" /><button class="primary" type="submit">Validar código</button></form></div>`));
});

app.post('/mfa', (req, res) => {
  const challengeId = req.cookies.mfa_challenge;
  const challenge = mfaChallenges.get(challengeId);
  if (!challenge || challenge.expiresAt <= Date.now()) return res.redirect('/login');
  if (String(req.body.code || '') !== '123456') {
    return res.status(401).send(layout('MFA', `<div class="center-page narrow"><div class="alert error" role="alert">Código de verificação inválido.</div><a class="primary inline" href="/mfa">Tentar novamente</a></div>`));
  }
  mfaChallenges.delete(challengeId);
  res.clearCookie('mfa_challenge');
  const sid = createSession(challenge.email);
  res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax' });
  res.redirect('/dashboard');
});

app.get('/dashboard', requireAuth, (req, res) => res.send(layout('Dashboard', dashboardPage(req.auth.user))));
app.get('/profile', requireAuth, (req, res) => res.send(layout('Perfil', shell(req.auth.user, 'profile', `<header class="topbar"><div><span class="eyebrow">CONTA</span><h1>Perfil</h1></div></header><section class="panel"><h3>${esc(req.auth.user.name)}</h3><p>${esc(req.auth.user.email)}</p><p>Perfil: <b>${esc(req.auth.user.role)}</b></p></section>`))));
app.get('/settings', requireAuth, (req, res) => res.send(layout('Configurações', shell(req.auth.user, 'settings', `<header class="topbar"><div><span class="eyebrow">PREFERÊNCIAS</span><h1>Configurações</h1></div></header><section class="panel"><h3>Preferências do laboratório</h3><label class="checkbox"><input type="checkbox" checked /> <span>Registrar evidências de falha</span></label></section>`))));
app.get('/admin', requireAdmin, (req, res) => res.send(layout('Admin', shell(req.auth.user, 'admin', `<header class="topbar"><div><span class="eyebrow">KUROMI SECRET ROOM</span><h1>Admin</h1></div></header><section class="welcome-card"><div><span class="pill">role: admin</span><h2>Painel administrativo</h2><p>Área reservada para quem tem a credencial certa. Sem passe, sem festa.</p></div><div class="orb">A</div></section>`))));

app.post('/logout', (req, res) => {
  if (req.cookies.sid) sessions.delete(req.cookies.sid);
  res.clearCookie('sid');
  res.redirect('/login?logout=1');
});

app.get('/forgot-password', (_, res) => res.send(layout('Recuperar senha', `<div class="center-page narrow"><span class="pill">Recuperação</span><h1>Esqueci minha senha</h1><p>Informe um e-mail do laboratório.</p><form method="post" action="/forgot-password" class="stack-form"><label for="email">E-mail</label><input id="email" name="email" type="email" /><button class="primary" type="submit">Gerar link de recuperação</button></form></div>`)));

app.post('/forgot-password', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  // Resposta genérica, mesmo quando usuário não existe.
  if (!users[email]) {
    return res.send(layout('Recuperar senha', `<div class="center-page narrow"><div class="alert success" role="status">Se o e-mail existir, enviaremos instruções de recuperação.</div><a href="/login">Voltar</a></div>`));
  }
  const token = newId();
  resetTokens.set(token, { email, type: 'forgot', expiresAt: Date.now() + 10 * 60 * 1000 });
  res.send(layout('Recuperar senha', `<div class="center-page narrow"><div class="alert success" role="status">Se o e-mail existir, enviaremos instruções de recuperação.</div><p class="muted">Modo QA: o link abaixo substitui o envio de e-mail.</p><a data-testid="qa-reset-link" class="primary inline" href="/reset-password?token=${token}">Abrir link de recuperação</a></div>`));
});

function passwordForm(action, token, heading) {
  return `<div class="center-page narrow"><span class="pill">Senha</span><h1>${esc(heading)}</h1><form method="post" action="${action}" class="stack-form"><input type="hidden" name="token" value="${esc(token)}" /><label for="password">Nova senha</label><input id="password" name="password" type="password" /><label for="confirm">Confirmar senha</label><input id="confirm" name="confirm" type="password" /><button class="primary" type="submit">Salvar nova senha</button></form></div>`;
}

app.get('/reset-password', (req, res) => {
  const token = String(req.query.token || '');
  const item = resetTokens.get(token);
  if (!item || item.expiresAt <= Date.now()) return res.status(400).send(layout('Link inválido', `<div class="center-page"><h1>Link inválido ou expirado</h1><a href="/forgot-password">Gerar outro link</a></div>`));
  res.send(layout('Nova senha', passwordForm('/reset-password', token, 'Crie uma nova senha')));
});

app.post('/reset-password', (req, res) => {
  const token = String(req.body.token || '');
  const item = resetTokens.get(token);
  if (!item || item.expiresAt <= Date.now()) return res.status(400).send(layout('Link inválido', `<div class="center-page"><h1>Link inválido ou expirado</h1></div>`));
  const password = String(req.body.password || '');
  const confirm = String(req.body.confirm || '');
  if (password.length < 8 || password !== confirm) return res.status(400).send(layout('Nova senha', `<div class="center-page narrow"><div class="alert error" role="alert">As senhas devem ser iguais e ter ao menos 8 caracteres.</div>${passwordForm('/reset-password', token, 'Crie uma nova senha')}</div>`));
  users[item.email].password = password;
  users[item.email].passwordExpired = false;
  resetTokens.delete(token);
  res.send(layout('Senha alterada', `<div class="center-page narrow"><div class="alert success" role="status">Senha alterada com sucesso.</div><a class="primary inline" href="/login">Entrar com nova senha</a></div>`));
});

app.get('/change-password', (req, res) => {
  const token = String(req.query.token || '');
  const item = resetTokens.get(token);
  if (!item || item.type !== 'expired' || item.expiresAt <= Date.now()) return res.redirect('/login');
  res.send(layout('Senha expirada', passwordForm('/change-password', token, 'Sua senha expirou')));
});

app.post('/change-password', (req, res) => {
  const token = String(req.body.token || '');
  const item = resetTokens.get(token);
  if (!item || item.type !== 'expired' || item.expiresAt <= Date.now()) return res.redirect('/login');
  const password = String(req.body.password || '');
  const confirm = String(req.body.confirm || '');
  if (password.length < 8 || password !== confirm) return res.status(400).send(layout('Senha expirada', passwordForm('/change-password', token, 'Sua senha expirou')));
  users[item.email].password = password;
  users[item.email].passwordExpired = false;
  resetTokens.delete(token);
  const sid = createSession(item.email);
  res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax' });
  res.redirect('/dashboard');
});

// Endpoints exclusivos do laboratório de testes.
app.post('/test/reset', (_, res) => {
  resetState();
  res.json({ ok: true });
});

app.post('/test/expire-session', (req, res) => {
  const sid = req.cookies.sid;
  const session = sid ? sessions.get(sid) : null;
  if (!session) return res.status(404).json({ ok: false });
  session.expiresAt = Date.now() - 1;
  res.json({ ok: true });
});

app.use((_, res) => res.status(404).send(layout('404', `<div class="center-page"><div class="error-code">404</div><h1>Página não encontrada</h1><a href="/">Voltar</a></div>`)));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`QA Playwright Lab em http://127.0.0.1:${PORT}`);
});
