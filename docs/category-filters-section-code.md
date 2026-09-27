# کد بخش «دسته‌بندی و فیلترها» — نسخه نهایی

> این فایل، کد کامل بخش دسته‌بندی و فیلترها پس از رفع باگ‌ها و کاربرپسندسازی است
> (مرجع: همین ریپو — `index.html`، `assets/js/06-search.js`، `assets/js/15-mobile-ui.js`،
> `assets/js/03-i18n.js`، `assets/js/02-utils.js`، `assets/css/05-brand-carousel.css`، `assets/css/07-mobile.css`).

---

## ۱) `index.html` — تب «دسته‌بندی» در جستجوی هیرو

```html
                            <div id="search-type" class="search-panel hidden">
                                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <button onclick="searchByType('industrial-bearing')" class="magnetic p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-center group" type="button">
                                        <i class="fas fa-circle-notch text-3xl text-gray-400 group-hover:text-blue-500 mb-3"></i>
                                        <span class="block font-medium text-gray-700" data-en="Industrial bearings" data-fa="برینگ‌های صنعتی">برینگ‌های صنعتی</span>
                                        <span class="search-category-count" data-category-count="industrial-bearing"></span>
                                    </button>
                                    <button onclick="searchByType('grease')" class="magnetic p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-center group" type="button">
                                        <i class="fas fa-droplet text-3xl text-gray-400 group-hover:text-blue-500 mb-3"></i>
                                        <span class="block font-medium text-gray-700" data-en="Grease" data-fa="گریس">گریس</span>
                                        <span class="search-category-count" data-category-count="grease"></span>
                                    </button>
                                    <button onclick="searchByType('automotive-bearing')" class="magnetic p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-center group" type="button">
                                        <i class="fas fa-car-side text-3xl text-gray-400 group-hover:text-blue-500 mb-3"></i>
                                        <span class="block font-medium text-gray-700" data-en="Automotive bearings" data-fa="برینگ‌های خودرویی">برینگ‌های خودرویی</span>
                                        <span class="search-category-count" data-category-count="automotive-bearing"></span>
                                    </button>
                                    <button onclick="searchByType('housing-bushing')" class="magnetic p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-center group" type="button">
                                        <i class="fas fa-ring text-3xl text-gray-400 group-hover:text-blue-500 mb-3"></i>
                                        <span class="block font-medium text-gray-700" data-en="Housings & bushings" data-fa="یاتاقان و بوش">یاتاقان و بوش</span>
                                        <span class="search-category-count" data-category-count="housing-bushing"></span>
                                    </button>
                                </div>
                            </div>
```

---

## ۲) `index.html` — کارت‌های «دسته‌بندی محصولات» صفحه اصلی (لینک واقعی + نشان شمارش)

```html
            <!-- Featured Categories -->
            <div class="py-20 bg-white">
                <div class="max-w-7xl mx-auto px-4">
                    <h3 class="text-3xl font-bold text-center text-gray-800 mb-4" data-vector-page data-en="Product Categories" data-fa="دسته‌بندی محصولات">دسته‌بندی محصولات</h3>
                    <div class="heading-line mx-auto mb-4"></div>
                    <p class="text-center text-gray-500 mb-12 max-w-2xl mx-auto" data-vector-page data-en="Browse our comprehensive catalog of industrial mechanical parts" data-fa="مرور کاتالوگ جامع قطعات مکانیکی صنعتی ما">مرور کاتالوگ جامع قطعات مکانیکی صنعتی ما</p>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 stagger reveal">
                        <!-- Industrial Bearings -->
                        <a href="#/search?category=industrial-bearing" class="card-hover tilt-card bg-gray-50 rounded-2xl p-8 text-center cursor-pointer block no-underline">
                            <img src="assets/img/products/skf-6205.jpg" alt="SKF 6205" class="w-full h-36 object-cover rounded-xl shadow-lg mb-6" loading="lazy">
                            <h4 data-vector-page class="text-xl font-bold text-gray-800 mb-2" data-en="Industrial Bearings" data-fa="برینگ‌های صنعتی">برینگ‌های صنعتی</h4>
                            <p class="text-gray-500 text-sm" data-en="Ball, roller, spherical" data-fa="بلبرینگ، رولبرینگ، بشکه‌ای">بلبرینگ، رولبرینگ، بشکه‌ای</p>
                            <span class="category-count-badge" data-category-count="industrial-bearing"></span>
                        </a>

                        <!-- Grease -->
                        <a href="#/search?category=grease" class="card-hover tilt-card bg-gray-50 rounded-2xl p-8 text-center cursor-pointer block no-underline">
                            <img src="assets/img/products/skf-lgmt3-04.jpg" alt="SKF LGMT 3" class="w-full h-36 object-cover object-center rounded-xl shadow-lg mb-6" loading="lazy">
                            <h4 data-vector-page class="text-xl font-bold text-gray-800 mb-2" data-en="Grease" data-fa="گریس">گریس</h4>
                            <p class="text-gray-500 text-sm" data-en="Industrial bearing lubrication" data-fa="روانکاری برینگ صنعتی">روانکاری برینگ صنعتی</p>
                            <span class="category-count-badge" data-category-count="grease"></span>
                        </a>

                        <!-- Automotive Bearings -->
                        <a href="#/search?category=automotive-bearing" class="card-hover tilt-card bg-gray-50 rounded-2xl p-8 text-center cursor-pointer block no-underline">
                            <div class="w-full h-36 mx-auto mb-6 rounded-xl flex items-center justify-center shadow-lg" style="background:linear-gradient(135deg,#0a2358,#1348c8);">
                                <i class="fas fa-car-side text-4xl text-white"></i>
                            </div>
                            <h4 data-vector-page class="text-xl font-bold text-gray-800 mb-2" data-en="Automotive Bearings" data-fa="برینگ‌های خودرویی">برینگ‌های خودرویی</h4>
                            <p class="text-gray-500 text-sm" data-en="Wheel, clutch, engine" data-fa="چرخ، کلاچ، موتور">چرخ، کلاچ، موتور</p>
                            <span class="category-count-badge" data-category-count="automotive-bearing"></span>
                        </a>

                        <!-- Housings & Bushings -->
                        <a href="#/search?category=housing-bushing" class="card-hover tilt-card bg-gray-50 rounded-2xl p-8 text-center cursor-pointer block no-underline">
                            <div class="w-full h-36 mx-auto mb-6 rounded-xl flex items-center justify-center shadow-lg" style="background:linear-gradient(135deg,#1348c8,#e8a81d);">
                                <i class="fas fa-ring text-4xl text-white"></i>
                            </div>
                            <h4 data-vector-page class="text-xl font-bold text-gray-800 mb-2" data-en="Housings & Bushings" data-fa="یاتاقان و بوش">یاتاقان و بوش</h4>
                            <p class="text-gray-500 text-sm" data-en="UCP, sleeves, bushings" data-fa="UCP، بوش، غلاف">UCP، بوش، غلاف</p>
                            <span class="category-count-badge" data-category-count="housing-bushing"></span>
                        </a>
                    </div>
                </div>
            </div>
```

