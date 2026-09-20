# assets/vendor — کتابخانه‌های شخص ثالث (لوکال)

این پوشه نسخهٔ لوکالِ وابستگی‌های خارجی سایت است تا **سایت بدون اینترنت و بدون CDN هم کامل بالا بیاید**
(در ایران دسترسی به `cdnjs.cloudflare.com`، `cdn.jsdelivr.net` و `fonts.googleapis.com` اغلب کند یا مسدود است).

| مسیر | کتابخانه | نسخه | نسخهٔ CDN قبلی | لایسنس |
|---|---|---|---|---|
| `tailwindcss/browser.js` | `@tailwindcss/browser` (Tailwind v4 JIT در مرورگر) | 4.3.3 | `cdn.jsdelivr.net/npm/@tailwindcss/browser@4` | MIT |
| `three/three.min.js` | Three.js | 0.128.0 (= r128) | `cdnjs …/three.js/r128/three.min.js` | MIT |
| `fontawesome/css/all.min.css` + `webfonts/*.woff2` | Font Awesome Free | 6.4.0 | `cdnjs …/font-awesome/6.4.0/css/all.min.css` | CC BY 4.0 (icons) / MIT (code) |
| `fonts/vazirmatn.css` + `fonts/vazirmatn/*.woff2` | Vazirmatn Variable (فونت اصلی فارسی) | از `@fontsource-variable/vazirmatn` | `fonts.googleapis.com` Vazirmatn 300–800 | OFL-1.1 |
| `fonts/inter.css` + `fonts/inter/*.woff2` | Inter Variable (فونت انگلیسی) | از `@fontsource-variable/inter` | `fonts.googleapis.com` Inter 300–800 | OFL-1.1 |

## نکته‌های فنی

- نام خانوادهٔ فونت‌ها عمداً روی `Vazirmatn` و `Inter` نگه داشته شده تا استایل‌های سایت
  (`font-family: 'Vazirmatn', 'Inter', …`) بدون تغییر کار کنند.
- فقط زیرمجموعه‌های `arabic` / `latin` / `latin-ext` فونت‌ها کپی شده‌اند (چیزی حدود ۲۰۰ کیلوبایت کل).
- در `all.min.css` فقط `woff2` نگه داشته شده؛ ارجاع‌های `ttf` حذف شده‌اند تا درخواست ۴۰۴ تولید نشود.
- این فایل‌ها **دستکاری نشده‌اند**؛ فقط در فونت‌ها نام خانواده و مسیر `url()` اصلاح شده است.

## اصالت فایل‌ها (sha256، ۱۶ رقم اول)

```
a60c785630a06196  tailwindcss/browser.js
9274bbcec8d96168  three/three.min.js
b8eb6937afd97038  fontawesome/css/all.min.css
748332090c4b8e20  fontawesome/webfonts/fa-brands-400.woff2
8e7e5ea1b15f62ab  fontawesome/webfonts/fa-regular-400.woff2
7152a6933ee3d690  fontawesome/webfonts/fa-solid-900.woff2
694a17c3d9d6c05f  fontawesome/webfonts/fa-v4compatibility.woff2
e8db2e9850d5dea8  fonts/vazirmatn.css        (فونت‌سورس + تغییر نام خانواده به Vazirmatn)
84a382e46c30fb4f  fonts/vazirmatn/vazirmatn-arabic-wght-normal.woff2
21529facfd236f6b  fonts/vazirmatn/vazirmatn-latin-ext-wght-normal.woff2
d29c041cd4294af8  fonts/vazirmatn/vazirmatn-latin-wght-normal.woff2
3ff67afaa2c7dd4c  fonts/inter.css            (فونت‌سورس + تغییر نام خانواده به Inter)
34b9c504cab7a73e  fonts/inter/inter-latin-ext-wght-normal.woff2
3100e775e8616cd2  fonts/inter/inter-latin-wght-normal.woff2
```

## به‌روزرسانی نسخه‌ها

```bash
mkdir -p /tmp/vendor && cd /tmp/vendor && npm init -y
npm install three@0.128.0 @tailwindcss/browser@4.3.3 \
            @fortawesome/fontawesome-free@6.4.0 \
            @fontsource-variable/vazirmatn @fontsource-variable/inter
# سپس فایل‌های مربوطه را روی همین ساختار کپی کنید
```

> اگر بعداً خواستید به CDN برگردید، فقط ۴ خط اول `<head>` در `index.html` را با نسخهٔ CDN عوض کنید.
