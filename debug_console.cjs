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
  
  // Try to submit a chat message
  console.log("Submitting chat message...");
  await page.fill('input[placeholder="Ask Time Machine..."]', 'Hello');
  await page.click('button[type="submit"]');
  
  console.log("Waiting 5 seconds for response...");
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log("Done.");
})();
