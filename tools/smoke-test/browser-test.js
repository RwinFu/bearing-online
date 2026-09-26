/* Optional real Chromium layout + interaction regression tests.
   Start the static site first (python3 -m http.server 8080), then npm run test:browser.
   BASE_URL and CHROMIUM_EXECUTABLE_PATH can override the defaults. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const output = path.resolve(__dirname, '../../.arena/browser-audit');
    fs.mkdirSync(output, { recursive: true });
    let checks = 0;
    async function check(name, fn) {
        await fn(); checks++;
        console.log('PASS', name);
    }
    async function navigate(name) {
        await page.evaluate(name => showPage(name), name);
        await page.waitForSelector(`#page-${name}:not(.hidden)`);
        await page.waitForTimeout(350);
    }
    try {
        await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8080', { waitUntil: 'load' });
        await page.waitForFunction(() => typeof AppState !== 'undefined' && ProductDatabase[0].stockStatus);
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
        for (const width of [320, 390, 768, 1024, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            for (const name of ['home', 'search', 'brands', 'services', 'contact', 'about']) {
                await check(`${name} has no horizontal page overflow at ${width}px`, async () => {
                    await navigate(name);
                    const sizes = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
                    assert(sizes.content <= sizes.viewport + 1, JSON.stringify(sizes));
                });
            }
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await navigate('home');
        await check('Mobile navigation opens, traps focus and closes with Escape', async () => {
            await page.locator('#mobile-menu-toggle').click();
            assert.equal(await page.locator('#mobile-menu').evaluate(el => el.inert), false);
            await page.waitForFunction(() => document.activeElement === document.querySelector('#mobile-menu button'));
            await page.keyboard.press('Shift+Tab');
            assert(await page.locator('#mobile-menu a').last().evaluate(el => el === document.activeElement));
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#mobile-menu').evaluate(el => el.inert), true);
        });
        await check('Suggestion selection works with keyboard, then browser Back restores search', async () => {
            await page.locator('#search-input').fill('۶۲۰۵');
            await page.waitForSelector('#autocomplete-dropdown:not(.hidden) [role="option"]');
            await page.locator('#search-input').press('ArrowDown');
            await page.locator('#search-input').press('Enter');
            await page.waitForSelector('#page-product:not(.hidden)');
            await page.goBack();
            await page.waitForSelector('#page-home:not(.hidden)');
            await page.locator('#search-input').fill('6205 SKF');
            await page.locator('#search-input').press('Enter');
            await page.waitForSelector('#page-search:not(.hidden)');
            assert.equal(await page.evaluate(() => AppState.searchResults.length), 2);
            await page.locator('#results-container [role="link"]').first().click();
            await page.waitForSelector('#page-product:not(.hidden)');
            await page.goBack();
            await page.waitForSelector('#page-search:not(.hidden)');
            assert.equal(await page.locator('#results-search-input').inputValue(), '6205 SKF');
        });
        await check('Mobile card actions do not overlap; filters open and close', async () => {
            const rects = await page.locator('#results-container .product-image-bg').first().locator('button').evaluateAll(buttons => buttons.map(b => {
                const r = b.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height };
            }));
            assert(rects.every(r => r.width >= 44 && r.height >= 44));
            assert(rects[0].right <= rects[1].left || rects[1].right <= rects[0].left);
            await page.locator('#mobile-filter-btn').click();
            assert(await page.locator('#filters-aside').isVisible());
            await page.locator('#mobile-filter-btn').click();
            assert(!(await page.locator('#filters-aside').isVisible()));
            await page.locator('#results-container').screenshot({ path: path.join(output, 'mobile-products.png') });
        });
        await check('Table scroll stays inside its container and survives reload', async () => {
            await page.locator('.view-mode-btn[data-mode="table"]').click();
            assert(await page.locator('#results-table-container').isVisible());
            const sizes = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, width: innerWidth,
                table: document.getElementById('results-table-container').scrollWidth,
                container: document.getElementById('results-table-container').clientWidth }));
            assert(sizes.page <= sizes.width + 1 && sizes.table > sizes.container);
            await page.reload();
            await page.waitForSelector('#page-search:not(.hidden)');
            assert(await page.locator('#results-table-container').isVisible());
            assert.equal(await page.evaluate(() => AppState.searchResults.length), 2);
        });
        await check('English layout at phone and desktop widths', async () => {
            await page.evaluate(() => toggleLanguage());
            for (const width of [320, 1440]) {
                await page.setViewportSize({ width, height: 900 });
                await navigate('home');
                assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
                await navigate('search');
                assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            }
            await page.evaluate(() => toggleLanguage());
        });
        await check('Product, populated cart, compare, wishlist, checkout and orders fit phone and desktop', async () => {
            await page.evaluate(() => {
                AppState.compareList = ['SKF-6205', 'FAG-6205'];
                AppState.wishlist = ['SKF-6205'];
                addToCart('SKF-6205');
            });
            for (const width of [320, 1440]) {
                await page.setViewportSize({ width, height: 900 });
                for (const name of ['product', 'cart', 'compare', 'wishlist', 'checkout', 'account']) {
                    await page.evaluate(name => {
                        if (name === 'product') showProductDetail('SKF-6205');
                        else if (name === 'cart') showCart();
                        else if (name === 'compare') showCompare();
                        else if (name === 'wishlist') showWishlist();
                        else if (name === 'checkout') renderCheckout();
                        else showAccount();
                    }, name);
                    await page.waitForSelector(`#page-${name}:not(.hidden)`);
                    await page.waitForTimeout(350);
                    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} overflow at ${width}`);
                }
            }
        });
        // Headless CI images and sandboxes often ship no GPU and no software
        // rasteriser, so `getContext('webgl')` returns null there. That is a
        // property of the machine, not of the site — the no-WebGL path is
        // covered by the jsdom suite. Detect it and skip the WebGL checks
        // instead of reporting a site failure that cannot happen on real hardware.
        const webglAvailable = await page.evaluate(() => {
            try {
                const c = document.createElement('canvas');
                return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
            } catch (e) { return false; }
        });
        const skipWebgl = name => console.log(`SKIP ${name} (no WebGL in this environment)`);

        if (!webglAvailable) {
            skipWebgl('WebGL viewer renders, all presets work and reduced motion starts paused');
            skipWebgl('Mobile 3D controls and canvas are within the viewport; hidden viewer stops rendering');
        } else {
        await check('WebGL viewer renders, all presets work and reduced motion starts paused', async () => {
            await navigate('about');
            await page.locator('#bearingStage').scrollIntoViewIfNeeded();
            await page.waitForFunction(() => Bearing3D.inited || Bearing3D.failed);
            assert(await page.evaluate(() => Bearing3D.inited && !Bearing3D.failed), 'Real WebGL renderer failed');
            assert(await page.evaluate(() => Bearing3D.paused));
            await page.locator('[data-bearing-view="assembled"]').click();
            assert(await page.evaluate(() => Bearing3D.seals.every(seal => seal.visible)));
            await page.locator('[data-bearing-view="exploded"]').click();
            await page.waitForFunction(() => Bearing3D.explode > 0.95);
            assert.equal(await page.locator('#bearingExplodeValue').textContent(), '100%');
            await page.locator('#bearingStage').screenshot({ path: path.join(output, 'desktop-exploded.png') });
            await page.locator('[data-bearing-view="open"]').click();
            assert(await page.evaluate(() => Bearing3D.seals.every(seal => !seal.visible)));
            const before = await page.evaluate(() => Bearing3D.targetRY);
            await page.locator('#bearingViewport').focus();
            await page.keyboard.press('ArrowRight');
            assert(await page.evaluate(before => Bearing3D.targetRY > before, before));
            await page.locator('#bearingZoomIn').click();
            assert(await page.evaluate(() => Bearing3D.zoomTarget < 10));
            await page.locator('#bearingResetBtn').click();
            assert.equal(await page.evaluate(() => Bearing3D.zoomTarget), 10);
        });
        await check('Mobile 3D controls and canvas are within the viewport; hidden viewer stops rendering', async () => {
            await page.setViewportSize({ width: 390, height: 844 });
            await page.locator('#bearingStage').scrollIntoViewIfNeeded();
            await page.waitForTimeout(800);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            const box = await page.locator('#bearingViewport').boundingBox();
            assert(box.width <= 390 && box.height >= 300);
            await page.locator('#bearingStage').screenshot({ path: path.join(output, 'mobile-viewer.png') });
            await navigate('home');
            assert.equal(await page.evaluate(() => Bearing3D.raf), 0);
        });
        }
        // Runs with or without WebGL: the fallback must never leave the page
        // scrolled sideways, and the viewer must stop rendering when hidden.
        await check('3D stage never causes horizontal page overflow', async () => {
            await page.setViewportSize({ width: 390, height: 844 });
            await navigate('about');
            await page.waitForTimeout(900);
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
            await navigate('home');
            assert.equal(await page.evaluate(() => Bearing3D.raf), 0);
        });
        await check('No uncaught browser errors', async () => assert.deepEqual(errors, []));
        console.log(`\n${checks} browser checks passed. Screenshots: .arena/browser-audit/`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
