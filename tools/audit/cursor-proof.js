const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport:{width:1440,height:1000} });
  await p.goto(process.env.BASE_URL, {waitUntil:'load'});
  await p.waitForTimeout(2000);
  const r = await p.evaluate(() => ({
    bodyCursor: getComputedStyle(document.body).cursor,
    buttonCursor: getComputedStyle(document.querySelector('button')).cursor,
    linkCursor: getComputedStyle(document.querySelector('a')).cursor,
    inputCursor: getComputedStyle(document.querySelector('input')).cursor,
    strayCursorDot: !!document.getElementById('cursor-dot'),
    strayCursorRing: !!document.getElementById('cursor-ring'),
    // does any stylesheet still hide the pointer on a fine-pointer device?
    hidesPointerOnDesktop: [...document.styleSheets].some(sheet => {
      try { return [...sheet.cssRules].some(r => /cursor:\s*none/.test(r.cssText)); } catch { return false; }
    })
  }));
  console.log(JSON.stringify(r, null, 2));
  await b.close();
})();