---

## ۳) `index.html` — سایدبار فیلترهای هوشمند (صفحه نتایج)

```html
                    <aside id="filters-aside" class="lg:w-72 flex-shrink-0 filters-collapsed" data-aria-en="Result filters" data-aria-fa="فیلتر نتایج" aria-label="فیلتر نتایج">
                        <div class="filter-shell rounded-2xl shadow-sm p-5 lg:sticky lg:top-24">
                            <div class="flex items-start justify-between gap-3 mb-4">
                                <div>
                                    <h3 class="font-extrabold text-lg text-gray-900" data-en="Smart filters" data-fa="فیلتر هوشمند">فیلتر هوشمند</h3>
                                    <p class="text-xs text-gray-400 mt-1" data-en="Narrow results without leaving the table" data-fa="نتایج را بدون خروج از جدول دقیق‌تر کنید">نتایج را بدون خروج از جدول دقیق‌تر کنید</p>
                                </div>
                                <button onclick="clearFilters()" class="text-xs font-bold text-blue-600 hover:underline" data-en="Reset" data-fa="حذف همه" type="button">حذف همه</button>
                            </div>

                            <div class="mb-4">
                                <div class="flex items-center justify-between text-xs text-gray-500 mb-2">
                                    <span data-en="Filter strength" data-fa="شدت فیلتر">شدت فیلتر</span>
                                    <span id="active-filter-count">0</span>
                                </div>
                                <div class="filter-strength"><span id="filter-strength-bar"></span></div>
                            </div>

                            <div id="active-filters" class="flex flex-wrap gap-2 mb-4"></div>

                            <label class="filter-row mb-4" style="background:linear-gradient(135deg,rgba(22,163,74,0.08),rgba(10,92,196,0.06));">
                                <span class="flex items-center gap-2">
                                    <input type="checkbox" id="filter-only-stock" onchange="applyFilters()">
                                    <span class="font-bold text-gray-700" data-en="Only Tehran stock" data-fa="فقط موجود تهران">فقط موجود تهران</span>
                                </span>
                                <span class="filter-count" id="stock-filter-count">0</span>
                            </label>

                            <div class="mb-4">
                                <p class="text-xs font-bold text-gray-500 mb-2" data-en="Quick picks" data-fa="انتخاب سریع">انتخاب سریع</p>
                                <div class="flex flex-wrap gap-2">
                                    <button onclick="setQuickFilter('brand','SKF')" data-qf-kind="brand" data-qf-value="SKF" aria-pressed="false" class="quick-filter-chip" type="button">SKF</button>
                                    <button onclick="setQuickFilter('brand','HKT')" data-qf-kind="brand" data-qf-value="HKT" aria-pressed="false" class="quick-filter-chip" type="button">HKT</button>
                                    <button onclick="setQuickFilter('type','bearing')" data-qf-kind="type" data-qf-value="bearing" aria-pressed="false" class="quick-filter-chip" data-en="Bearings" data-fa="برینگ‌ها" type="button">برینگ‌ها</button>
                                </div>
                            </div>

                            <div class="filter-group">
                                <button class="filter-toggle" onclick="toggleFilterGroup(this)" type="button" aria-expanded="true" aria-controls="filter-content-brand">
                                    <span data-en="Brand" data-fa="برند">برند</span>
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <div id="filter-content-brand" class="filter-content space-y-1 max-h-56 overflow-y-auto pr-1">
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="brand-filter" value="SKF" onchange="applyFilters()"><span>SKF</span></span><span class="filter-count">10</span></label>
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="brand-filter" value="FAG" onchange="applyFilters()"><span>FAG</span></span><span class="filter-count">2</span></label>
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="brand-filter" value="HKT" onchange="applyFilters()"><span>HKT</span></span><span class="filter-count">2</span></label>
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="brand-filter" value="Ringspann" onchange="applyFilters()"><span>Ringspann</span></span><span class="filter-count">1</span></label>
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="brand-filter" value="ASAHI" onchange="applyFilters()"><span>ASAHI</span></span><span class="filter-count">2</span></label>
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="brand-filter" value="NTN" onchange="applyFilters()"><span>NTN</span></span><span class="filter-count">1</span></label>
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="brand-filter" value="ZWZ" onchange="applyFilters()"><span>ZWZ</span></span><span class="filter-count">1</span></label>
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="brand-filter" value="Timken" onchange="applyFilters()"><span>Timken</span></span><span class="filter-count">1</span></label>
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="brand-filter" value="Flender" onchange="applyFilters()"><span>Flender</span></span><span class="filter-count">1</span></label>
                                </div>
                            </div>

                            <div class="filter-group">
                                <button class="filter-toggle" onclick="toggleFilterGroup(this)" type="button" aria-expanded="true" aria-controls="filter-content-type">
                                    <span data-en="Part type" data-fa="نوع قطعه">نوع قطعه</span>
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <div id="filter-content-type" class="filter-content space-y-1">
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="type-filter" value="bearing" onchange="applyFilters()"><span data-en="Bearings" data-fa="برینگ و یاتاقان">برینگ و یاتاقان</span></span><span class="filter-count">19</span></label>
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="type-filter" value="grease" onchange="applyFilters()"><span data-en="Greases" data-fa="گریس">گریس</span></span><span class="filter-count">1</span></label>
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="type-filter" value="linear" onchange="applyFilters()"><span data-en="Linear guides" data-fa="گاید خطی">گاید خطی</span></span><span class="filter-count">4</span></label>
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="type-filter" value="coupling" onchange="applyFilters()"><span data-en="Couplings" data-fa="کوپلینگ">کوپلینگ</span></span><span class="filter-count">6</span></label>
                                    <label class="filter-row"><span class="flex items-center gap-2"><input type="checkbox" class="type-filter" value="gearbox" onchange="applyFilters()"><span data-en="Gearboxes" data-fa="گیربکس">گیربکس</span></span><span class="filter-count">4</span></label>
                                </div>
                            </div>

                            <div class="filter-group">
                                <button class="filter-toggle" onclick="toggleFilterGroup(this)" type="button" aria-expanded="true" aria-controls="filter-content-dims">
                                    <span data-en="Size" data-fa="ابعاد">ابعاد</span>
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <div id="filter-content-dims" class="filter-content space-y-3">
                                    <div class="segmented w-full justify-between">
                                        <input type="radio" id="filter-dim-exact" name="filter-dim-mode" value="exact" onchange="applyFilters()">
                                        <label for="filter-dim-exact" class="flex-1 text-center" data-en="Exact" data-fa="دقیق">دقیق</label>
                                        <input type="radio" id="filter-dim-range" name="filter-dim-mode" value="range" checked onchange="applyFilters()">
                                        <label for="filter-dim-range" class="flex-1 text-center" data-en="Range" data-fa="بازه‌ای">بازه‌ای</label>
                                    </div>
                                    <div class="segmented w-full justify-between">
                                        <input type="radio" id="filter-unit-mm" name="filter-dim-unit" value="metric" checked onchange="applyFilters()">
                                        <label for="filter-unit-mm" class="flex-1 text-center" data-en="mm" data-fa="میلی‌متر">میلی‌متر</label>
                                        <input type="radio" id="filter-unit-inch" name="filter-dim-unit" value="inch" onchange="applyFilters()">
                                        <label for="filter-unit-inch" class="flex-1 text-center" data-en="inch" data-fa="اینچ">اینچ</label>
                                    </div>
                                    <div class="grid grid-cols-1 gap-3">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-500 mb-1" data-en="Inner diameter" data-fa="قطر داخل">قطر داخل</label>
                                            <div class="grid grid-cols-2 gap-2"><input type="text" inputmode="decimal" dir="ltr" aria-label="قطر داخل" data-aria-en="Bore d — exact / from" data-aria-fa="قطر داخل — دقیق / از" id="filter-d-min" class="compact-input text-sm" data-placeholder-en="Exact / from" data-placeholder-fa="دقیق / از" placeholder="دقیق / از" onchange="applyFilters()"><input type="text" inputmode="decimal" dir="ltr" aria-label="قطر داخل تا" data-aria-en="Bore d — to" data-aria-fa="قطر داخل — تا" id="filter-d-max" class="compact-input text-sm" data-placeholder-en="To" data-placeholder-fa="تا" placeholder="تا" onchange="applyFilters()"></div>
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-500 mb-1" data-en="Outer diameter" data-fa="قطر خارج">قطر خارج</label>
                                            <div class="grid grid-cols-2 gap-2"><input type="text" inputmode="decimal" dir="ltr" aria-label="قطر خارج" data-aria-en="Outer dia. D — exact / from" data-aria-fa="قطر خارج — دقیق / از" id="filter-D-min" class="compact-input text-sm" data-placeholder-en="Exact / from" data-placeholder-fa="دقیق / از" placeholder="دقیق / از" onchange="applyFilters()"><input type="text" inputmode="decimal" dir="ltr" aria-label="قطر خارج تا" data-aria-en="Outer dia. D — to" data-aria-fa="قطر خارج — تا" id="filter-D-max" class="compact-input text-sm" data-placeholder-en="To" data-placeholder-fa="تا" placeholder="تا" onchange="applyFilters()"></div>
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-500 mb-1" data-en="Width" data-fa="عرض">عرض</label>
                                            <div class="grid grid-cols-2 gap-2"><input type="text" inputmode="decimal" dir="ltr" aria-label="عرض" data-aria-en="Width B — exact / from" data-aria-fa="عرض — دقیق / از" id="filter-B-min" class="compact-input text-sm" data-placeholder-en="Exact / from" data-placeholder-fa="دقیق / از" placeholder="دقیق / از" onchange="applyFilters()"><input type="text" inputmode="decimal" dir="ltr" aria-label="عرض تا" data-aria-en="Width B — to" data-aria-fa="عرض — تا" id="filter-B-max" class="compact-input text-sm" data-placeholder-en="To" data-placeholder-fa="تا" placeholder="تا" onchange="applyFilters()"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="filter-group collapsed">
                                <button class="filter-toggle" onclick="toggleFilterGroup(this)" type="button" aria-expanded="false" aria-controls="filter-content-tech">
                                    <span data-en="Technical filters" data-fa="فیلترهای فنی">فیلترهای فنی</span>
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <div id="filter-content-tech" class="filter-content space-y-4" inert>
                                    <div>
                                        <p class="text-xs font-bold text-gray-500 mb-2" data-en="Cage type" data-fa="نوع قفسه">نوع قفسه</p>
                                        <div class="flex flex-wrap gap-2">
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="cageType" value="Steel" onchange="applyFilters()">فولادی</label>
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="cageType" value="Brass" onchange="applyFilters()">برنجی</label>
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="cageType" value="Polyamide" onchange="applyFilters()">پلی‌آمید</label>
                                        </div>
                                    </div>
                                    <div>
                                        <p class="text-xs font-bold text-gray-500 mb-2" data-en="Seal type" data-fa="نوع آب‌بند">نوع آب‌بند</p>
                                        <div class="flex flex-wrap gap-2">
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="sealType" value="Open" onchange="applyFilters()">باز</label>
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="sealType" value="2RS" onchange="applyFilters()">سیل</label>
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="sealType" value="ZZ" onchange="applyFilters()">شیلد</label>
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="sealType" value="Sealed" onchange="applyFilters()">آب‌بندی‌شده</label>
                                        </div>
                                    </div>
                                    <div>
                                        <p class="text-xs font-bold text-gray-500 mb-2" data-en="Lubrication" data-fa="روان‌کاری">روان‌کاری</p>
                                        <div class="flex flex-wrap gap-2">
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="lubrication" value="Grease" onchange="applyFilters()">گریس</label>
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="lubrication" value="Oil" onchange="applyFilters()">روغن</label>
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="lubrication" value="Dry" onchange="applyFilters()">خشک</label>
                                        </div>
                                    </div>
                                    <div>
                                        <p class="text-xs font-bold text-gray-500 mb-2" data-en="Internal clearance" data-fa="لقی داخلی">لقی داخلی</p>
                                        <div class="flex flex-wrap gap-2">
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="internalClearance" value="C0" onchange="applyFilters()">C0</label>
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="internalClearance" value="C3" onchange="applyFilters()">C3</label>
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="internalClearance" value="C4" onchange="applyFilters()">C4</label>
                                        </div>
                                    </div>
                                    <div>
                                        <p class="text-xs font-bold text-gray-500 mb-2" data-en="Accuracy class" data-fa="کلاس دقت">کلاس دقت</p>
                                        <div class="flex flex-wrap gap-2">
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="accuracyClass" value="P0" onchange="applyFilters()">P0</label>
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="accuracyClass" value="P6" onchange="applyFilters()">P6</label>
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="accuracyClass" value="P5" onchange="applyFilters()">P5</label>
                                            <label class="scope-chip"><input type="checkbox" class="tech-filter ml-1" data-field="accuracyClass" value="P4" onchange="applyFilters()">P4</label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Mobile-only: apply and jump to results -->
                            <button id="mobile-show-results" onclick="closeMobileFiltersAndScroll()" class="btn-primary text-white w-full mt-5 py-3 rounded-xl font-bold" type="button">
                                <i class="fas fa-check" aria-hidden="true"></i><span>نمایش نتایج</span>
                            </button>

                        </div>
                    </aside>
```

