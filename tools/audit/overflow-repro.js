const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const page = await b.newPage({ viewport:{width:1440,height:1000}, reducedMotion:'reduce' });
  await page.goto(process.env.BASE_URL, {waitUntil:'load'});
  await page.waitForTimeout(1500);
  // mimic the earlier browser-test steps
  await page.evaluate(() => showPage('search'));
  await page.waitForTimeout(400);
  await page.evaluate(() => { AppState.compareList = ['SKF-6205','FAG-6205']; AppState.wishlist=['SKF-6205']; addToCart('SKF-6205'); });
  await page.waitForTimeout(300);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ['product','cart','compare','wishlist','checkout','account']) {
      await page.evaluate(n => {
        if (n==='product') showProductDetail('SKF-6205');
        else if (n==='cart') showCart();
        else if (n==='compare') showCompare();
        else if (n==='wishlist') showWishlist();
        else if (n==='checkout') renderCheckout();
        else showAccount();
      }, name);
      await page.waitForSelector(`#page-${name}:not(.hidden)`);
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const sw = document.documentElement.scrollWidth;
        if (sw <= vw + 1) return null;
        const bad = [];
        document.querySelectorAll('body *').forEach(el => {
          const b = el.getBoundingClientRect();
          if (b.width < 1) return;
          if (b.right > vw + 1) {
            // only leaf-ish / direct offenders not already flagged by a parent
            bad.push({ tag: el.tagName, id: el.id||null, cls: String(el.className).slice(0,80),
              right: Math.round(b.right), w: Math.round(b.width), sw: el.scrollWidth, cw: el.clientWidth,
              text: (el.innerText||'').trim().slice(0,40).replace(/\s+/g,' ') });
          }
        });
        return { vw, sw, bad: bad.slice(0,10) };
      });
      if (r) {
        console.log(`\n!! OVERFLOW ${name} @ ${width}px  doc=${r.sw} vw=${r.vw}  (+${r.sw-r.vw})`);
        r.bad.forEach(o => console.log(`   <${o.tag}${o.id?' #'+o.id:''} class="${o.cls}"> right=${o.right} w=${o.w} scrollW=${o.sw} clientW=${o.cw} "${o.text}"`));
      } else console.log(`ok ${name} @ ${width}`);
    }
  }
  await b.close();
})();
