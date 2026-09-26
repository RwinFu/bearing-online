const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  for (const mode of ['no-preference','reduce']) {
    const p = await b.newPage({ viewport:{width:1440,height:1000}, reducedMotion: mode });
    await p.goto(process.env.BASE_URL, {waitUntil:'load'});
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => {
      const anims = document.getAnimations();
      const inf = anims.filter(a => a.effect && a.effect.getTiming().iterations === Infinity);
      const names = {};
      inf.forEach(a => { const n = (a.animationName || (a.effect && a.effect.target && a.effect.target.className) || 'css').toString().slice(0,40); names[n] = (names[n]||0)+1; });
      return { total: anims.length, infinite: inf.length, names,
        wordmarksRunning: window.VectorWordmarks ? window.VectorWordmarks.running : null,
        pageLayerRunning: window.VectorPageLayer ? window.VectorPageLayer.running : null };
    });
    console.log(mode, JSON.stringify(r, null, 1));
    await p.close();
  }
  await b.close();
})();