---

## ۴) `assets/js/06-search.js` — جستجوی دسته‌بندی، ریست، گروه‌ها و چیپ‌های سریع

```javascript
function searchByType(type) {
    resetProductFilters();
    AppState.lastSearch = type;
    AppState.categoryFilter = type;
    recomputeResults();
    updateHashRoute('search');
}

function resetProductFilters() {
    AppState.textQuery = '';
    AppState.categoryFilter = '';
    AppState.dimensionSearch = null;
    AppState.lastSearch = '';
    AppState.relevanceOrder = [];
    document.getElementById('filter-dim-range').checked = true;
    document.getElementById('filter-unit-mm').checked = true;
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    document.querySelectorAll('.brand-filter, .type-filter, .tech-filter').forEach(cb => cb.checked = false);
    ['filter-d-min','filter-d-max','filter-D-min','filter-D-max','filter-B-min','filter-B-max'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.removeAttribute('aria-invalid'); }
    });
    const onlyStock = document.getElementById('filter-only-stock');
    if (onlyStock) onlyStock.checked = false;
}

function filterByBrand(brand) {
    resetProductFilters();
    AppState.lastSearch = brand;
    document.querySelectorAll('.brand-filter').forEach(input => input.checked = input.value === brand);
    recomputeResults();
    updateHashRoute('search');
}

function toggleFilterGroup(button) {
    const group = button.closest('.filter-group');
    const collapsed = group.classList.toggle('collapsed');
    const content = group.querySelector('.filter-content');
    // Keep collapsed panels out of the tab order (invisible focus trap otherwise).
    if (content) content.inert = collapsed;
    button.setAttribute('aria-expanded', String(!collapsed));
}

function setQuickFilter(kind, value) {
    const map = {
        brand: '.brand-filter',
        type: '.type-filter'
    };
    const target = [...document.querySelectorAll(map[kind] || '')].find(input => input.value === value);
    if (target) {
        target.checked = !target.checked;
        applyFilters();
    }
}

// Quick chips mirror their checkbox: active style + aria-pressed, so a second
// tap on the same chip removes the filter instead of leaving it stuck on.
function syncQuickFilterChips() {
    document.querySelectorAll('.quick-filter-chip[data-qf-kind]').forEach(chip => {
        const selector = chip.dataset.qfKind === 'brand' ? '.brand-filter' : '.type-filter';
        const input = [...document.querySelectorAll(selector)].find(i => i.value === chip.dataset.qfValue);
        const active = !!input?.checked;
        chip.classList.toggle('active', active);
        chip.setAttribute('aria-pressed', String(active));
    });
```

