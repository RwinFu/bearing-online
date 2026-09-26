/* ESLint flat config for Bearing Online.
 * The site is a set of classic (non-module) scripts sharing globals, with the
 * page sections also wired through inline HTML event handlers. The config
 * therefore declares the project's real global surface instead of pretending
 * every file is an isolated module.
 */
const fs = require('node:fs');
const path = require('node:path');

// The site's 19 classic scripts share ONE global scope. tools/quality/gen-globals.js
// extracts that surface with a real parser; without it every cross-file reference
// would show up as a false `no-undef`. Regenerate with: node tools/quality/gen-globals.js
const sharedGlobals = (() => {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'tools/quality/.globals.json'), 'utf8'));
        return Object.fromEntries(data.globals.map(g => [g, 'writable']));
    } catch {
        // Not generated yet — fall back to browser globals only rather than
        // failing the whole lint run.
        return {};
    }
})();

const GLOBALS = {
    // browser
    window: 'readonly', document: 'readonly', location: 'writable', history: 'readonly',
    navigator: 'readonly', console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
    setInterval: 'readonly', clearInterval: 'readonly', requestAnimationFrame: 'readonly',
    cancelAnimationFrame: 'readonly', performance: 'readonly', fetch: 'readonly',
    localStorage: 'readonly', sessionStorage: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
    MutationObserver: 'readonly', IntersectionObserver: 'readonly', ResizeObserver: 'readonly',
    Event: 'readonly', CustomEvent: 'readonly', Blob: 'readonly', FileReader: 'readonly',
    matchMedia: 'readonly', getComputedStyle: 'readonly', requestIdleCallback: 'readonly',
    crypto: 'readonly', Intl: 'readonly', TextEncoder: 'readonly', TextDecoder: 'readonly',
    confirm: 'readonly', alert: 'readonly', prompt: 'readonly', print: 'readonly',
    CSS: 'readonly', CSSRule: 'readonly', FontFace: 'readonly', Image: 'readonly',
    DOMParser: 'readonly', XMLSerializer: 'readonly', FormData: 'readonly', Blob: 'readonly',
    File: 'readonly', FileReader: 'readonly', AbortController: 'readonly', AbortSignal: 'readonly',
    structuredClone: 'readonly', queueMicrotask: 'readonly', scrollTo: 'readonly', scrollBy: 'readonly',
    innerWidth: 'readonly', innerHeight: 'readonly', scrollY: 'readonly', scrollX: 'readonly',
    devicePixelRatio: 'readonly', speechSynthesis: 'readonly', SpeechSynthesisUtterance: 'readonly',
    Notification: 'readonly', indexedDB: 'readonly', atob: 'readonly', btoa: 'readonly',
    open: 'readonly', close: 'readonly', focus: 'readonly', blur: 'readonly', name: 'readonly',
    self: 'readonly', top: 'readonly', parent: 'readonly', frames: 'readonly', origin: 'readonly',
    // third-party, loaded from assets/vendor before the app scripts
    THREE: 'readonly', tailwind: 'readonly', module: 'writable', require: 'readonly',
    __dirname: 'readonly', process: 'readonly', exports: 'writable'
};

module.exports = [
    {
        files: ['assets/js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: { ...GLOBALS, ...sharedGlobals }
        },
        rules: {
            'no-undef': 'error',
            // Top-level functions are this project's public surface: they are called
            // from inline handlers in index.html and from template literals in other
            // files, neither of which ESLint can see. Only local variables are
            // reported as unused.
            'no-unused-vars': ['warn', { args: 'none', vars: 'local', caughtErrors: 'none', varsIgnorePattern: '^_' }],
            'no-redeclare': 'error',
            'no-dupe-keys': 'error',
            'no-dupe-args': 'error',
            'no-dupe-class-members': 'error',
            'no-cond-assign': 'error',
            'no-constant-condition': ['error', { checkLoops: false }],
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-implied-eval': 'error',
            'no-self-assign': 'error',
            'no-self-compare': 'error',
            'no-unreachable': 'error',
            'no-unsafe-negation': 'error',
            'no-useless-escape': 'warn',
            'use-isnan': 'error',
            'valid-typeof': 'error',
            'no-fallthrough': 'error',
            'eqeqeq': ['warn', 'smart'],
            'no-var': 'off'
        }
    },
    {
        // Classic scripts share one global scope; a name declared in one file is
        // deliberately visible to the others.
        files: ['assets/js/**/*.js'],
        rules: { 'no-redeclare': 'off' }
    },
    {
        files: ['tools/**/*.js', 'eslint.config.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: { ...GLOBALS, require: 'readonly', module: 'writable', process: 'readonly', __dirname: 'readonly', Buffer: 'readonly' }
        },
        rules: { 'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none' }], 'no-empty': ['warn', { allowEmptyCatch: true }] }
    },
    {
        files: ['tools/smoke-test/**/*.js', 'tools/audit/**/*.js'],
        languageOptions: { globals: { ...GLOBALS, Page: 'readonly', ...GLOBALS } }
    },
    { ignores: ['node_modules/**', 'tools/*/node_modules/**', 'assets/vendor/**', 'docs/**', '.arena/**'] }
];
