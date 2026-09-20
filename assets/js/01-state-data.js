/* ===== 01-state-data.js — وضعیت برنامه، دیتابیس محصولات، اطلاعات برندها ===== */
// =============================================
// APPLICATION STATE & DATA
// =============================================
const AppState = {
    language: 'fa',
    exchangeRate: 52000,
    profitMargin: 25,
    cart: [],
    compareList: [],
    wishlist: [],
    staffRole: 'manager',
    staffName: '',
    leads: [],
    lastSearch: '',
    lastLeadPrompt: '',
    pendingLeadQuery: '',
    textQuery: '',
    categoryFilter: '',
    dimensionSearch: null,
    relevanceOrder: [],
    routing: false,
    searchResults: [],
    currentFilters: {},
    viewMode: 'grid'
};

// Sample Product Database
const ProductDatabase = [
    // Deep Groove Ball Bearings
    { id: 'SKF-6205', code: '6205', brand: 'SKF', type: 'bearing', subtype: 'deep-groove', d: 25, D: 52, B: 15, priceUSD: 8.50, speedRating: 13000, loadRating: 14800, weight: 0.115, origin: 'Sweden', seal: 'Open', clearance: 'C0', image: 'bearing' },
    { id: 'SKF-6205-2RS', code: '6205-2RS', brand: 'SKF', type: 'bearing', subtype: 'deep-groove', d: 25, D: 52, B: 15, priceUSD: 11.20, speedRating: 9500, loadRating: 14800, weight: 0.120, origin: 'Sweden', seal: '2RS', clearance: 'C0', image: 'bearing' },
    { id: 'FAG-6205', code: '6205', brand: 'FAG', type: 'bearing', subtype: 'deep-groove', d: 25, D: 52, B: 15, priceUSD: 9.80, speedRating: 13000, loadRating: 14800, weight: 0.115, origin: 'Germany', seal: 'Open', clearance: 'C0', image: 'bearing' },
    { id: 'NSK-6205', code: '6205', brand: 'NSK', type: 'bearing', subtype: 'deep-groove', d: 25, D: 52, B: 15, priceUSD: 7.50, speedRating: 13000, loadRating: 14800, weight: 0.115, origin: 'Japan', seal: 'Open', clearance: 'C0', image: 'bearing' },
    { id: 'ZWZ-6205', code: '6205', brand: 'ZWZ', type: 'bearing', subtype: 'deep-groove', d: 25, D: 52, B: 15, priceUSD: 3.20, speedRating: 11000, loadRating: 13500, weight: 0.115, origin: 'China', seal: 'Open', clearance: 'C0', image: 'bearing' },
    { id: 'SKF-6206', code: '6206', brand: 'SKF', type: 'bearing', subtype: 'deep-groove', d: 30, D: 62, B: 16, priceUSD: 10.50, speedRating: 12000, loadRating: 19500, weight: 0.180, origin: 'Sweden', seal: 'Open', clearance: 'C0', image: 'bearing' },
    { id: 'SKF-6207', code: '6207', brand: 'SKF', type: 'bearing', subtype: 'deep-groove', d: 35, D: 72, B: 17, priceUSD: 13.80, speedRating: 10000, loadRating: 25500, weight: 0.280, origin: 'Sweden', seal: 'Open', clearance: 'C0', image: 'bearing' },
    { id: 'SKF-6208', code: '6208', brand: 'SKF', type: 'bearing', subtype: 'deep-groove', d: 40, D: 80, B: 18, priceUSD: 16.20, speedRating: 9000, loadRating: 30700, weight: 0.370, origin: 'Sweden', seal: 'Open', clearance: 'C0', image: 'bearing' },
    { id: 'SKF-6305', code: '6305', brand: 'SKF', type: 'bearing', subtype: 'deep-groove', d: 25, D: 62, B: 17, priceUSD: 12.50, speedRating: 11000, loadRating: 22500, weight: 0.210, origin: 'Sweden', seal: 'Open', clearance: 'C0', image: 'bearing' },
    
    // Spherical Roller Bearings
    { id: 'SKF-22220', code: '22220E', brand: 'SKF', type: 'bearing', subtype: 'spherical', d: 100, D: 180, B: 46, priceUSD: 185.00, speedRating: 3600, loadRating: 430000, weight: 4.750, origin: 'Sweden', seal: 'Open', clearance: 'C0', image: 'bearing' },
    { id: 'FAG-22220', code: '22220E1', brand: 'FAG', type: 'bearing', subtype: 'spherical', d: 100, D: 180, B: 46, priceUSD: 195.00, speedRating: 3600, loadRating: 425000, weight: 4.750, origin: 'Germany', seal: 'Open', clearance: 'C0', image: 'bearing' },
    { id: 'SKF-22320', code: '22320E', brand: 'SKF', type: 'bearing', subtype: 'spherical', d: 100, D: 215, B: 73, priceUSD: 345.00, speedRating: 2800, loadRating: 690000, weight: 11.800, origin: 'Sweden', seal: 'Open', clearance: 'C0', image: 'bearing' },
    { id: 'NTN-22220', code: '22220BD1', brand: 'NTN', type: 'bearing', subtype: 'spherical', d: 100, D: 180, B: 46, priceUSD: 165.00, speedRating: 3600, loadRating: 420000, weight: 4.750, origin: 'Japan', seal: 'Open', clearance: 'C0', image: 'bearing' },

    // Linear Guides
    { id: 'HIWIN-MGN12H', code: 'MGN12H', brand: 'HIWIN', type: 'linear', subtype: 'miniature', d: 12, D: 27, B: 10, priceUSD: 28.00, speedRating: 3000, loadRating: 3900, weight: 0.045, origin: 'Taiwan', seal: 'Sealed', clearance: 'Standard', image: 'linear' },
    { id: 'HIWIN-HGH20CA', code: 'HGH20CA', brand: 'HIWIN', type: 'linear', subtype: 'standard', d: 20, D: 44, B: 30, priceUSD: 65.00, speedRating: 2000, loadRating: 17200, weight: 0.250, origin: 'Taiwan', seal: 'Sealed', clearance: 'Standard', image: 'linear' },
    { id: 'THK-SSR15XV', code: 'SSR15XV', brand: 'THK', type: 'linear', subtype: 'standard', d: 15, D: 34, B: 24, priceUSD: 85.00, speedRating: 2500, loadRating: 8900, weight: 0.120, origin: 'Japan', seal: 'Sealed', clearance: 'Standard', image: 'linear' },
    { id: 'SKF-LM12UU', code: 'LM12UU', brand: 'SKF', type: 'linear', subtype: 'bushing', d: 12, D: 21, B: 30, priceUSD: 8.50, speedRating: 2000, loadRating: 450, weight: 0.030, origin: 'Sweden', seal: 'Sealed', clearance: 'Standard', image: 'linear' },

    // Couplings
    { id: 'ROTEX-28', code: 'ROTEX28', brand: 'KTR', type: 'coupling', subtype: 'jaw', d: 28, D: 65, B: 35, priceUSD: 45.00, speedRating: 8000, loadRating: 120, weight: 0.450, origin: 'Germany', seal: 'N/A', clearance: 'N/A', image: 'coupling' },
    { id: 'ROTEX-38', code: 'ROTEX38', brand: 'KTR', type: 'coupling', subtype: 'jaw', d: 38, D: 80, B: 45, priceUSD: 68.00, speedRating: 6500, loadRating: 240, weight: 0.850, origin: 'Germany', seal: 'N/A', clearance: 'N/A', image: 'coupling' },
    { id: 'OLDHAM-20', code: 'OCC20', brand: 'RULAND', type: 'coupling', subtype: 'oldham', d: 20, D: 44, B: 18, priceUSD: 35.00, speedRating: 5000, loadRating: 85, weight: 0.120, origin: 'USA', seal: 'N/A', clearance: 'N/A', image: 'coupling' },
    { id: 'BELLOWS-25', code: 'BWC-25', brand: 'MIKI PULLEY', type: 'coupling', subtype: 'bellows', d: 25, D: 50, B: 55, priceUSD: 125.00, speedRating: 15000, loadRating: 65, weight: 0.180, origin: 'Japan', seal: 'N/A', clearance: 'N/A', image: 'coupling' },

    // Gearboxes
    { id: 'NEMA23-5', code: 'PL60-5', brand: 'APEX', type: 'gearbox', subtype: 'planetary', d: 60, D: 60, B: 85, priceUSD: 220.00, speedRating: 4000, loadRating: 35, weight: 1.200, origin: 'Taiwan', seal: 'Sealed', clearance: 'Backlash <8arcmin', image: 'gearbox' },
    { id: 'NEMA34-10', code: 'PL90-10', brand: 'APEX', type: 'gearbox', subtype: 'planetary', d: 90, D: 90, B: 120, priceUSD: 380.00, speedRating: 3500, loadRating: 80, weight: 2.800, origin: 'Taiwan', seal: 'Sealed', clearance: 'Backlash <8arcmin', image: 'gearbox' },
    { id: 'WORM-40', code: 'NMRV040', brand: 'MOTOVARIO', type: 'gearbox', subtype: 'worm', d: 40, D: 97, B: 78, priceUSD: 95.00, speedRating: 1400, loadRating: 25, weight: 2.400, origin: 'Italy', seal: 'Sealed', clearance: 'N/A', image: 'gearbox' },

    // Real represented brands (Ringspann, HKT, TSUBAKI, SNR, Timken, Flender, ASAHI)
    { id: 'RINGSPANN-FN', code: 'RSF60', brand: 'Ringspann', type: 'coupling', subtype: 'freewheel', d: 60, D: 110, B: 36, priceUSD: 240.00, speedRating: 3000, loadRating: 320, weight: 1.800, origin: 'Germany', seal: 'N/A', clearance: 'N/A', image: 'coupling' },
    { id: 'HKT-6204', code: '6204ZZ', brand: 'HKT', type: 'bearing', subtype: 'deep-groove', d: 20, D: 47, B: 14, priceUSD: 4.20, speedRating: 14000, loadRating: 12800, weight: 0.106, origin: 'Korea', seal: 'ZZ', clearance: 'C0', image: 'bearing' },
    { id: 'HKT-6306', code: '6306', brand: 'HKT', type: 'bearing', subtype: 'deep-groove', d: 30, D: 72, B: 19, priceUSD: 6.80, speedRating: 11000, loadRating: 27000, weight: 0.350, origin: 'Korea', seal: 'Open', clearance: 'C0', image: 'bearing' },
    { id: 'TSUBAKI-CH80', code: 'RS80', brand: 'TSUBAKI', type: 'coupling', subtype: 'chain', d: 80, D: 120, B: 45, priceUSD: 55.00, speedRating: 1000, loadRating: 180, weight: 1.200, origin: 'Japan', seal: 'N/A', clearance: 'N/A', image: 'coupling' },
    { id: 'SNR-6203', code: '6203', brand: 'SNR', type: 'bearing', subtype: 'deep-groove', d: 17, D: 40, B: 12, priceUSD: 3.50, speedRating: 15000, loadRating: 9500, weight: 0.066, origin: 'France', seal: 'Open', clearance: 'C0', image: 'bearing' },
    { id: 'TIMKEN-30205', code: '30205', brand: 'Timken', type: 'bearing', subtype: 'tapered', d: 25, D: 52, B: 16, priceUSD: 7.90, speedRating: 9000, loadRating: 32000, weight: 0.180, origin: 'USA', seal: 'Open', clearance: 'C0', image: 'bearing' },
    { id: 'FLENDER-BIP', code: 'BIP 140', brand: 'Flender', type: 'gearbox', subtype: 'bevel', d: 140, D: 140, B: 200, priceUSD: 1450.00, speedRating: 1500, loadRating: 450, weight: 45.000, origin: 'Germany', seal: 'Sealed', clearance: 'Backlash <5arcmin', image: 'gearbox' },
    { id: 'ASAHI-UCP205', code: 'UCP205', brand: 'ASAHI', type: 'bearing', subtype: 'pillow-block', d: 25, D: 70, B: 36, priceUSD: 9.50, speedRating: 8000, loadRating: 14000, weight: 0.700, origin: 'Japan', seal: 'Sealed', clearance: 'C0', image: 'bearing' },
    { id: 'ASAHI-UCP204', code: 'UCP204', brand: 'ASAHI', type: 'bearing', subtype: 'pillow-block', d: 20, D: 60, B: 32, priceUSD: 7.20, speedRating: 9000, loadRating: 11000, weight: 0.550, origin: 'Japan', seal: 'Sealed', clearance: 'C0', image: 'bearing' }
];