---

## ۵) `assets/js/06-search.js` — حذف فیلتر و چیپ‌های فیلتر فعال (حذف امن با data-attribute)

```javascript
function removeFilter(kind, value) {
    if (kind === 'category') {
        AppState.categoryFilter = '';
    } else if (kind === 'hero-dimension') {
        AppState.dimensionSearch = null;
    } else if (kind === 'dimension') {
        ['filter-d-min','filter-d-max','filter-D-min','filter-D-max','filter-B-min','filter-B-max'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = '';
        });
    } else if (kind === 'stock') {
        const input = document.getElementById('filter-only-stock');
        if (input) input.checked = false;
    } else if (kind === 'tech') {
        const [field, val] = value.split(':');
        document.querySelectorAll('.tech-filter').forEach(input => {
            if (input.dataset.field === field && input.value === val) input.checked = false;
        });
    } else {
        const selector = kind === 'brand' ? '.brand-filter' : '.type-filter';
        if (selector) document.querySelectorAll(selector).forEach(input => {
            if (input.value === value) input.checked = false;
        });
    }
    applyFilters();
}

function renderActiveFilters() {
    const container = document.getElementById('active-filters');
    const counter = document.getElementById('active-filter-count');
    const bar = document.getElementById('filter-strength-bar');
    if (!container || !counter || !bar) return;

    const fa = AppState.language === 'fa';
    const chips = [];
    if (AppState.categoryFilter) chips.push({ kind: 'category', value: '', label: getCategoryLabel(AppState.categoryFilter) });
    if (AppState.dimensionSearch) chips.push({ kind: 'hero-dimension', value: '', label: getDimensionLabel(AppState.dimensionSearch) });
    document.querySelectorAll('.brand-filter:checked').forEach(input => chips.push({ kind: 'brand', value: input.value, label: input.value }));
    document.querySelectorAll('.type-filter:checked').forEach(input => chips.push({ kind: 'type', value: input.value, label: input.parentElement?.querySelector('span')?.textContent.trim() || input.value }));
    document.querySelectorAll('.tech-filter:checked').forEach(input => chips.push({ kind: 'tech', value: `${input.dataset.field}:${input.value}`, label: input.closest('label')?.textContent.trim() || input.value }));

    const dimIds = ['filter-d-min','filter-d-max','filter-D-min','filter-D-max','filter-B-min','filter-B-max'];
    const hasDim = dimIds.some(id => document.getElementById(id)?.value);
    if (hasDim) chips.push({ kind: 'dimension', value: 'dimension', label: fa ? 'ابعاد' : 'Size' });
    if (document.getElementById('filter-only-stock')?.checked) chips.push({ kind: 'stock', value: 'stock', label: fa ? 'فقط موجود تهران' : 'Tehran stock' });

    counter.textContent = fa ? `${chips.length} فعال` : `${chips.length} active`;
    bar.style.width = `${Math.min(chips.length * 22, 100)}%`;

    if (!chips.length) {
        container.innerHTML = `<span class="text-xs text-gray-400">${fa ? 'فیلتری فعال نیست' : 'No active filters'}</span>`;
        container.onclick = null;
        return;
    }

    // Values travel through data-* attributes (never interpolated into JS code),
    // so quotes in brands or codes cannot break the handler.
    container.innerHTML = chips.map(chip => `
        <span class="active-filter-chip">
            ${escapeHTML(chip.label)}
            <button type="button" data-filter-kind="${escapeHTML(chip.kind)}" data-filter-value="${escapeHTML(chip.value)}" aria-label="${escapeHTML(fa ? `حذف فیلتر ${chip.label}` : `Remove filter: ${chip.label}`)}">×</button>
        </span>
    `).join('');
    container.onclick = (event) => {
        const btn = event.target.closest('button[data-filter-kind]');
        if (btn) removeFilter(btn.dataset.filterKind, btn.dataset.filterValue);
    };
}

// Sidebar facet counts adapt to the current search: each group's numbers ignore
// that group's own selection (standard faceted-search behaviour), so SKF=8 next
// to "Bearing" instead of a stale catalogue total. Options that would match
```

