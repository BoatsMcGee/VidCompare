# Testing — VidCompare

This document describes the complete testing strategy for VidCompare, covering all layers from unit tests to visual regression.

---

## Test Layers Overview

| Layer | Tool | Command | Coverage Gate |
|-------|------|---------|---------------|
| **Unit / Component** | Vitest + @testing-library/svelte | `npm test` | Lines 80%, Functions 80%, Branches 70% |
| **Accessibility** | axe-core (JSDOM) | `npm test` | 0 violations on main components |
| **Type Checking** | svelte-check + tsc | `npm run check` | Zero errors |
| **E2E (Browser)** | WebdriverIO + Chrome (mocked IPC) | `E2E_MODE=browser npm run e2e` | Smoke tests, no display needed |
| **E2E (Native)** | WebdriverIO + tauri-driver | `npm run e2e` | Real Tauri binary, requires display |
| **Screenshots** | WebdriverIO + tauri-driver + pixelmatch | `npm run screenshots` / `npm run screenshots:compare` | 7 views at 2× DPI, regression threshold 1% |

---

## 1. Unit & Component Tests (Vitest)

**Location:** `src/**/*.test.ts`, `src/**/*.test.tsx`

**Run:**
```bash
npm test              # All tests (166 tests as of M10/M11)
npm run test:coverage # With coverage report
```

**Configuration:** `vite.config.ts` → `test` block
- Environment: `jsdom`
- Setup: `src/lib/test-setup.ts` (global test utils, mocks)
- Coverage: `@vitest/coverage-v8` with thresholds (lines 80%, functions 80%, branches 70%)

**Key patterns:**
- Mock Tauri IPC via `vi.mock('../ipc')` and `vi.mock('@tauri-apps/plugin-dialog')`
- Use `resetAppState()` from `src/lib/test-utils.ts` for clean profile state
- Component tests render with `@testing-library/svelte`

**Accessibility tests (12 new in M7):**
- Shared helper: `src/lib/test-a11y.ts` → `expectNoAxeViolations()`
- Components covered: `FilePanel` (3), `OptionsForm` (3), `PresetsBar` (2), `ActiveChips` (1), `ThemeToggle` (1), `FindHelperDialog` (2)
- Real a11y bugs fixed: label associations, ARIA roles, keyboard handling

---

## 2. Type Checking

**Run:**
```bash
npm run check
```

Executes:
- `svelte-check --tsconfig ./tsconfig.app.json` (Svelte + TypeScript)
- `tsc -p tsconfig.node.json --types node,vitest/config` (Node/Config TypeScript)

Must pass with zero errors before merge.

---

## 3. E2E Tests (WebdriverIO)

**Configuration:** `tests/e2e/wdio.conf.ts`

### Dual-Mode Architecture

| Mode | Use Case | Display | Tauri Binary | IPC |
|------|----------|---------|--------------|-----|
| **browser** | CI smoke tier, fast feedback | ❌ Headless Chrome | ❌ Vite dev server | Mocked at JS boundary |
| **native** | Full integration, screenshots | ✅ Required (xvfb on Linux) | ✅ `cargo build --release` | Real Tauri commands |

**Switch mode:**
```bash
# Browser mode (default for CI smoke)
E2E_MODE=browser npm run e2e

# Native mode (requires built binary + tauri-driver + display)
npm run e2e
```

### Browser Mode Details
- Starts Vite dev server on port 1420 (managed by the service; cold Vite
  caches can exceed 60s to first-ready, so the readiness timeout is 180s)
- Mocks `load_settings` and `resolve_binary` in the spec's `before()` —
  which runs after page load, so the app must tolerate rejected startup
  IPC (see `App.svelte` `onMount`); the mocks cover later re-invocations
- Runs in headless Chrome — no Rust build, no display needed
- Tests: `tests/e2e/app.e2e.ts` (window title skipped, UI assertions only)

