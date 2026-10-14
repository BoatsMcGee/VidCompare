#!/usr/bin/env node
/**
 * VidCompare screenshot capture script.
 *
 * Two modes, selected with the SCREENSHOT_MODE environment variable:
 *
 * - `browser` (default): runs the Svelte frontend in headless Chrome against
 *   the Vite dev server with Tauri IPC mocked at the JS boundary. No Rust
 *   build, no tauri-driver, no display needed. Used by CI.
 *
 * - `native`: launches the compiled Tauri binary through tauri-driver.
 *   Requires a built binary (`cargo build --release` in src-tauri) plus
 *   tauri-driver on PATH and a display server. Used for local captures that
 *   must match the real app chrome exactly.
 *
 * Both modes capture the same 30 screenshots (15 subjects × light/dark) at
 * 2× DPI matching the exact filenames expected by the website
 * (website/static/screenshots/README.md).
 *
 * Usage:
 *   node tests/screenshots/capture.mjs [--help]
 *   SCREENSHOT_MODE=native node tests/screenshots/capture.mjs
 *
 * Output: tests/screenshots/current/*.png (30 files)
 */

import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { remote } from 'webdriverio';
import { startWdioSession, cleanupWdioSession } from '@wdio/tauri-service';
import { createIpcInterceptor } from '@wdio/native-spy/interceptor';

/** Browser-mode IPC interceptor, straight from @wdio/native-spy — the same
 * script the tauri-service injects in its browser mode. It sets up
 * window.__wdio_spy__ / __wdio_mocks__ and patches
 * window.__TAURI_INTERNALS__.invoke to route through the mock store. */
const INTERCEPTOR_SCRIPT = createIpcInterceptor('tauri').buildBrowserIpcInjectionScript();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');
const SCREENSHOTS_DIR = join(ROOT, 'tests', 'screenshots');
const CURRENT_DIR = join(SCREENSHOTS_DIR, 'current');

const MODE = (process.env.SCREENSHOT_MODE ?? 'browser');
const isBrowser = MODE === 'browser';

const SHOTS = [
  { name: 'main-window-light.png', theme: 'light', setup: null },
  { name: 'main-window-dark.png', theme: 'dark', setup: null },
  { name: 'file-panels-light.png', theme: 'light', setup: 'populate-files' },
  { name: 'file-panels-dark.png', theme: 'dark', setup: 'populate-files' },
  { name: 'options-groups-light.png', theme: 'light', setup: 'expand-options' },
  { name: 'options-groups-dark.png', theme: 'dark', setup: 'expand-options' },
  { name: 'log-panel-light.png', theme: 'light', setup: 'show-log' },
  { name: 'log-panel-dark.png', theme: 'dark', setup: 'show-log' },
  { name: 'presets-bar-light.png', theme: 'light', setup: 'show-presets' },
  { name: 'presets-bar-dark.png', theme: 'dark', setup: 'show-presets' },
  { name: 'find-helper-dialog-light.png', theme: 'light', setup: 'open-find-helper' },
  { name: 'find-helper-dialog-dark.png', theme: 'dark', setup: 'open-find-helper' },
  { name: 'compare-page-light.png', theme: 'light', setup: 'open-compare' },
  { name: 'compare-page-dark.png', theme: 'dark', setup: 'open-compare' },
  { name: 'options-quick-light.png', theme: 'light', setup: 'option-group-quick' },
  { name: 'options-quick-dark.png', theme: 'dark', setup: 'option-group-quick' },
  { name: 'options-display-light.png', theme: 'light', setup: 'option-group-display' },
  { name: 'options-display-dark.png', theme: 'dark', setup: 'option-group-display' },
  { name: 'options-playback-light.png', theme: 'light', setup: 'option-group-playback' },
  { name: 'options-playback-dark.png', theme: 'dark', setup: 'option-group-playback' },
  { name: 'options-color-light.png', theme: 'light', setup: 'option-group-color' },
  { name: 'options-color-dark.png', theme: 'dark', setup: 'option-group-color' },
  { name: 'options-filters-light.png', theme: 'light', setup: 'option-group-filters' },
  { name: 'options-filters-dark.png', theme: 'dark', setup: 'option-group-filters' },
  { name: 'options-io-light.png', theme: 'light', setup: 'option-group-io' },
  { name: 'options-io-dark.png', theme: 'dark', setup: 'option-group-io' },
  { name: 'options-scopes-light.png', theme: 'light', setup: 'option-group-scopes' },
  { name: 'options-scopes-dark.png', theme: 'dark', setup: 'option-group-scopes' },
  { name: 'options-advanced-light.png', theme: 'light', setup: 'option-group-advanced' },
  { name: 'options-advanced-dark.png', theme: 'dark', setup: 'option-group-advanced' },
];