---

## ۶) `assets/js/06-search.js` — شمارش facet، گزینه‌های صفر و شمارش دسته‌ها

```javascript
function applySidebarFilters(results, filter, skipKind = null) {
    if (skipKind !== 'brand' && filter.selectedBrands.length > 0) {
        results = results.filter(p => filter.selectedBrands.includes(p.brand));
    }
    if (skipKind !== 'type' && filter.selectedTypes.length > 0) {
        results = results.filter(p => filter.selectedTypes.includes(p.type));
    }
    if (skipKind !== 'stock' && filter.onlyStock) {
        results = results.filter(p => p.stockStatus === 'in-stock' && p.stock > 0);
    }
    if (skipKind !== 'tech') {
        Object.entries(filter.techFilters).forEach(([field, values]) => {
            if (values.length) results = results.filter(p => values.includes(p[field]));
        });
    }
    if (skipKind !== 'dim') {
        const hasDimFilter = [filter.dMin, filter.dMax, filter.DMin, filter.DMax, filter.BMin, filter.BMax].some(value => value !== null);
        if (hasDimFilter) {
            results = results.filter(p => {
                const tol = value => filter.dimUnit === 'inch' && value ? Math.max(0.5, value * 0.01) : 0.15;
                const dOk = filter.dimMode === 'exact'
                    ? dimensionWithin(p.d, filter.dMin, null, null, 'exact', tol(filter.dMin))
                    : dimensionWithin(p.d, null, filter.dMin, filter.dMax, 'range');
                const DOk = filter.dimMode === 'exact'
                    ? dimensionWithin(p.D, filter.DMin, null, null, 'exact', tol(filter.DMin))
                    : dimensionWithin(p.D, null, filter.DMin, filter.DMax, 'range');
                const BOk = filter.dimMode === 'exact'
                    ? dimensionWithin(p.B, filter.BMin, null, null, 'exact', tol(filter.BMin))
                    : dimensionWithin(p.B, null, filter.BMin, filter.BMax, 'range');
                return dOk && DOk && BOk;
            });
        }
    }
    return results;
}

// The product pool a facet group counts against: the current query, category and
// hero dimensions + every sidebar filter except the skipped group.
function getFacetBase(skipKind) {
    const filter = getSidebarFilterState();
    const query = AppState.textQuery || '';
    let results = query ? searchProducts(query, getSelectedPartFields()) : [...ProductDatabase];
    if (AppState.categoryFilter) results = results.filter(p => productMatchesCategory(p, AppState.categoryFilter));
    results = applyDimensionResultSet(results, AppState.dimensionSearch);
    return applySidebarFilters(results, filter, skipKind);
}

function updateFilterCounts() {
    // The catalogue includes more brands/origins than the initial static list.
    const list = document.querySelector('.brand-filter')?.closest('.filter-content');
    const shown = [...document.querySelectorAll('.brand-filter')].map(input => input.value);
    [...new Set(ProductDatabase.map(product => product.brand))].filter(brand => !shown.includes(brand)).sort().forEach(brand => {
        const row = document.createElement('label');
        row.className = 'filter-row';
        row.dataset.dynamic = 'brand';
        row.innerHTML = `<span class="flex items-center gap-2"><input type="checkbox" class="brand-filter" value="${escapeHTML(brand)}" onchange="applyFilters()"><span>${escapeHTML(brand)}</span></span><span class="filter-count"></span>`;
        list?.appendChild(row);
    });
    // Prune dynamically added rows whose option vanished from the catalogue
    document.querySelectorAll('.filter-row[data-dynamic]').forEach(row => {
        const input = row.querySelector('input');
        if (!input) return;
        const alive = ProductDatabase.some(p => p.brand === input.value);
        if (!alive) row.remove();
    });
    const brandPool = getFacetBase('brand');
    const typePool = getFacetBase('type');
    document.querySelectorAll('.filter-row input').forEach(input => {
        const row = input.closest('.filter-row');
        const countEl = row?.querySelector('.filter-count');
        if (!countEl) return;
        let count = 0;
        if (input.classList.contains('brand-filter')) count = brandPool.filter(p => p.brand === input.value).length;
        if (input.classList.contains('type-filter')) count = typePool.filter(p => p.type === input.value).length;
        countEl.textContent = count;
        if (count === 0 && !input.checked) {
            row.classList.add('is-zero');
            input.disabled = true;
        } else {
            row.classList.remove('is-zero');
            input.disabled = false;
        }
    });
    const stockCount = document.getElementById('stock-filter-count');
    if (stockCount) stockCount.textContent = getFacetBase('stock').filter(p => p.stockStatus === 'in-stock' && p.stock > 0).length;
    syncQuickFilterChips();
    updateCategoryCounts();
    updateMobileResultsButton();
}

// Small "N products" badges on the category cards/tabs keep browsing honest.
function updateCategoryCounts() {
    const categories = ['industrial-bearing', 'automotive-bearing', 'housing-bushing', 'grease'];
    const counts = Object.fromEntries(categories.map(cat => [cat, ProductDatabase.filter(p => productMatchesCategory(p, cat)).length]));
    document.querySelectorAll('[data-category-count]').forEach(el => {
        const count = counts[el.dataset.categoryCount];
        if (count === undefined) return;
        el.textContent = AppState.language === 'fa' ? `${formatNumber(count)} محصول` : `${formatNumber(count)} products`;
    });
}

function updateMobileResultsButton() {
    const btn = document.getElementById('mobile-show-results');
    if (!btn) return;
    const count = AppState.searchResults?.length ?? ProductDatabase.length;
    btn.querySelector('span').textContent = AppState.language === 'fa' ? `نمایش ${formatNumber(count)} نتیجه` : `Show ${formatNumber(count)} results`;
}

```

---

## ۷) `assets/js/06-search.js` — منطق دسته‌بندی و بازمحاسبه نتایج

