# برینگ آنلاین — Bearing Online

فروشگاه/پلتفرم جستجو و تامین سریع قطعات صنعتی (SPA استاتیک، **بدون بیلد و بدون npm**).

## اجرا

فایل‌ها به‌صورت نسبی لینک شده‌اند؛ فقط یک سرور استاتیک ساده لازم است:

```bash
python3 -m http.server 8080
# سپس http://localhost:8080
```

> باز کردن مستقیم `index.html` با `file://` هم کار می‌کند، ولی چون سایت از `history.pushState`
> برای مسیریابی استفاده می‌کند، اجرای روی سرور استاتیک توصیه می‌شود.

## ساختار پوشه‌ها

```
bearing-online/
├── index.html                  ← مارک‌آپ کامل (هدر، ۱۲ صفحه، فوتر، مودال‌ها)
├── assets/
│   ├── css/                    ← استایل‌ها به ترتیب لود
│   │   ├── 01-base.css             پالت برند (:root)، بدنه، هیرو
│   │   ├── 02-bearing-3d.css       استیج بلبرینگ سه‌بعدی
│   │   ├── 03-about.css            صفحه «درباره ما»
│   │   ├── 04-motion.css           افکت‌های حرکتی (reveal، shimmer، cursor، marquee)
│   │   ├── 05-brand-carousel.css   رینگ سه‌بعدی برندها + کامپوننت‌های عمومی
│   │   ├── 06-hero-3d.css          حرکت سه‌بعدی متن هیرو
│   │   └── 07-mobile.css           ریسپانسیو موبایل
│   ├── js/                     ← اسکریپت‌ها به ترتیب لود (گلوبال مشترک، بدون ماژول)
│   │   ├── 01-state-data.js        AppState، ProductDatabase، BrandInfo، hydrateProductDatabase
│   │   ├── 02-utils.js             formatPrice، formatNumber، showNotification
│   │   ├── 03-i18n.js              فارسی / انگلیسی + دیکشنری‌های fa
│   │   ├── 04-navigation.js        showPage + مسیریابی hash
│   │   ├── 05-bearing-3d.js        مدل Three.js بلبرینگ 6205
│   │   ├── 06-search.js            جستجوی کد / ابعادی / دسته‌بندی، فیلترها، رندر نتایج
│   │   ├── 07-brand-carousel.js    موتور رینگ برندها
│   │   ├── 08-product.js           جزئیات محصول و معادل‌ها
│   │   ├── 09-cart.js              سبد خرید
│   │   ├── 10-checkout-mock.js     بک‌اند شبیه‌سازی‌شده (سفارش، RFQ، پیش‌فاکتور، پرداخت)
│   │   ├── 11-leads.js             میز تامین سریع / لیدها
│   │   ├── 12-compare.js           مقایسه و علاقه‌مندی
│   │   ├── 13-brands-page.js       صفحه برندها
│   │   ├── 14-admin.js             پنل عملیات / نقش‌ها (RBAC نمونه)
│   │   ├── 15-mobile-ui.js         منوی موبایل، فیلترها، هیرو
│   │   ├── 16-animations.js        موتور انیمیشن
│   │   └── 17-init.js              DOMContentLoaded
│   ├── img/                    ← favicon.svg + brands/ (لوگوهای لوکال برندها)
│   └── vendor/                 ← کتابخانه‌های شخص ثالث به‌صورت لوکال (README جدا دارد)
├── docs/
│   └── original-single-file.html   نسخه اصلی تک‌فایلی (بکاپ)
└── tools/
    └── smoke-test/             ← تست دودی اختیاری (jsdom) — بخشی از سایت نیست
```

## نکته‌ها

- **ترتیب لود JS مهم است**؛ فایل‌ها به هم وابسته‌اند (گلوبال). فایل جدید را قبل از `17-init.js` اضافه کنید.
- فیلدهای مشتق‌شدهٔ محصولات (کد نرمال‌شده، وضعیت موجودی، قیمت تومانی، ابعاد بسته‌بندی…) در تابع
  `hydrateProductDatabase()` و از داخل `17-init.js` ساخته می‌شوند — نه در زمان لود `01-state-data.js` —
  چون آن هلپرها (مثل `normalizePartCodeDisplay`) در فایل‌های بعدی تعریف شده‌اند.
- **هیچ CDN خارجی لازم نیست**: Tailwind v4 (browser build)، Three.js r128، Font Awesome 6.4 و فونت‌های
  Vazirmatn/Inter همه در `assets/vendor/` لوکال هستند (جزئیات و نسخه‌ها در `assets/vendor/README.md`).
- تنها منابع اینترنتی باقی‌مانده «تزئینی» هستند و در صورت نبود اینترنت، سایت خراب نمی‌شود:
  لوگوی رستری هدر/فوتر (جایگزین وکتور لوکال)، QR پیگیری در پیش‌فاکتور و لینک واتس‌اپ.
- سایت به WebGL وابسته نیست: اگر مرورگر/دستگاه WebGL نداشته باشد، استیج سه‌بعدی به
  `#bearingFallback` می‌افتد و بقیهٔ صفحه سالم می‌ماند.

## تست

```bash
cd tools/smoke-test && npm install && npm test
```

تست ساختاری (cross-reference مارک‌آپ و JS) + تست اجرایی با jsdom روی ۳۰ جریان کاربری.
جزئیات: [`tools/smoke-test/README.md`](tools/smoke-test/README.md)

## دمو

پیش‌نمایش: پوشه را روی هر هاست استاتیک (GitHub Pages، Netlify، …) بگذارید.

## تغییرات

تغییرات و باگ‌های رفع‌شده: [CHANGELOG.md](CHANGELOG.md)
