const { test, expect } = require('@playwright/test');

test.describe('Suno Prompt Maker (E2E)', () => {
  test('トップページが読み込み、主要ボタンが表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Suno Prompt Maker/);
    await expect(page.locator('#btn-generate')).toBeVisible();
    await expect(page.locator('#btn-generate-ai-weighted')).toBeVisible();
    await expect(page.locator('#extra')).toBeVisible();
  });

  test('Aboutタブを開ける', async ({ page }) => {
    await page.goto('/');
    await page.locator('button.tab[data-tab="about"]').click();
    await expect(page.locator('#tab-about')).toHaveClass(/active/);
    await expect(page.locator('#tab-about')).toBeVisible();
  });

  test('AIオーバーレイが完了する（WASMまたはフォールバック）', async ({ page }) => {
    await page.goto('/');
    const loading = page.locator('#ai-loading');
    await expect(loading).toBeHidden({ timeout: 90_000 });
  });
});