```javascript
function productMatchesCategory(product, category) {
    if (category === 'industrial-bearing') return product.type === 'bearing' && product.subtype !== 'pillow-block';
    if (category === 'automotive-bearing') return product.type === 'bearing' && ['tapered', 'deep-groove'].includes(product.subtype);
    if (category === 'housing-bushing') return product.subtype === 'pillow-block' || normalizeSearchValue(product.code).includes('ucp') || normalizeSearchValue(product.code).includes('lm');
    if (category === 'grease') return product.type === 'grease';
    return product.type === category || product.subtype === category;
}

function recomputeResults() {
    const filter = getSidebarFilterState();
    const query = AppState.textQuery || '';
    let results = query ? searchProducts(query, getSelectedPartFields()) : [...ProductDatabase];
    AppState.relevanceOrder = results.map(product => product.id);

    if (AppState.categoryFilter) {
        results = results.filter(p => productMatchesCategory(p, AppState.categoryFilter));
    }

    results = applySidebarFilters(results, filter);
    results = applyDimensionResultSet(results, AppState.dimensionSearch);

    AppState.searchResults = results;
    const input = document.getElementById('results-search-input');
    if (input) input.value = query;
    document.getElementById('search-input').value = query;
    renderActiveFilters();
    sortResults(false);
    updateFilterCounts();
}

function applyFilters() {
    const exact = document.getElementById('filter-dim-exact').checked;
    if (!validateDimensionInputs(exact ? ['filter-d-min','filter-D-min','filter-B-min'] : ['filter-d-min','filter-d-max','filter-D-min','filter-D-max','filter-B-min','filter-B-max'])) return;
    recomputeResults();
    syncSearchRoute();
}

function clearFilters() {
    resetProductFilters();
    recomputeResults();
    syncSearchRoute();
}
```

---

## ۸) `assets/js/06-search.js` — رندر نتایج + حالت خالی هوشمند (فیلتر در برابر جستجو)