const SUFFIX_EQUIVALENTS = [
    { group: 'seal-double', labelFa: 'دو طرفه سیل', labelEn: 'Double seal', values: ['2RS','2RS1','2RSR','DDU','LLU','EE','2RSH','PP'] },
    { group: 'shield', labelFa: 'دو طرفه شیلد', labelEn: 'Shielded', values: ['2Z','ZZ','Z','2ZR','DD','FF'] },
    { group: 'low-friction-seal', labelFa: 'سیل تماس کم', labelEn: 'Low friction seal', values: ['2RZ','2RZ1','VV','LLB'] },
    { group: 'taper-12', labelFa: 'سوراخ مخروطی ۱:۱۲', labelEn: 'Tapered bore 1:12', values: ['K'] },
    { group: 'taper-30', labelFa: 'سوراخ مخروطی ۱:۳۰', labelEn: 'Tapered bore 1:30', values: ['K30'] },
    { group: 'brass-cage', labelFa: 'کیج برنجی', labelEn: 'Brass cage', values: ['M','MA','MB'] },
    { group: 'polyamide-cage', labelFa: 'کیج پلی‌آمید', labelEn: 'Polyamide cage', values: ['TN9','TN','TVP','P'] },
    { group: 'steel-cage', labelFa: 'کیج فولادی', labelEn: 'Steel cage', values: ['J'] },
    { group: 'clearance', labelFa: 'کلیرنس', labelEn: 'Clearance', values: ['C2','C3','C4','C5'], filterOnly: true }
];

