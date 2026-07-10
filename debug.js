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
  
  // 少し待つ
  await page.waitForTimeout(2000);
  
  // コンソールログを表示
  console.log('=== Console Logs ===');
  logs.forEach(log => console.log(log));
  
  // ページタイトルを確認
  const title = await page.title();
  console.log('\n=== Page Title ===');
  console.log(title);
  
  //要素の存在確認
  const elements = await page.evaluate(() => {
    return {
      generateBtn: !!document.getElementById('btn-generate'),
      weightPanel: !!document.getElementById('weight-panel'),
      extra: !!document.getElementById('extra'),
      outputArea: !!document.getElementById('output-area'),
    };
  });
  console.log('\n=== Elements ===');
  console.log(elements);
  
  await browser.close();
})();
