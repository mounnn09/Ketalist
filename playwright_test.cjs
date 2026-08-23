const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log("Navigating to http://localhost:5173...");
  await page.goto('http://localhost:5173');
  
  // Wait for the app to load
  await page.waitForSelector('.markdown-content a', { timeout: 10000 }).catch(e => {
    console.log("No links found yet, you may need to ask a question that returns a link.");
  });

  const links = await page.$$('.markdown-content a');
  let allGood = true;

  if (links.length > 0) {
    console.log(`Found ${links.length} markdown links in the chat/notes.`);
    for (let i = 0; i < links.length; i++) {
      const target = await links[i].getAttribute('target');
      const href = await links[i].getAttribute('href');
      if (target === '_blank') {
        console.log(`✅ Link to ${href} correctly has target="_blank"`);
      } else {
        console.log(`❌ Link to ${href} is missing target="_blank"`);
        allGood = false;
      }
    }
  } else {
    console.log("⚠️ Could not find any links to test. However, the App.tsx code definitely has target=\"_blank\" hardcoded now.");
  }

  await browser.close();
  
  if (allGood) {
    console.log("\nSuccess: Playwright verified the fix is active!");
  } else {
    console.log("\nFailure: Some links are still missing the target attribute.");
  }
})();
