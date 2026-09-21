import { test, expect, type Page } from '@playwright/test';

// ─── Credentials (matches lib/seed.ts) ────────────────────────────────────────
const USERS = {
  L1: { username: 'analyst.priya',  password: 'Analyst@123' },
  L2: { username: 'officer.sharma', password: 'Officer@123' },
  L3: { username: 'admin',          password: 'Admin@1930'  },
};

/**
 * Login helper — fills the form, submits, then waits until the
 * dashboard topbar is visible (indicates full session + layout mount).
 * The topbar has class "topbar" and is always present after a successful login.
 */
async function login(page: Page, role: 'L1' | 'L2' | 'L3') {
  await page.goto('/login');
  await page.waitForSelector('#username', { timeout: 10_000 });
  await page.fill('#username', USERS[role].username);
  await page.fill('#password', USERS[role].password);
  await page.click('button[type="submit"]');
  // Wait until the dashboard layout's topbar is visible — this is the
  // reliable signal that session + layout have fully mounted.
  await page.waitForSelector('.topbar', { state: 'visible', timeout: 30_000 });
}

// ──────────────────────────────────────────────────────────────────────────────
// LOGIN PAGE
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Login Page', () => {
  test('renders the login form correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('1930');
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('submit button is disabled when fields are empty', async ({ page }) => {
    await page.goto('/login');
    const btn = page.locator('button[type="submit"]');
    await expect(btn).toBeDisabled();
  });

  test('shows error with wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'wronguser');
    await page.fill('#password', 'wrongpass');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid username or password')).toBeVisible({ timeout: 10_000 });
  });

  test('L1 analyst can log in and reach dashboard', async ({ page }) => {
    await login(page, 'L1');
    await expect(page).toHaveURL('/dashboard');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SIDEBAR NAVIGATION
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => { await login(page, 'L1'); });

  test('sidebar shows 1930 brand logo', async ({ page }) => {
    await expect(page.locator('nav .logo-text')).toContainText('1930');
  });

  test('sidebar shows Cyber Helpline CRM subtitle', async ({ page }) => {
    await expect(page.locator('nav .logo-sub')).toContainText('Cyber Helpline CRM');
  });

  test('L1 sees Dashboard nav link', async ({ page }) => {
    await expect(page.locator('nav').getByRole('link', { name: 'Dashboard' })).toBeVisible();
  });

  test('L1 sees Track Complaint nav link', async ({ page }) => {
    await expect(page.locator('nav').getByRole('link', { name: 'Track Complaint' })).toBeVisible();
  });

  test('L1 sees New Complaint nav link', async ({ page }) => {
    await expect(page.locator('nav').getByRole('link', { name: 'New Complaint' })).toBeVisible();
  });

  test('L1 sees My Tickets nav link', async ({ page }) => {
    await expect(page.locator('nav').getByRole('link', { name: 'My Tickets' })).toBeVisible();
  });

  test('clicking New Complaint navigates to correct page', async ({ page }) => {
    await page.locator('nav').getByRole('link', { name: 'New Complaint' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/dashboard/l1/new-complaint', { timeout: 15_000 });
  });

  test('clicking My Tickets navigates to correct page', async ({ page }) => {
    await page.locator('nav').getByRole('link', { name: 'My Tickets' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/dashboard/l1/my-tickets', { timeout: 15_000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// TOPBAR
// ──────────────────────────────────────────────────────────────────────────────
test.describe('TopBar', () => {
  test.beforeEach(async ({ page }) => { await login(page, 'L1'); });

  test('TOS counter is visible', async ({ page }) => {
    await expect(page.locator('.tos-badge')).toBeVisible();
  });

  test('TOS counter shows HH:MM:SS format', async ({ page }) => {
    const text = await page.locator('.tos-badge').textContent();
    expect(text).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  test('TOS counter increments over time', async ({ page }) => {
    const before = await page.locator('.tos-badge').textContent();
    await page.waitForTimeout(2500);
    const after = await page.locator('.tos-badge').textContent();
    expect(before).not.toBe(after);
  });

  test('theme toggle button is present', async ({ page }) => {
    await expect(page.locator('button[aria-label="Toggle theme"]')).toBeVisible();
  });

  test('theme toggle switches between light and dark', async ({ page }) => {
    const html = page.locator('html');
    // Start in light mode (no dark class)
    await expect(html).not.toHaveClass(/dark/);
    await page.locator('button[aria-label="Toggle theme"]').click();
    await expect(html).toHaveClass(/dark/);
    // Toggle back
    await page.locator('button[aria-label="Toggle theme"]').click();
    await expect(html).not.toHaveClass(/dark/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// NEW COMPLAINT FORM (L1)
// ──────────────────────────────────────────────────────────────────────────────
test.describe('New Complaint Form', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'L1');
    await page.goto('/dashboard/l1/new-complaint');
    await page.waitForSelector('h1', { timeout: 10_000 });
  });

  test('page title shows New Complaint Registration', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('New Complaint Registration');
  });

  test('Golden Hour Status panel is visible', async ({ page }) => {
    // Use first() to avoid strict mode error — heading + subtitle both contain 'Golden Hour'
    await expect(page.locator('text=Golden Hour Status').first()).toBeVisible();
  });

  test('Save Draft button is visible', async ({ page }) => {
    await expect(page.locator('button:has-text("Save Draft")')).toBeVisible();
  });

  test('Next button is visible on step 1', async ({ page }) => {
    await expect(page.locator('button:has-text("Next")')).toBeVisible();
  });

  test('validation: clicking Next with empty fields shows error', async ({ page }) => {
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Name must be at least 2')).toBeVisible({ timeout: 5_000 });
  });

  test('fills victim details and advances to step 2', async ({ page }) => {
    await page.fill('input[placeholder="Enter full name"]', 'Rahul Sharma');
    await page.fill('input[placeholder="Enter 10-digit mobile number"]', '9876543210');
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Crime Classification')).toBeVisible({ timeout: 8_000 });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// TRACK COMPLAINT
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Track Complaint', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'L1');
    await page.goto('/dashboard/track-complaint');
    await page.waitForSelector('h1', { timeout: 10_000 });
  });

  test('page title is Track Complaint', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Track Complaint');
  });

  test('mobile filter input is visible', async ({ page }) => {
    await expect(page.locator('input[placeholder="Victim mobile number"]')).toBeVisible();
  });

  test('Search button is visible', async ({ page }) => {
    await expect(page.locator('button:has-text("Search")')).toBeVisible();
  });

  test('Reset button is visible', async ({ page }) => {
    await expect(page.locator('button:has-text("Reset")')).toBeVisible();
  });

  test('Search returns results or empty state', async ({ page }) => {
    await page.click('button:has-text("Search")');
    await page.waitForTimeout(2000);
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    const hasEmpty = await page.locator('text=No complaints found').isVisible().catch(() => false);
    const hasBadge = await page.locator('text=complaint').isVisible().catch(() => false);
    expect(hasTable || hasEmpty || hasBadge).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// L3 ADMIN — LIVE ROSTER
// ──────────────────────────────────────────────────────────────────────────────
test.describe('L3 Live Roster', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'L3');
    await page.goto('/dashboard/l3/roster');
    await page.waitForSelector('h1', { timeout: 10_000 });
  });

  test('roster heading is visible', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Live Floor Roster');
  });

  test('Available KPI card is present', async ({ page }) => {
    await expect(page.locator('text=Available').first()).toBeVisible();
  });

  test('On Call KPI card is present', async ({ page }) => {
    await expect(page.locator('text=On Call').first()).toBeVisible();
  });

  test('On Break KPI card is present', async ({ page }) => {
    await expect(page.locator('text=On Break').first()).toBeVisible();
  });

  test('SLA Breached KPI card is present', async ({ page }) => {
    await expect(page.locator('text=SLA Breached').first()).toBeVisible();
  });
});