const WIDTH = 1920;
const HEIGHT = 1080;

function printHelp() {
  console.log(`
VidCompare Screenshot Capture
=============================

Captures 30 screenshots (15 subjects × light/dark) at 2× DPI for the website gallery.

Modes (SCREENSHOT_MODE env var):
  browser (default)  Headless Chrome + Vite dev server + mocked IPC.
                     No Rust build, no tauri-driver, no display needed.
  native             Real Tauri binary via tauri-driver. Requires:
                       1. cd src-tauri && cargo build --release
                       2. cargo install tauri-driver (or TAURI_DRIVER_PATH)
                       3. Display server (xvfb-run on headless Linux)

Usage:
  node tests/screenshots/capture.mjs [--help]

Output:
  tests/screenshots/current/*.png (30 files matching website manifest)
`);
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited ${code}: ${stderr}`));
    });
    proc.on('error', reject);
  });
}

async function checkNativePrerequisites() {
  const ext = process.platform === 'win32' ? '.exe' : '';
  const binaryPath = resolve(ROOT, `src-tauri/target/release/vidcompare${ext}`);

  const missing = [];
  if (!existsSync(binaryPath)) {
    missing.push(`Tauri binary not found: ${binaryPath}\n  Fix: cd src-tauri && cargo build --release`);
  }

  let driverPath = process.env.TAURI_DRIVER_PATH;
  if (!driverPath) {
    // tauri-driver has no --version flag (unknown args exit 1), so resolve
    // the binary path the same way @wdio/tauri-service's findTauriDriver does.
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    try {
      const { stdout } = await runCommand(whichCmd, ['tauri-driver']);
      const candidate = stdout.trim().split('\n')[0].trim();
      if (candidate && existsSync(candidate)) {
        driverPath = candidate;
      }
    } catch {
      // not on PATH — fall through to common install location
    }
    if (!driverPath) {
      const cargoBin = join(process.env.HOME || process.env.USERPROFILE || '', '.cargo', 'bin', process.platform === 'win32' ? 'tauri-driver.exe' : 'tauri-driver');
      if (existsSync(cargoBin)) {
        driverPath = cargoBin;
      }
    }
    if (!driverPath) {
      missing.push('tauri-driver not found on PATH\n  Fix: cargo install tauri-driver (or set TAURI_DRIVER_PATH)');
    }
  } else if (!existsSync(driverPath)) {
    missing.push(`TAURI_DRIVER_PATH set but not found: ${driverPath}`);
  }

  // Check for display on Linux
  if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    missing.push('No display server (DISPLAY/WAYLAND_DISPLAY not set)\n  Fix: run under xvfb-run -a --server-args="-screen 0 1920x1080x24"');
  }

  return { binaryPath, driverPath, missing };
}

/**
 * Mocked IPC responses for browser mode. Plain data so it can be serialized
 * into the preload script (which runs before any page script — including the
 * app's onMount) and reused by the classic post-load fallback.
 */
const MOCK_VALUES = {
  load_settings: {
    theme: 'system',
    custom_binary_path: null,
    custom_profile_path: null,
    active_profile: null,
    recent_folders: [],
    log_level: 'info',
    portable: false,
  },
  resolve_binary: {
    path: '/usr/bin/video-compare',
    source: 'bundled',
    // Must match the embedded profile's upstream version, otherwise the
    // version-mismatch warning banner renders in every screenshot.
    version: '20261004',
  },
  list_media_files: [
    { name: 'take2.mkv', path: 'P:\\videos\\clip\\take2.mkv', size: 208 * 1024 * 1024, mtime: null, ext: 'mkv', is_video: true },
    { name: 'take2-h264.mp4', path: 'P:\\videos\\clip\\take2-h264.mp4', size: 96 * 1024 * 1024, mtime: null, ext: 'mp4', is_video: true },
    { name: 'take2-av1.mkv', path: 'P:\\videos\\clip\\take2-av1.mkv', size: 61 * 1024 * 1024, mtime: null, ext: 'mkv', is_video: true },
    { name: 'take2-prores.mov', path: 'P:\\videos\\clip\\take2-prores.mov', size: 1240 * 1024 * 1024, mtime: null, ext: 'mov', is_video: true },
    { name: 'take2.srt', path: 'P:\\videos\\clip\\take2.srt', size: 14 * 1024, mtime: null, ext: 'srt', is_video: false },
    { name: 'notes.txt', path: 'P:\\videos\\clip\\notes.txt', size: 2 * 1024, mtime: null, ext: 'txt', is_video: false },
  ],
  run_info_command: 'Available filters:\n  yadif\n  scale\n  crop\n  hstack\n  vstack\n  ...',
  describe_path: { is_dir: false },
  app_info: { version: '0.1.0', portable: false, os: 'linux', arch: 'x86_64' },
  list_profiles: [],
  fetch_profiles_index: { profiles: [] },
};

// JSON.stringify drops undefined-valued keys, so commands whose mock result
// is `undefined` (void commands) are listed explicitly.
const VOID_MOCKS = [
  'save_settings',
  // Compare page: pretend an embedded video-compare window launched so the
  // embed surface renders; the surface content is replaced with a fixture
  // image by the open-compare setup.
  'embed_launch',
  'embed_set_rect',
  'embed_release',
  'kill',
];

/** localStorage presets seeded before app load (PresetsBar reads on init). */
const PRESETS_SEED = [
  {
    name: 'H264 vs AV1',
    options: { 'display-mode': { value: 'split' } },
    left: { path: 'P:\\videos\\clip\\take2-h264.mp4' },
    rights: [{ path: 'P:\\videos\\encode-test\\take2-av1.mkv' }],
    updatedAt: 0,
  },
  {
    name: 'ProRes master',
    options: {},
    left: { path: 'P:\\videos\\clip\\take2-prores.mov' },
    rights: [],
    updatedAt: 0,
  },
];

/**
 * Build the browser-side preload script: the @wdio/native-spy IPC
 * interceptor plus registration of every mock and the localStorage preset
 * seed. Registered as a WebDriver BiDi preload script it runs after document
 * creation but before any page script — so the app's onMount IPC calls
 * (load_settings, resolve_binary, …) hit mocks instead of failing and
 * rendering the error banner.
 */
function buildPreloadScript() {
  return `(function() {
${INTERCEPTOR_SCRIPT}
  var mocks = ${JSON.stringify(MOCK_VALUES)};
  for (var cmd in mocks) {
    var mockFn = window.__wdio_spy__.fn();
    mockFn.mockName('tauri.' + cmd);
    mockFn.mockResolvedValue(mocks[cmd]);
    window.__wdio_mocks__[cmd] = mockFn;
  }
  var voidMocks = ${JSON.stringify(VOID_MOCKS)};
  for (var i = 0; i < voidMocks.length; i++) {
    var voidFn = window.__wdio_spy__.fn();
    voidFn.mockName('tauri.' + voidMocks[i]);
    voidFn.mockResolvedValue(undefined);
    window.__wdio_mocks__[voidMocks[i]] = voidFn;
  }
  try {
    localStorage.setItem('vidcompare.presets.v1', ${JSON.stringify(JSON.stringify(PRESETS_SEED))});
  } catch (e) { /* storage unavailable — presets bar renders empty */ }
})()`;
}

/**
 * Register the preload script via WebDriver BiDi so it runs before any page
 * script on every navigation. Mirrors @wdio/tauri-service's
 * registerBidiPreload: no-ops (returns false) on a non-BiDi session, and
 * swallows registration failures so the classic post-load fallback in
 * mockIpc() stays available. Returns true only when the preload is active.
 */
async function registerBidiPreload(client) {
  if (!client.isBidi) return false;
  try {
    await client.scriptAddPreloadScript({
      functionDeclaration: `() => {\n${buildPreloadScript()}\n}`,
    });
    console.log('BiDi preload registered (IPC mocked before page load)');
    return true;
  } catch (err) {
    console.warn(`BiDi preload registration failed — falling back to post-load injection: ${err.message}`);
    return false;
  }
}

/**
 * Classic fallback for non-BiDi sessions: inject the interceptor and mocks
 * via execute() after page load. The app's onMount has already run unmocked
 * at that point, so the error banner may flash — acceptable only as a
 * fallback; the preload path above is the norm on Chrome.
 */
async function mockIpc(client) {
  await client.execute(buildPreloadScript());
}

async function applyTheme(client, theme) {
  // The app uses a theme toggle button; click it to cycle to desired theme
  // Theme order: system → light → dark → system
  const themeBtn = await client.$('button[title^="Theme:"]');
  if (await themeBtn.isExisting()) {
    const currentTheme = await getCurrentTheme(client);
    const order = ['system', 'light', 'dark'];
    const targetIndex = order.indexOf(theme);
    const currentIndex = order.indexOf(currentTheme);
    const clicks = (targetIndex - currentIndex + 3) % 3;
    for (let i = 0; i < clicks; i++) {
      await themeBtn.click();
      await client.pause(200);
    }
  }
}

/** Close any modal dialog (e.g. find-helper) left open by a previous shot.
 * Clicks the overlay programmatically — its onclick closes the dialog, and
 * a synthetic Escape wouldn't reach the overlay's keydown handler when focus
 * sits on the inner dialog (which stops propagation). */
async function dismissDialogs(client) {
  const overlay = await client.$('.dialog-overlay');
  if (await overlay.isExisting()) {
    await client.execute(() => document.querySelector('.dialog-overlay')?.click());
    await client.pause(200);
  }
}

async function getCurrentTheme(client) {
  const themeBtn = await client.$('button[title^="Theme:"]');
  if (await themeBtn.isExisting()) {
    const title = await themeBtn.getAttribute('title');
    if (title?.includes('light')) return 'light';
    if (title?.includes('dark')) return 'dark';
    return 'system';
  }
  return 'system';
}

async function runSetup(client, setup) {
  if (setup?.startsWith('option-group-')) {
    await captureOptionGroup(client, setup.slice('option-group-'.length));
    return;
  }
  switch (setup) {
    case 'populate-files':
      await populateFilePanels(client);
      break;
    case 'expand-options':
      await expandOptionGroups(client);
      break;
    case 'show-log':
      await showLogPanel(client);
      break;
    case 'show-presets':
      await showPresetsBar(client);
      break;
    case 'open-find-helper':
      await openFindHelperDialog(client);
      break;
    case 'open-compare':
      await openComparePage(client);
      break;
  }
}

async function populateFilePanels(client) {
  // Type a directory path into each panel's input and commit it; the mocked
  // list_media_files returns fixture entries.
  const inputs = await client.$$('.dir-input');
  if (inputs.length >= 2) {
    await inputs[0].setValue('P:\\videos\\clip');
    await client.keys('Enter');
    await client.pause(300);
    await inputs[1].setValue('P:\\videos\\encode-test');
    await client.keys('Enter');
    await client.pause(300);
  }
}

async function expandOptionGroups(client) {
  // Click each group tab to expand
  const tabs = await client.$$('.group-tabs button');
  for (const tab of tabs) {
    await tab.click();
    await client.pause(200);
  }
}

async function captureOptionGroup(client, groupId) {
  // Click the tab whose label maps to the requested group id, then wait for
  // it to become active before the screenshot is taken. Tab labels come from
  // the profile (e.g. io → "Inputs & Decoding"), so match via the profile's
  // group list rather than assuming label == id.
  const profile = JSON.parse(readFileSync(join(ROOT, 'public', 'profiles', 'video-compare-latest.json'), 'utf8'));
  const group = profile.groups.find((g) => g.id === groupId);
  if (!group) {
    throw new Error(`Option group "${groupId}" not found in embedded profile`);
  }
  const wanted = group.label.trim().toLowerCase();
  const tabs = await client.$$('.group-tabs button');
  for (const tab of tabs) {
    const label = (await tab.getText()).trim().toLowerCase();
    if (label === wanted) {
      await tab.click();
      await client.waitUntil(
        async () => (await tab.getAttribute('class'))?.includes('active'),
        { timeout: 3000, timeoutMsg: `Group tab "${groupId}" did not activate` },
      );
      await client.pause(200);
      return;
    }
  }
  throw new Error(`Option group tab not found: ${groupId}`);
}

async function showLogPanel(client) {
  // Emit fake launch events so the log panel renders with sample output.
  // The interceptor is injected on the page before app load, but the
  // __wdio_emit_tauri_event__ function is only defined inside the IIFE —
  // we need to re-declare it here for the execute() context.
  await client.execute((lines) => {
    // Ensure the listener registry exists (the interceptor creates it, but
    // guard against timing issues).
    if (!window.__wdio_tauri_listeners__) { window.__wdio_tauri_listeners__ = {}; }
    const emitEvent = (eventName, payload, target) => {
      const bucket = window.__wdio_tauri_listeners__[eventName];
      if (!bucket) return;
      const ids = Object.keys(bucket);
      for (let i = 0; i < ids.length; i++) {
        const entry = bucket[ids[i]];
        if (!entry) continue;
        if (target !== undefined) {
          const s = typeof entry.target === 'string' ? { kind: 'AnyLabel', label: entry.target } : (entry.target || { kind: 'Any' });
          const e = typeof target === 'string' ? { kind: 'AnyLabel', label: target } : (target || { kind: 'Any' });
          if (s.kind !== 'Any' && e.kind !== 'Any' && s.kind !== e.kind) continue;
          if (s.kind === 'AnyLabel' && e.kind === 'AnyLabel' && s.label !== e.label) continue;
        }
        window.__TAURI_INTERNALS__.runCallback(entry.handlerId, {
          event: eventName,
          id: Number(ids[i]),
          payload
        });
      }
    };
    for (const { stream, text } of lines) {
      emitEvent(`launch://${stream}`, { id: 'shot', line: text });
    }
  }, [
    { stream: 'stdout', text: 'video-compare 2025-01-01' },
    { stream: 'stdout', text: 'Left:  take2-h264.mp4' },
    { stream: 'stdout', text: 'Right: take2-av1.mkv' },
    { stream: 'stderr', text: 'Frame 1200 / 5400' },
  ]);
  await client.pause(300);
}

