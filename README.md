# برینگ آنلاین — Bearing Online

فروشگاه/پلتفرم جستجو و تامین سریع قطعات صنعتی (SPA استاتیک، بدون بیلد).

## اجرا
فایل‌ها به‌صورت نسبی لینک شده‌اند؛ کافی است یک سرور استاتیک ساده بالا بیاورید:

```bash
python3 -m http.server 8080
# سپس http://localhost:8080
```

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
│   │   ├── 01-state-data.js        AppState، ProductDatabase، BrandInfo
│   │   ├── 02-utils.js             formatPrice، showNotification …
│   │   ├── 03-i18n.js              فارسی / انگلیسی
│   │   ├── 04-navigation.js        showPage + مسیریابی hash
│   │   ├── 05-bearing-3d.js        مدل Three.js بلبرینگ 6205
│   │   ├── 06-search.js            جستجوی کد / ابعادی / دسته‌بندی، فیلترها
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
│   └── img/                    ← favicon.svg + brands/ (لوگوهای لوکال برندها)
└── docs/
    └── original-single-file.html   نسخه اصلی تک‌فایلی (بکاپ)
```

## دمو
پیش‌نمایش: فایل `index.html` را روی هر هاست استاتیک (GitHub Pages، Netlify، …) بگذارید.

## نکته‌ها
- ترتیب لود JS مهم است؛ فایل‌ها به هم وابسته‌اند (گلوبال). فایل جدید را قبل از `17-init.js` اضافه کنید.
- وابستگی‌های خارجی (CDN): Tailwind v4 browser، Three.js r128، Font Awesome 6.4، فونت Vazirmatn/Inter.


تغییرات و باگ‌های رفع‌شده: [CHANGELOG.md](CHANGELOG.md)
