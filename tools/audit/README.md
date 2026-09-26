# tools/audit — deep browser audits

Dev-only Playwright suite used to find the problems this branch fixes. **None of this
ships with the site** — the site itself stays buildless and dependency-free; everything
here lives under `tools/` and pulls its own `node_modules`.

## Running

The site must be served first (any static server on the repo root), then:

```bash
cd tools/audit
npm install                                     # playwright + @axe-core/playwright
LD_LIBRARY_PATH=/tmp/chr/libs/lib \
CHROMIUM_EXECUTABLE_PATH=/tmp/chr/browser/chromium \
BASE_URL=http://127.0.0.1:8080 node <script>.js
```

`CHROMIUM_EXECUTABLE_PATH` is optional — without it Playwright uses its own download.
Results are written to `.arena/audit/*.json` (git-ignored) and screenshots to
`.arena/browser-audit/`.

## The scripts

| Script | What it answers |
| --- | --- |
| `audit.js` | Broad sweep: page inventory, console errors, axe accessibility (wcag2a/aa/21a/aa). |
| `dead-controls.js` | Clicks every visible control on all 12 pages and fingerprints the app before/after. Reports controls that throw, call undefined globals, do nothing, or force a full reload. |
| `dead-css.js` | Extracts every class/id selector declared in `assets/css/*.css`, then looks for each one in `index.html`, in the HTML the JS builds, and in the live DOM of every page state. |
| `stateful-audit.js` | Walks 19 UI states (cart, checkout, account tabs, admin panels, modals) looking for JS errors and broken states that only appear after interaction. |
| `coverage-audit.js` | CDP function-coverage walkthrough — which of the 640 functions actually execute during a full user journey. |
| `motion-audit.js` | Frame rate and long-frame counts per page (relative comparison only; SwiftShader numbers are not real hardware). |
| `reduced-motion-audit.js` | Re-runs the page states with `prefers-reduced-motion: reduce`. |
| `loop-attribution.js` | Attributes idle `requestAnimationFrame` / `setInterval` traffic to the callbacks that cause it. |
| `reflow-audit.js` | Counts forced layout (`getBoundingClientRect`) and forced style (`getComputedStyle`) reads per second per page. |
| `overflow-repro.js` | Horizontal-overflow detector: walks page states and widths, reports `scrollWidth > innerWidth`. |
| `cursor-proof.js` | Regression guard for the desktop invisible-pointer bug — asserts the native cursor is restored and no stylesheet hides it. |
| `rm-probe.js` | Asserts the wordmark canvas loop parks under `prefers-reduced-motion` while still painting its static frame. |

## Baseline (this branch)

- `dead-controls.js` → **0 problems** across 686 controls on 12 pages
- `dead-css.js` → 55 unused selectors (proposed for removal, awaiting sign-off)
- `reflow-audit.js` → home idle **0** rect + **0** style reads/s (was 785 + 1047)
- `cursor-proof.js` → `bodyCursor: "auto"`, `hidesPointerOnDesktop: false`
- `rm-probe.js` → reduced motion: `wordmarksRunning: false`, canvas still painted

Scratch probes written while chasing individual bugs are deliberately **not** committed;
they are throwaway and get deleted once the bug is understood.