async function showPresetsBar(client) {
  // Presets bar should be visible by default; ensure it's in view
  const presets = await client.$('.presets');
  if (await presets.isExisting()) {
    await presets.scrollIntoView();
    await client.pause(200);
  }
}

async function openFindHelperDialog(client) {
  // Click the "Find filters" helper button in the options header
  const findBtn = await client.$('button=Find filters');
  if (await findBtn.isExisting()) {
    await findBtn.click();
    await client.pause(500);
  }
}

async function openComparePage(client) {
  // Populate both file panels so the Compare button enables, then click it
  // to switch to the compare page. embed_launch is mocked to succeed, so the
  // embed surface renders; we then swap its content for the mandelbrot
  // image generated on-the-fly by FFmpeg (a real video-compare window can't
  // be embedded headless).
  await populateFilePanels(client);
  const compareBtn = await client.$('[data-testid="compare-button"]');
  if (await compareBtn.isExisting()) {
    await compareBtn.click();
    await client.pause(500);
  }
  await client.execute(() => {
    const surface = document.querySelector('.embed-surface')
      ?? document.querySelector('[data-testid="embed-surface"]')
      ?? document.querySelector('.compare-surface');
    if (surface) {
      surface.innerHTML = '';
      const img = document.createElement('img');
      img.src = '/tests/screenshots/current/mandelbrot-temp.png';
      img.alt = 'Mandelbrot test pattern';
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
      surface.appendChild(img);
      const note = document.createElement('div');
      note.textContent = 'Demo — embedded preview';
      note.style.cssText = 'position:absolute;bottom:8px;right:12px;font-size:11px;opacity:0.6;pointer-events:none;';
      surface.style.position = 'relative';
      surface.appendChild(note);
    }
  });
  await client.pause(300);
}