// Derived fields for every product. Called once from 17-init.js, so helpers that live
// in later files (normalizePartCodeDisplay) already exist when this runs.
let productDatabaseHydrated = false;
function hydrateProductDatabase() {
    if (productDatabaseHydrated) return;
    productDatabaseHydrated = true;
    ProductDatabase.forEach((product, index) => {
        const stockPlan = [
            ['in-stock', 8, 'ارسال امروز'], ['on-order', 0, '۲ تا ۴ هفته'], ['inquiry', 0, 'استعلام'],
            ['in-stock', 3, 'ارسال امروز'], ['on-order', 0, '۳ تا ۵ هفته']
        ][index % 5];
        product.code = normalizePartCodeDisplay(product.code);
        product.stockStatus = stockPlan[0];
        product.stock = stockPlan[1];
        product.sell_mode = product.stockStatus === 'in-stock' ? 'instant' : 'quote';
        product.stock_on_hand = product.stock;
        product.stock_reserved = 0;
        product.available_to_sell = Math.max(0, product.stock_on_hand - product.stock_reserved);
        product.unit_price_toman = Math.round(product.priceUSD * AppState.exchangeRate * (1 + AppState.profitMargin / 100));
        product.pricing_updated_at = new Date().toISOString();
        product.package_length_cm = Math.max(8, Math.ceil(product.D / 10) + 6);
        product.package_width_cm = Math.max(8, Math.ceil(product.D / 10) + 6);
        product.package_height_cm = Math.max(5, Math.ceil(product.B / 10) + 4);
        product.lead_time_days = product.sell_mode === 'instant' ? 1 : 21;
        product.tax_class = 'standard';
        const cageOptions = ['Steel', 'Brass', 'Polyamide'];
        const lubricationOptions = ['Grease', 'Oil', 'Dry'];
        const accuracyOptions = ['P0', 'P6', 'P5', 'P4'];
        product.cageType = product.type === 'bearing' ? cageOptions[index % cageOptions.length] : 'N/A';
        product.sealType = product.seal || 'Open';
        product.lubrication = product.type === 'bearing' || product.type === 'linear' ? lubricationOptions[index % lubricationOptions.length] : 'N/A';
        product.internalClearance = product.clearance || 'C0';
        product.accuracyClass = product.type === 'bearing' || product.type === 'linear' ? accuracyOptions[index % accuracyOptions.length] : 'N/A';
        product.leadTimeFa = stockPlan[2];
        product.searchMeta = { equivalent: false, suffixMatch: '' };
    });
}

