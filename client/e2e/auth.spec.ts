import { createHmac, randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

const config = require('./test-config.cjs') as {
  apiOrigin: string;
  clientOrigin: string;
  jwtSecret: string;
  userEmail: string;
  userPassword: string;
};

async function login(page: import('@playwright/test').Page, next?: string) {
  const suffix = next ? `?next=${encodeURIComponent(next)}` : '';
  await page.goto(`/login${suffix}`);
  await page.locator('input[type="email"]').fill(config.userEmail);
  await page.locator('input[type="password"]').fill(config.userPassword);
  await page.locator('button[type="submit"]').click();
}

function expiredToken() {
  const userId = randomUUID();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    userId,
    ver: 0,
    iat: now - 120,
    exp: now - 60,
  })).toString('base64url');
  const signingInput = `${header}.${payload}`;
  const signature = createHmac('sha256', config.jwtSecret)
    .update(signingInput)
    .digest('base64url');
  return `${signingInput}.${signature}`;
}

test('unauthenticated users cannot view private routes or API data', async ({ page }) => {
  for (const route of [
    '/dashboard',
    '/monitors',
    '/analytics',
    '/incidents',
    '/settings',
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByText('Loading dashboard...')).toHaveCount(0);
  }

  const apiStatus = await page.evaluate(async apiOrigin => {
    const response = await fetch(`${apiOrigin}/api/dashboard`, {
      credentials: 'include',
    });
    return response.status;
  }, config.apiOrigin);
  expect(apiStatus).toBe(401);
});

test('login persists an HttpOnly session across reload and protects direct routes', async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /Dashboard|Welcome back/ })).toBeVisible();

  const cookie = (await page.context().cookies(`${config.apiOrigin}/api`))
    .find(item => item.name === 'pulsewatch_session');
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.path).toBe('/api');
  expect(cookie?.sameSite).toBe('Strict');
  expect(await page.evaluate(() => document.cookie)).not.toContain('pulsewatch_session');
  expect(await page.evaluate(() => localStorage.getItem('pulsewatch_token'))).toBeNull();

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('logout blocks protected pages and API access, including browser Back', async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('button', { name: /Phase 5 Browser Test/ }).click();

await expect(page.getByRole('menu', { name: 'Account' })).toBeVisible();

await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goBack();
  await expect(page).not.toHaveURL(/\/(dashboard|monitors|analytics|incidents|settings)/);

  const apiStatus = await page.evaluate(async apiOrigin => {
    const response = await fetch(`${apiOrigin}/api/dashboard`, {
      credentials: 'include',
    });
    return response.status;
  }, config.apiOrigin);
  expect(apiStatus).toBe(401);
});

test('expired JWT cookies are rejected and cleared', async ({ page }) => {
  await page.context().addCookies([{
    name: 'pulsewatch_session',
    value: expiredToken(),
    domain: '127.0.0.1',
    path: '/api',
    httpOnly: true,
    sameSite: 'Strict',
  }]);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=/);
  const cookie = (await page.context().cookies(`${config.apiOrigin}/api`))
    .find(item => item.name === 'pulsewatch_session');
  expect(!cookie || cookie.value === '').toBe(true);
});

test('login accepts protected internal redirects and rejects external redirects', async ({ page }) => {
  await login(page, '/monitors');
  await expect(page).toHaveURL(/\/monitors$/);

  await page.getByRole('button', { name: /Phase 5 Browser Test/ }).click();

await expect(page.getByRole('menu', { name: 'Account' })).toBeVisible();

await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, 'https://attacker.example/phish');
  await expect(page).toHaveURL(`${config.clientOrigin}/dashboard`);
  expect(new URL(page.url()).origin).toBe(config.clientOrigin);
});

test('published public status pages remain available without authentication', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('/status/e2e-public');
    await expect(page.getByRole('heading', { name: 'E2E Public Status' })).toBeVisible();
    await expect(page.getByText('No active services are associated with this page.')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('registration creates an isolated account and opens email verification', async ({ page }) => {
  const email = `browser.${randomUUID()}@example.test`;
  await page.goto('/register');
  await page.locator('input[type="text"]').fill('Browser Registration');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill('Browser-Registration-123!');
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(url =>
    url.pathname === '/verify-email' &&
    url.searchParams.get('email') === email
  );
  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});