```javascript
function renderSearchResults() {
    const container = document.getElementById('results-container');
    const tableContainer = document.getElementById('results-table-container');
    const tableBody = document.getElementById('results-table-body');
    document.getElementById('results-count').textContent = formatNumber(AppState.searchResults.length);

    if (AppState.searchResults.length === 0) {
        tableContainer.classList.add('hidden');
        container.classList.remove('hidden');
        container.className = 'results-empty grid grid-cols-1 gap-6';
        const fa = AppState.language === 'fa';
        const chipsActive = AppState.categoryFilter || AppState.dimensionSearch
            || document.querySelector('.brand-filter:checked, .type-filter:checked, .tech-filter:checked, #filter-only-stock:checked')
            || ['filter-d-min','filter-d-max','filter-D-min','filter-D-max','filter-B-min','filter-B-max'].some(id => document.getElementById(id)?.value);
        const searchMiss = !!(AppState.textQuery || AppState.dimensionSearch);
        if (chipsActive && !searchMiss) {
            // Filters narrowed the catalogue to zero — that is not a "part not
            // found" moment; offer the way back first, sourcing second.
            container.innerHTML = `
                <div class="filters-empty rounded-2xl p-5 sm:p-6 text-center animate-slide-up">
                    <div class="filters-empty-icon"><i class="fas fa-filter-circle-xmark" aria-hidden="true"></i></div>
                    <h3 class="text-lg sm:text-xl font-extrabold mb-1 text-gray-800">${fa ? 'هیچ محصولی با این فیلترها پیدا نشد' : 'No products match these filters'}</h3>
                    <p class="text-gray-500 text-sm mb-4 max-w-xl mx-auto leading-6">${fa
                        ? 'ترکیب فیلترهای انتخاب‌شده خیلی محدود است. می‌توانید فیلترها را بردارید یا یکی از چیپ‌های بالای فهرست را حذف کنید.'
                        : 'Your selected filters are too narrow. Clear them, or remove one of the chips above the list.'}</p>
                    <div class="flex flex-col sm:flex-row gap-2 justify-center">
                        <button onclick="clearFilters()" class="btn-primary text-white px-5 py-3 rounded-xl font-bold" type="button">
                            <i class="fas fa-rotate-left" aria-hidden="true"></i>${fa ? 'حذف همه فیلترها' : 'Clear all filters'}
                        </button>
                        <button onclick="openLeadModal('failed-search')" class="btn-accent text-white px-5 py-3 rounded-xl font-bold" type="button">
                            <i class="fas fa-bolt" aria-hidden="true"></i>${fa ? 'ثبت سفارش سریع این قطعه' : 'Create fast request for this part'}
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        const title = fa ? 'قطعه در دیتابیس پیدا نشد' : 'Part not found in the indexed database';
        const desc = fa
            ? 'این جستجو را به درخواست تامین تبدیل کنید. تیم مهندسی برینگ آنلاین کد معادل، برند جایگزین، قیمت نهایی و زمان تحویل را سریع اعلام می‌کند.'
            : 'Convert this search into a sourcing request. Bearing Online engineering will return equivalent codes, alternative brands, final price, and delivery time fast.';
        const queryLabel = fa ? 'جستجوی شما' : 'Your search';
        const sendLabel = fa ? 'ثبت سفارش سریع این قطعه' : 'Create fast request for this part';
        const consultLabel = fa ? 'مشاوره مهندسی رایگان' : 'Free engineering consultation';
        container.innerHTML = `
            <div class="lead-card rounded-2xl p-4 sm:p-5 text-white animate-slide-up">
                <div class="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-white/70 text-xs mb-2 w-fit max-w-full">
                    <i class="fas fa-magnifying-glass-chart shrink-0"></i>
                    <span class="truncate">${queryLabel}: ${escapeHTML(AppState.textQuery || (AppState.dimensionSearch ? getDimensionLabel(AppState.dimensionSearch) : '') || getCategoryLabel(AppState.categoryFilter) || AppState.lastSearch || '-')}</span>
                </div>
                <h3 class="text-lg sm:text-xl font-extrabold mb-1">${title}</h3>
                <p class="text-white/70 text-xs sm:text-sm mb-3 max-w-2xl leading-5">${desc}</p>
                <button onclick="clearFilters()" class="mb-3 underline text-sm" type="button">${fa ? 'پاک کردن جستجو و فیلترها' : 'Clear search and filters'}</button>
                <div class="flex flex-col sm:flex-row gap-2">
                    <button onclick="openLeadModal('failed-search')" class="btn-accent magnetic text-white px-4 py-2.5 rounded-xl font-bold text-sm" type="button">
                        <i class="fas fa-bolt mr-2"></i>${sendLabel}
                    </button>
                    <button onclick="openLeadModal('consultation')" class="btn-primary magnetic text-white px-4 py-2.5 rounded-xl font-bold text-sm" type="button">
                        <i class="fas fa-user-gear mr-2"></i>${consultLabel}
                    </button>
                </div>
            </div>
        `;
        initMagnetic();
        initRipple();
        return;
    }

    if (AppState.viewMode === 'grid') {
        container.className = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6';
        container.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        container.innerHTML = AppState.searchResults.map(p => `
            <div tabindex="0" role="link" aria-label="${p.brand} ${p.code}" onkeydown="if(event.target === this && event.key === 'Enter') showProductDetail('${p.id}')" class="bg-white rounded-2xl shadow-sm overflow-hidden card-hover tilt-card animate-fade-in cursor-pointer" onclick="showProductDetail('${p.id}')">
                <div class="product-image-bg p-6 sm:p-8 flex items-center justify-center relative">
                    ${hasProductImage(p) ? `<img src="${p.image}" alt="${p.brand} ${p.code}" class="product-photo max-h-44 w-auto max-w-full object-contain rounded-lg" loading="lazy">` : `<i class="fas fa-${productTypeIcon(p.type)} text-6xl text-gray-300"></i>`}
                    <button onclick="event.stopPropagation(); toggleCompare('${p.id}')" aria-label="${AppState.language === 'fa' ? 'مقایسه' : 'Compare'}" class="absolute top-4 right-4 w-10 h-10 rounded-full ${AppState.compareList.includes(p.id) ? 'bg-blue-500 text-white' : 'bg-white text-gray-400 hover:text-blue-500'} shadow flex items-center justify-center transition" type="button">
                        <i class="fas fa-balance-scale"></i>
                    </button>
                    <button onclick="event.stopPropagation(); toggleWishlist('${p.id}')" aria-label="${AppState.language === 'fa' ? 'علاقه‌مندی' : 'Save product'}" class="absolute top-4 left-4 w-10 h-10 rounded-full ${AppState.wishlist.includes(p.id) ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500'} shadow flex items-center justify-center transition" type="button">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="p-6">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-600">${p.brand}</span>
                    </div>
                    <h4 dir="ltr" class="product-code text-lg font-bold text-gray-800 mb-2 hover:text-blue-600">${p.code} ${p.searchMeta?.equivalent ? `<span class="mr-2 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs">${AppState.language === 'fa' ? 'معادل' : 'Equivalent'}</span>` : ''}</h4>
                    <p class="product-type-bilingual text-sm text-gray-600 mb-2">${faSubtype(p.subtype)} · ${faType(p.type)}</p>
                    <p class="product-dimensions text-sm text-gray-500 mb-3" dir="ltr">${formatDimensions(p)}</p>
                    <div class="mb-4">${getStockBadge(p)}</div>
                    <div class="product-card-footer flex items-center justify-between">
                        <div>
                            <span class="text-2xl font-bold ${p.sell_mode === 'instant' ? 'text-gray-800' : 'text-orange-600'}">${p.sell_mode === 'instant' ? formatPrice(p.priceUSD) : (AppState.language === 'fa' ? 'استعلام' : 'RFQ')}</span>
                            ${p.sell_mode === 'instant' ? `<span class="text-sm text-gray-500"> ${currencyLabel()}</span>` : ''}
                        </div>
                        ${p.sell_mode === 'instant' ? `<button onclick="event.stopPropagation(); addToCart('${p.id}')" aria-label="${AppState.language === 'fa' ? 'افزودن به سبد' : 'Add to cart'}" class="btn-primary text-white px-4 py-2 rounded-lg" type="button"><i class="fas fa-cart-plus"></i></button>` : `<button onclick="event.stopPropagation(); requestQuote('${p.id}')" class="btn-accent text-white px-4 py-2 rounded-lg text-sm" type="button">${AppState.language === 'fa' ? 'استعلام' : 'RFQ'}</button>`}
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        container.classList.add('hidden');
        tableContainer.classList.remove('hidden');
        const tfa = AppState.language === 'fa';
        const tLabels = {
            cart: tfa ? 'افزودن به سبد' : 'Add to cart',
            rfq: tfa ? 'استعلام قیمت' : 'Request a quote',
            compare: tfa ? 'مقایسه' : 'Compare',
            save: tfa ? 'ذخیره در علاقه‌مندی‌ها' : 'Save product'
        };
        tableBody.innerHTML = AppState.searchResults.map(p => `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer" onclick="showProductDetail('${p.id}')">
                <td class="px-4 py-4">
                    <span class="font-medium text-blue-600 hover:underline">${p.code}</span>
                </td>
                <td class="px-4 py-4">
                    <span class="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-600">${p.brand}</span>
                </td>
                <td dir="ltr" class="px-4 py-4 text-gray-600">${formatDimensions(p)}</td>
                <td class="px-4 py-4 text-gray-600">${faType(p.type)}</td>
                <td class="px-4 py-4">${getStockBadge(p)}</td>
                <td class="px-4 py-4 font-bold ${p.sell_mode === 'instant' ? 'text-gray-800' : 'text-orange-600'}">${p.sell_mode === 'instant' ? `${formatPrice(p.priceUSD)} <span class="text-xs text-gray-500">${currencyLabel()}</span>` : quoteLabel()}</td>
                <td class="px-4 py-4">
                    <div class="flex gap-2">
                        ${p.sell_mode === 'instant' ? `<button onclick="event.stopPropagation(); addToCart('${p.id}')" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="${tLabels.cart}" aria-label="${tLabels.cart}" type="button"><i class="fas fa-cart-plus" aria-hidden="true"></i></button>` : `<button onclick="event.stopPropagation(); requestQuote('${p.id}')" class="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition" title="${tLabels.rfq}" aria-label="${tLabels.rfq}" type="button"><i class="fas fa-file-invoice" aria-hidden="true"></i></button>`}
                        <button onclick="event.stopPropagation(); toggleCompare('${p.id}')" class="p-2 ${AppState.compareList.includes(p.id) ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:bg-gray-100'} rounded-lg transition" title="${tLabels.compare}" aria-label="${tLabels.compare}" type="button">
                            <i class="fas fa-balance-scale" aria-hidden="true"></i>
                        </button>
                        <button onclick="event.stopPropagation(); toggleWishlist('${p.id}')" class="p-2 ${AppState.wishlist.includes(p.id) ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:bg-gray-100'} rounded-lg transition" title="${tLabels.save}" aria-label="${tLabels.save}" type="button">
                            <i class="fas fa-heart" aria-hidden="true"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

```

---

## ۹) `assets/js/15-mobile-ui.js` — فیلترهای موبایل

```javascript
function toggleMobileFilters() {
    const aside = document.getElementById('filters-aside');
    const btn = document.getElementById('mobile-filter-btn');
    if (!aside || !btn) return;
    const collapsed = aside.classList.toggle('filters-collapsed');
    btn.classList.toggle('expanded', !collapsed);
    btn.setAttribute('aria-expanded', String(!collapsed));
    if (!collapsed) {
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        aside.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
}

// Sticky "Show N results" button inside the mobile filter panel.
function closeMobileFiltersAndScroll() {
    const aside = document.getElementById('filters-aside');
    if (aside && !aside.classList.contains('filters-collapsed')) toggleMobileFilters();
    const target = document.querySelector('.results-main');
    if (target) {
        const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    }
}

```

---

## ۱۰) `assets/js/03-i18n.js` — پشتیبانی aria-label دوزبانه

```javascript
function applyLanguage() {
    document.documentElement.lang = AppState.language;
    document.documentElement.dir = AppState.language === 'fa' ? 'rtl' : 'ltr';

    document.querySelectorAll('[data-en]').forEach(el => {
        el.textContent = el.getAttribute(`data-${AppState.language}`);
    });

    document.querySelectorAll('[data-placeholder-en]').forEach(el => {
        el.placeholder = el.getAttribute(`data-placeholder-${AppState.language}`);
    });

    document.querySelectorAll('[data-aria-en]').forEach(el => {
        el.setAttribute('aria-label', el.getAttribute(`data-aria-${AppState.language}`));
    });

    document.getElementById('lang-toggle').textContent = AppState.language === 'en' ? 'فارسی' : 'English';
}

function toggleLanguage() {
    AppState.language = AppState.language === 'en' ? 'fa' : 'en';
    applyLanguage();
    updateBrandCarouselCaption._brand = null;
    updateBrandCarouselCaption();
    renderActiveFilters();
    renderSearchResults();
    if (typeof updateCategoryCounts === 'function') updateCategoryCounts();
    if (typeof updateMobileResultsButton === 'function') updateMobileResultsButton();
    if (!document.getElementById('page-cart').classList.contains('hidden')) renderCart();
    if (!document.getElementById('page-compare').classList.contains('hidden')) renderCompare();
    if (!document.getElementById('page-account').classList.contains('hidden')) showAccount();
    const pd = document.getElementById('product-detail-content');
    if (pd && !document.getElementById('page-product').classList.contains('hidden') && pd.dataset.pid) showProductDetail(pd.dataset.pid);
    if (typeof renderHomeBrands === 'function') renderHomeBrands();
    applyLanguage();
}

const TYPE_FA = { bearing: 'برینگ', linear: 'گاید خطی', coupling: 'کوپلینگ', gearbox: 'گیربکس', grease: 'گریس' };
const TYPE_EN = { bearing: 'Bearing', linear: 'Linear Guide', coupling: 'Coupling', gearbox: 'Gearbox', grease: 'Grease' };
const SUBTYPE_FA = {
    'deep-groove': 'شیار عمیق', spherical: 'بشکه‌ای', tapered: 'مخروطی', 'pillow-block': 'یاتاقان',
```

---

## ۱۱) `assets/js/02-utils.js` — آیکون محصول (رفع شباهت با لودینگ)

```javascript
function productTypeIcon(type) {
    // 'circle-notch' looked like a loading spinner on cards without a photo;
    // the wheel icon reads as a bearing instead.
    return type === 'bearing' ? 'dharmachakra' : type === 'linear' ? 'grip-lines' : type === 'coupling' ? 'link' : type === 'grease' ? 'droplet' : 'cogs';
}
```

---

## ۱۲) `assets/css/05-brand-carousel.css` — استایل‌های بخش فیلتر

```css
/* Refined filter UX */
.filter-shell {
    background: rgba(255,255,255,0.92);
    border: 1px solid rgba(226,232,240,0.9);
    backdrop-filter: blur(12px);
}
.filter-group {
    border-top: 1px solid #edf2f7;
    padding-top: 18px;
    margin-top: 18px;
}
.filter-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: #0f172a;
    font-weight: 800;
}
.filter-toggle i {
    color: #94a3b8;
    transition: transform 0.25s ease, color 0.25s ease;
}
.filter-group.collapsed .filter-toggle i { transform: rotate(-90deg); }
html[dir="rtl"] .filter-group.collapsed .filter-toggle i { transform: rotate(90deg); }
.filter-content {
    max-height: 420px;
    overflow: hidden;
    transition: max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, margin-top 0.25s ease;
    margin-top: 12px;
    opacity: 1;
}
.filter-group.collapsed .filter-content {
    max-height: 0;
    opacity: 0;
    margin-top: 0;
}
.filter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 10px;
    border-radius: 12px;
    transition: background 0.2s ease, transform 0.2s ease;
}
.filter-row:hover {
    background: #f8fafc;
    transform: translateX(-2px);
}
html[dir="rtl"] .filter-row:hover { transform: translateX(2px); }
.filter-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--brand-blue);
}
.filter-count {
    min-width: 26px;
    height: 22px;
    padding: 0 7px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #64748b;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 800;
}
.active-filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border-radius: 999px;
    background: rgba(10,92,196,0.08);
    color: #0a5cc4;
    border: 1px solid rgba(10,92,196,0.15);
    font-size: 12px;
    font-weight: 800;
}
.active-filter-chip button {
    color: #64748b;
    line-height: 1;
}
.quick-filter-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 11px;
    border-radius: 999px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #334155;
    font-size: 12px;
    font-weight: 800;
    transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}