async function writeFile(path, data) {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(path, data);
}

async function generateMandelbrotImage() {
  // The compare-page screenshot needs a stand-in for the embedded
  // video-compare window. Generate it on-the-fly with FFmpeg instead of
  // committing a binary fixture to source control.
  const outputPath = join(CURRENT_DIR, 'mandelbrot-temp.png');
  try {
    execFileSync('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', 'mandelbrot=size=1280x720:rate=1',
      '-frames:v', '1',
      outputPath,
    ], { stdio: 'pipe' });
    console.log(`  Generated mandelbrot test image: ${outputPath}`);
  } catch (err) {
    console.warn('  Warning: ffmpeg not available; compare-page screenshot will lack the mandelbrot image.');
    console.warn(`  (${err.message})`);
  }
}

async function captureScreenshots(client) {
  // Clean and create current directory
  if (existsSync(CURRENT_DIR)) rmSync(CURRENT_DIR, { recursive: true });
  mkdirSync(CURRENT_DIR, { recursive: true });

  await generateMandelbrotImage();

  // Wait for app to be ready
  await client.pause(3000);

  // Set window size for 2× DPI (base 960×540 → 1920×1080 at 2×)
  await client.setWindowRect(0, 0, WIDTH, HEIGHT);

  for (const shot of SHOTS) {
    console.log(`Capturing ${shot.name}...`);

    // Close any dialog a previous shot left open (its overlay intercepts clicks)
    await dismissDialogs(client);

    // Apply theme (all shots specify an explicit light/dark variant)
    await applyTheme(client, shot.theme);
    await client.pause(500); // Wait for theme transition

    // Run setup action if specified
    if (shot.setup) {
      await runSetup(client, shot.setup);
      await client.pause(500);
    }

    // Capture screenshot
    const screenshot = await client.takeScreenshot();
    const buffer = Buffer.from(screenshot, 'base64');
    const outputPath = join(CURRENT_DIR, shot.name);
    await writeFile(outputPath, buffer);
    console.log(`  Saved: ${outputPath}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  console.log('VidCompare Screenshot Capture');
  console.log('=============================\n');
  console.log(`Mode: ${MODE}`);

  let client;
  let devServer;

  if (isBrowser) {
    // Browser mode: headless Chrome + Vite dev server + mocked IPC.
    // The standalone tauri-service init() doesn't support browser mode
    // (it expects a driver port), so we drive Chrome directly and mock
    // IPC via the injected interceptor script.
    const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    devServer = spawn(process.execPath, [viteBin, '--port', '1420', '--strictPort'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let devServerReady = false;
    let devServerOutput = '';
    devServer.stdout.on('data', (d) => {
      const s = d.toString();
      devServerOutput += s;
      // Strip ANSI escape codes before matching
      const clean = s.replace(/\x1b\[[0-9;]*m/g, '');
      if (clean.includes('Local:') || clean.includes('localhost:1420')) devServerReady = true;
    });
    devServer.stderr.on('data', (d) => {
      const s = d.toString();
      devServerOutput += s;
      const clean = s.replace(/\x1b\[[0-9;]*m/g, '');
      if (clean.includes('Local:') || clean.includes('localhost:1420')) devServerReady = true;
    });

    // Wait for dev server readiness (up to 180s for cold Vite cache)
    const deadline = Date.now() + 180_000;
    while (!devServerReady && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!devServerReady) {
      devServer.kill();
      throw new Error(`Vite dev server did not become ready within 180s. Output:\n${devServerOutput}`);
    }
    console.log('Dev server ready on http://localhost:1420');

    client = await remote({
      capabilities: {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
        },
      },
      logLevel: 'warn',
    });

    // Register the IPC interceptor + mocks as a BiDi preload BEFORE the
    // first navigation, so the app's onMount startup IPC calls hit mocks
    // (otherwise the error banner renders in every screenshot). On a
    // non-BiDi session this returns false and we fall back to post-load
    // injection after client.url().
    const preloadActive = await registerBidiPreload(client);

    // Navigate to the dev server
    await client.url('http://localhost:1420');
    await client.pause(2000);

    if (!preloadActive) {
      // Classic fallback: mocks land after onMount already ran unmocked.
      await mockIpc(client);
    }
  } else {
    // Native mode: real Tauri binary via tauri-driver.
    const { binaryPath, driverPath, missing } = await checkNativePrerequisites();

    if (missing.length > 0) {
      console.log('⚠ Prerequisites not met (exiting 0 for CI compatibility):');
      for (const m of missing) console.log(`  - ${m}`);
      console.log('\nRun with --help for setup instructions.');
      process.exit(0);
    }

    console.log(`Binary: ${binaryPath}`);
    console.log(`Driver: ${driverPath}`);

    client = await startWdioSession({
      'wdio:tauriServiceOptions': {
        mode: 'native',
        driverProvider: 'external',
        appBinaryPath: binaryPath,
        tauriDriverPath: driverPath,
        autoInstallTauriDriver: false,
        autoDownloadEdgeDriver: true,
        captureBackendLogs: true,
      },
      'tauri:options': {
        application: binaryPath,
      },
    });
  }

  console.log(`Output: ${CURRENT_DIR}\n`);

  try {
    await captureScreenshots(client);
    console.log(`\n✓ All ${SHOTS.length} screenshots captured successfully`);
  } catch (err) {
    console.error('\n✗ Capture failed:', err.message);
    process.exit(1);
  } finally {
    if (isBrowser) {
      await client.deleteSession();
      devServer.kill();
    } else {
      await cleanupWdioSession(client);
    }
  }
}

main();
