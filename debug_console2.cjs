const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`[Browser Error]: ${error.message}`));
  
  console.log("Navigating to http://localhost:5173...");
  await page.goto('http://localhost:5173');
  
  console.log("Waiting 3 seconds for app to initialize...");
  await page.waitForTimeout(3000);
  
  console.log("Submitting chat message...");
  await page.fill('input[placeholder="Ask Time Machine..."]', 'Hello');
  await page.click('button[type="submit"]');
  
  console.log("Waiting up to 15 seconds for response...");
  
  try {
    await page.waitForSelector('.markdown-content', { timeout: 15000 });
    console.log("SUCCESS: Received a response from the AI.");
  } catch (e) {
    const isThinking = await page.isVisible('text=Thinking...');
    console.log(`FAILURE: No response received. isThinking: ${isThinking}`);
  }
  
  await browser.close();
})();