### Native Mode Details
- Launches compiled `src-tauri/target/release/vidcompare` via tauri-driver
- Requires: `tauri-driver` on PATH (or `TAURI_DRIVER_PATH`), display server
- Requires the `tauri-plugin-wdio` Rust crate registered in `src-tauri/src/lib.rs`
  plus `import '@wdio/tauri-plugin'` in `src/main.ts` (with the `wdio:default`
  capability) — without it the service cannot execute JS or read window state
  and every test times out
- Linux CI: `xvfb-run -a --server-args="-screen 0 1920x1080x24"` with
  `WEBKIT_DISABLE_DMABUF_RENDERER=1` and `WEBKIT_DISABLE_COMPOSITING_MODE=1`
  (WebKitGTK ≥2.42 renders a blank webview under Xvfb without them —
  tauri-apps/tauri#15936, #9304)
- `captureBackendLogs`/`captureFrontendLogs` are enabled in native mode so app
  and webview stderr land in the CI log (a dead webview is otherwise silent)
- Windows/macOS: Native display works directly
- Tests: Same file, but window title assertion runs

### Prerequisites (Native)
```bash
# 1. Build Tauri app
cd src-tauri && cargo build --release

# 2. Install tauri-driver
cargo install tauri-driver --locked

# 3. Linux: install Tauri deps + xvfb (same set as the CI composite
#    action .github/actions/setup-linux-tauri/action.yml)
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev webkit2gtk-driver xvfb

# 4. Headless Linux only: force WebKitGTK software rendering, otherwise the
#    webview stays blank under Xvfb (no GPU)
export WEBKIT_DISABLE_DMABUF_RENDERER=1 WEBKIT_DISABLE_COMPOSITING_MODE=1
```

---

## 4. Screenshot Pipeline

### Capture (`tests/screenshots/capture.mjs`)

**Run:**
```bash
npm run screenshots
```

**What it does:**
1. Checks prerequisites (binary, tauri-driver, display) — exits 0 with message if missing (CI-friendly)
2. Launches Tauri app via WebdriverIO + tauri-driver
3. Sets window to 1920×1080 (2× DPI base 960×540)
4. Captures 7 screenshots matching website manifest:

| File | State |
|------|-------|
| `main-window-light.png` | Main window, light theme |
| `main-window-dark.png` | Main window, dark theme |
| `file-panels.png` | File panels with fixture media |
| `options-groups.png` | Options groups expanded, L/R columns |
| `log-panel.png` | Output panel with sample sidecar output |
| `presets-bar.png` | Presets bar |
| `find-helper-dialog.png` | Find-helper dialog for custom binary |

**Output:** `tests/screenshots/current/*.png`

### Compare (`tests/screenshots/compare.mjs`)

**Run:**
```bash
npm run screenshots:compare           # Compare, exit 1 on mismatch
npm run screenshots:compare --update  # Refresh baselines from current
npm run screenshots:compare --threshold=0.02  # Custom threshold (default 1%)
```

**What it does:**
- Compares `tests/screenshots/current/*.png` vs `tests/screenshots/baseline/*.png`
- Uses `pixelmatch` with configurable threshold (default 0.01 = 1%)
- On mismatch: saves diff images to `tests/screenshots/diff/*.png`, exits 1
- On match: cleans up diff directory, exits 0
- `--update` copies current → baseline (use when UI intentionally changes)

**Baseline management:**
- Baselines stored in `tests/screenshots/baseline/` (gitignored, committed via CI artifact or manual workflow)
- Website consumes from `website/static/screenshots/` (populated by CI from artifacts)

---

## 5. CI Workflows

### `.github/workflows/ci.yml` (Existing)
- Lint, type-check, unit tests, coverage, build on every push/PR
- Rust: fmt, clippy, test
- Build matrix: Windows, Linux, macOS

### `.github/workflows/e2e.yml` (New in M7)

| Job | Mode | Display | Purpose |
|-----|------|---------|---------|
| `e2e-browser` | Browser | ❌ | Fast smoke tests on every push/PR |
| `e2e-native` | Native | ✅ (xvfb) | Full integration tests |
| `screenshots` | Native | ✅ (xvfb) | Capture + regression compare (needs e2e-native) |
| `screenshots-update` | Native | ✅ (xvfb) | **Manual dispatch** to refresh baselines |

**Key CI notes:**
- `e2e-browser` runs on every push/PR (no display needed)
- `e2e-native` + `screenshots` require xvfb-run — clearly marked in workflow
- `screenshots-update` is `workflow_dispatch` only — run manually when design changes
- Artifacts uploaded: `screenshots-current`, `screenshots-diff` (on failure), `screenshots-baseline` (on update)

---

## 6. Local Development Workflow

### Quick Feedback Loop
```bash
# Type-check + unit tests (fast)
npm run check && npm test

# Browser-mode E2E (no Rust build, no display)
E2E_MODE=browser npm run e2e
```

### Full Native Test (requires display)
```bash
# 1. Build Rust
cd src-tauri && cargo build --release

# 2. Install tauri-driver (once)
cargo install tauri-driver --locked

# 3. Run native E2E
# Linux:
xvfb-run -a --server-args="-screen 0 1920x1080x24" npm run e2e
# Windows/macOS:
npm run e2e
```

### Screenshots Locally
```bash
# Capture (needs native prerequisites)
npm run screenshots

# Compare against committed baselines
npm run screenshots:compare

# Update baselines after intentional UI changes
npm run screenshots:compare --update
# Then commit tests/screenshots/baseline/*.png
```

### Copy to Website for Preview
```powershell
Copy-Item tests\screenshots\current\*.png website\static\screenshots\
```

---

## 7. Troubleshooting

| Issue | Solution |
|-------|----------|
| `tauri-driver not found` | `cargo install tauri-driver --locked` or set `TAURI_DRIVER_PATH` |
| `No display` (Linux) | Run under `xvfb-run -a --server-args="-screen 0 1920x1080x24"` |
| Blank/white window under xvfb (native E2E/screenshots) | Set `WEBKIT_DISABLE_DMABUF_RENDERER=1` and `WEBKIT_DISABLE_COMPOSITING_MODE=1` — WebKitGTK ≥2.42 software rendering on headless CI (tauri-apps/tauri#15936, #9304) |
| `Binary not found` | `cd src-tauri && cargo build --release` |
| Screenshot mismatch | Check `tests/screenshots/diff/*.png`; run `--update` if intentional |
| Coverage below threshold | Add tests for uncovered lines/branches/functions |
| `svelte-check` errors | Fix TypeScript/Svelte issues in `src/` |

---

## 8. Adding New Tests

1. **Unit/Component:** Create `ComponentName.test.ts` next to component; use `render()` from `@testing-library/svelte`
2. **Accessibility:** Add `ComponentName.a11y.test.ts` importing `expectNoAxeViolations` from `../lib/test-a11y`
3. **E2E:** Add test cases to `tests/e2e/app.e2e.ts` (works in both modes)
4. **Screenshots:** Add entry to `SHOTS` array in `capture.mjs` + `EXPECTED_FILES` in `compare.mjs` + website README

---

## 9. Quality Gates Summary (CI)

All must pass on PR to main:

- ✅ `cargo fmt --check`
- ✅ `cargo clippy -D warnings`
- ✅ `cargo test` (Rust)
- ✅ `npm run check` (svelte-check + tsc)
- ✅ `npm test` (Vitest, 166 tests)
- ✅ `npm run test:coverage` (thresholds met)
- ✅ `npm run build` (Vite + Tauri bundle)
- ✅ `E2E_MODE=browser npm run e2e` (smoke)
- ✅ `e2e-native` + `screenshots` (on Linux with display)

Weekly: `cargo audit` + `npm audit` (via `audit.yml`)