.quick-filter-chip:hover {
    border-color: rgba(10,92,196,0.35);
    color: #0a5cc4;
    background: rgba(10,92,196,0.06);
}
.quick-filter-chip.active {
    border-color: rgba(10,92,196,0.45);
    color: #0a5cc4;
    background: rgba(10,92,196,0.12);
}
/* Facet options that would match zero products with the current filters. */
.filter-row.is-zero {
    opacity: 0.45;
}
.filter-row.is-zero input[type="checkbox"] {
    cursor: not-allowed;
}
.filter-row.is-zero .filter-count {
    background: transparent;
    color: #94a3b8;
}
/* Product-count chips on the home category cards and the hero category tab. */
.category-count-badge,
.search-category-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 10px;
    padding: 3px 10px;
    border-radius: 999px;
    background: rgba(10,92,196,0.08);
    color: #0a5cc4;
    font-size: 12px;
    font-weight: 800;
}
.search-category-count {
    margin-top: 8px;
    background: rgba(10,92,196,0.07);
}
/* Empty state when filters narrow the catalogue to nothing. */
.filters-empty {
    background: #fff;
    border: 1px dashed #c9d5e8;
    color: #334155;
}
.filters-empty-icon {
    width: 56px;
    height: 56px;
    margin: 0 auto 12px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10,92,196,0.08);
    color: #0a5cc4;
    font-size: 22px;
}
/* The sticky mobile "show results" action lives in the filter panel only. */
#mobile-show-results {
    display: none;
}
.filter-strength {
    height: 6px;
    border-radius: 999px;
    background: #e2e8f0;
    overflow: hidden;
}
.filter-strength span {
```

---

## ۱۳) `assets/css/07-mobile.css` — دکمه «نمایش نتایج» موبایل (درون media query موبایل)

```css
    #mobile-show-results { display: flex; align-items: center; justify-content: center; gap: 8px; position: sticky; bottom: calc(8px + env(safe-area-inset-bottom)); }
```