// Brand Information
const BrandInfo = {
    'SKF': { country: 'Sweden', logo: 'SKF', color: 'blue', description: 'World leader in bearing technology, seals, mechatronics, and lubrication systems.' },
    'FAG': { country: 'Germany', logo: 'FAG', color: 'green', description: 'Part of Schaeffler Group. Premium German engineering for industrial bearings.' },
    'NSK': { country: 'Japan', logo: 'NSK', color: 'red', description: 'Japanese precision bearings for automotive and industrial applications.' },
    'NTN': { country: 'Japan', logo: 'NTN', color: 'purple', description: 'Global manufacturer of bearings, constant-velocity joints, and precision equipment.' },
    'INA': { country: 'Germany', logo: 'INA', color: 'teal', description: 'Schaeffler brand specializing in needle bearings and linear technology.' },
    'ZWZ': { country: 'China', logo: 'ZWZ', color: 'gray', description: 'Largest bearing manufacturer in China. Cost-effective solutions.' },
    'HIWIN': { country: 'Taiwan', logo: 'HIWIN', color: 'orange', description: 'Leading manufacturer of linear motion components and industrial robots.' },
    'THK': { country: 'Japan', logo: 'THK', color: 'indigo', description: 'Pioneer of linear motion systems. LM Guide inventor.' },
    'KTR': { country: 'Germany', logo: 'KTR', color: 'pink', description: 'Premium couplings, clamping sets, and brake systems.' },
    'APEX': { country: 'Taiwan', logo: 'APEX', color: 'cyan', description: 'Precision planetary gearboxes for automation.' },
    'Ringspann': { country: 'Germany', logo: 'RINGSPANN', color: 'rose', description: 'Exclusive agency. Freewheel clutches, clamping sets, and braking systems.' },
    'HKT': { country: 'Korea', logo: 'HKT', color: 'emerald', description: 'Exclusive agency in Iran. High-quality Korean bearings for all industries.' },
    'TSUBAKI': { country: 'Japan', logo: 'TSUBAKI', color: 'yellow', description: 'Exclusive agency. Industrial chains, power transmission, and motion control.' },
    'SNR': { country: 'France', logo: 'SNR', color: 'lime', description: 'French bearing manufacturer. Automotive and industrial roller bearings.' },
    'Timken': { country: 'USA', logo: 'TIMKEN', color: 'slate', description: 'Global leader in tapered roller bearings and power transmission.' },
    'Flender': { country: 'Germany', logo: 'FLENDER', color: 'amber', description: 'Gear units, couplings, and drive solutions for heavy industry.' },
    'ASAHI': { country: 'Japan', logo: 'ASAHI', color: 'violet', description: 'Pillow block bearings (UCP/UCT series) for shaft support applications.' }
};
