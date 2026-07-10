const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // コンソールログを収集
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => logs.push(`[ERROR] ${err.message}`));
  
  // サイトにアクセス
  await page.goto('https://debugprint.com/suno-prompt-maker/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // プロンプト生成ボタンをクリック
  console.log('=== プロンプト生成テスト ===');
  await page.click('#btn-generate');
  await page.waitForTimeout(1000);
  
  // 出力エリアの内容を確認
  const output = await page.textContent('#prompt-output');
  console.log('生成されたプロンプト:', output.substring(0, 100) + '...');
  
  // コンソールログを表示
  console.log('\n=== Console Logs ===');
  logs.forEach(log => console.log(log));
  
  await browser.close();
})();
