const { test, expect } = require('@playwright/test');

test.describe('Suno Prompt Maker (E2E)', () => {
  test('トップページが読み込み、タイトルと説明が表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Suno Prompt Maker/);
    await expect(page.locator('h1')).toContainText('Suno Prompt Maker');
    await expect(page.getByText('ローカルAI内蔵プロンプトメーカー')).toBeVisible();
  });

  test('プロンプト生成ボタンが表示される', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#btn-generate')).toBeVisible();
    await expect(page.locator('#btn-generate-ai-weighted')).toBeVisible();
    await expect(page.locator('#extra')).toBeVisible();
  });

  test('Aboutタブにキャッシュ再構築ボタンがある', async ({ page }) => {
    await page.goto('/');
    await page.locator('button.tab[data-tab="about"]').click();
    await expect(page.locator('#tab-about')).toHaveClass(/active/);
    await expect(page.locator('#btn-rebuild-tag-cache')).toBeVisible();
  });

  test('AIオーバーレイが完了する（WASMまたはフォールバック）', async ({ page }) => {
    await page.goto('/');
    const loading = page.locator('#ai-loading');
    await expect(loading).toBeHidden({ timeout: 90_000 });
  });
});
