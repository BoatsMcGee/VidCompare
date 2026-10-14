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
 * Both modes capture the same 7 screenshots at 2× DPI matching the exact
 * filenames expected by the website (website/static/screenshots/README.md).
 *
 * Usage:
 *   node tests/screenshots/capture.mjs [--help]
 *   SCREENSHOT_MODE=native node tests/screenshots/capture.mjs
 *
 * Output: tests/screenshots/current/*.png (7 files)
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { remote } from 'webdriverio';
import { startWdioSession, cleanupWdioSession } from '@wdio/tauri-service';

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
  { name: 'file-panels.png', theme: 'system', setup: 'populate-files' },
  { name: 'options-groups.png', theme: 'system', setup: 'expand-options' },
  { name: 'log-panel.png', theme: 'system', setup: 'show-log' },
  { name: 'presets-bar.png', theme: 'system', setup: 'show-presets' },
  { name: 'find-helper-dialog.png', theme: 'system', setup: 'open-find-helper' },
];

const WIDTH = 1920;
const HEIGHT = 1080;

function printHelp() {
  console.log(`
VidCompare Screenshot Capture
=============================

Captures 7 screenshots at 2× DPI for the website gallery.

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
  tests/screenshots/current/*.png (7 files matching website manifest)
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

/** Mock the IPC surface the app touches during startup and per-shot setup. */
async function mockIpc(client) {
  // Inject the browser-mode IPC interceptor (same script the tauri-service
  // uses in browser mode). This patches window.__TAURI_INTERNALS__.invoke
  // to route through window.__wdio_mocks__.
  await client.execute(() => {
    if (!window.__wdio_mocks__) {
      // Minimal mock store setup (mirrors @wdio/native-spy)
      window.__wdio_call_id__ = 0;
      window.__wdio_spy__ = {
        fn: () => {
          const calls = [];
          const results = [];
          const invocationCallOrder = [];
          let _implQueue = [];
          let _defaultImpl;
          let _defaultReturnValue = { __wdioType: 'not-set' };
          let _defaultResolvedValue = { __wdioType: 'not-set' };
          let _defaultRejectedValue = { __wdioType: 'not-set' };
          let _returnThis = false;
          const NOT_SET = { __wdioType: 'not-set' };
          const mockFn = function(...args) {
            const id = ++window.__wdio_call_id__;
            calls.push(args);
            invocationCallOrder.push(id);
            let rv;
            if (_implQueue.length > 0) {
              const impl = _implQueue.shift();
              if (impl && impl.__wdioType === 'resolve') {
                rv = impl.__wdioVal;
                results.push({ type: 'return', value: rv });
                return Promise.resolve(rv);
              } else if (impl && impl.__wdioType === 'reject') {
                rv = impl.__wdioVal;
                results.push({ type: 'throw', value: rv });
                return Promise.reject(rv);
              } else {
                rv = impl.apply(this, args);
                results.push({ type: 'return', value: rv });
                return rv;
              }
            }
            if (_defaultImpl) {
              rv = _defaultImpl.apply(this, args);
              results.push({ type: 'return', value: rv });
              return rv;
            }
            if (_defaultRejectedValue !== NOT_SET) {
              rv = _defaultRejectedValue;
              results.push({ type: 'throw', value: rv });
              return Promise.reject(rv);
            }
            if (_defaultResolvedValue !== NOT_SET) {
              rv = _defaultResolvedValue;
              results.push({ type: 'return', value: rv });
              return Promise.resolve(rv);
            }
            if (_returnThis) {
              results.push({ type: 'return', value: this });
              return this;
            }
            if (_defaultReturnValue !== NOT_SET) {
              rv = _defaultReturnValue;
              results.push({ type: 'return', value: rv });
              return rv;
            }
            results.push({ type: 'return', value: undefined });
            return undefined;
          };
          mockFn._isMockFunction = true;
          const snapshot = { calls, results, invocationCallOrder };
          Object.defineProperty(mockFn, 'mock', { get: () => snapshot, enumerable: true, configurable: true });
          mockFn.mockName = (n) => { mockFn._name = n; return mockFn; };
          mockFn.getMockName = () => mockFn._name;
          mockFn.getMockImplementation = () => _defaultImpl;
          mockFn.mockImplementation = (fn) => { _defaultImpl = fn; _returnThis = false; return mockFn; };
          mockFn.mockImplementationOnce = (fn) => { _implQueue.push(fn); return mockFn; };
          mockFn.mockReturnValue = (val) => { _defaultImpl = undefined; _defaultReturnValue = val; _defaultResolvedValue = NOT_SET; _defaultRejectedValue = NOT_SET; _returnThis = false; return mockFn; };
          mockFn.mockReturnValueOnce = (val) => { _implQueue.push(() => val); return mockFn; };
          mockFn.mockResolvedValue = (val) => { _defaultImpl = undefined; _defaultResolvedValue = val; _defaultReturnValue = NOT_SET; _defaultRejectedValue = NOT_SET; _returnThis = false; return mockFn; };
          mockFn.mockResolvedValueOnce = (val) => { _implQueue.push({ __wdioType: 'resolve', __wdioVal: val }); return mockFn; };
          mockFn.mockRejectedValue = (val) => { _defaultImpl = undefined; _defaultRejectedValue = val; _defaultReturnValue = NOT_SET; _defaultResolvedValue = NOT_SET; _returnThis = false; return mockFn; };
          mockFn.mockRejectedValueOnce = (val) => { _implQueue.push({ __wdioType: 'reject', __wdioVal: val }); return mockFn; };
          mockFn.mockClear = () => { calls.length = 0; results.length = 0; invocationCallOrder.length = 0; return mockFn; };
          mockFn.mockReset = () => { mockFn.mockClear(); _implQueue = []; _defaultImpl = undefined; _defaultReturnValue = NOT_SET; _defaultResolvedValue = NOT_SET; _defaultRejectedValue = NOT_SET; _returnThis = false; return mockFn; };
          mockFn.mockReturnThis = () => { _returnThis = true; _defaultReturnValue = NOT_SET; _defaultResolvedValue = NOT_SET; _defaultRejectedValue = NOT_SET; return mockFn; };
          mockFn.withImplementation = (fn, callback) => {
            const prevImpl = _defaultImpl, prevQueue = _implQueue.slice(), prevReturnThis = _returnThis;
            _defaultImpl = fn; _implQueue = []; _returnThis = false;
            const result = callback();
            if (result && typeof result.then === 'function') {
              return result.then((r) => { _defaultImpl = prevImpl; _implQueue = prevQueue; _returnThis = prevReturnThis; return r; }, (e) => { _defaultImpl = prevImpl; _implQueue = prevQueue; _returnThis = prevReturnThis; throw e; });
            }
            _defaultImpl = prevImpl; _implQueue = prevQueue; _returnThis = prevReturnThis;
            return result;
          };
          return mockFn;
        }
      };
      window.__wdio_mocks__ = {};
    }
    if (!window.__TAURI_INTERNALS__) { window.__TAURI_INTERNALS__ = {}; }
    if (!window.__TAURI_INTERNALS__.callbacks) {
      const callbacks = new Map();
      let uid = 0;
      window.__TAURI_INTERNALS__.callbacks = callbacks;
      window.__TAURI_INTERNALS__.transformCallback = (cb, once) => {
        const id = ++uid;
        callbacks.set(id, (data) => {
          if (once) callbacks.delete(id);
          return cb && cb(data);
        });
        return id;
      };
      window.__TAURI_INTERNALS__.runCallback = (id, data) => {
        const cb = callbacks.get(id);
        if (cb) cb(data);
      };
      window.__TAURI_INTERNALS__.unregisterCallback = (id) => {
        callbacks.delete(id);
      };
    }
    if (!window.__wdio_tauri_listeners__) { window.__wdio_tauri_listeners__ = {}; }
    if (typeof window.__wdio_event_id_seq__ !== 'number') { window.__wdio_event_id_seq__ = 0; }
    if (!window.__TAURI_EVENT_PLUGIN_INTERNALS__) {
      window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
        unregisterListener: (event, eventId) => {
          const bucket = window.__wdio_tauri_listeners__[event];
          if (bucket) delete bucket[eventId];
        }
      };
    }
    const normalizeTarget = (t) => {
      if (t === undefined || t === null) return { kind: 'Any' };
      if (typeof t === 'string') return { kind: 'AnyLabel', label: t };
      return t;
    };
    const targetMatches = (subscriberTarget, emitTarget) => {
      const s = normalizeTarget(subscriberTarget);
      const e = normalizeTarget(emitTarget);
      if (s.kind === 'Any' || e.kind === 'Any') return true;
      if (s.kind === 'App' || e.kind === 'App') return s.kind === e.kind;
      return s.label === e.label;
    };
    window.__wdio_emit_tauri_event__ = (eventName, payload, target) => {
      const bucket = window.__wdio_tauri_listeners__[eventName];
      if (!bucket) return;
      const ids = Object.keys(bucket);
      for (let i = 0; i < ids.length; i++) {
        const entry = bucket[ids[i]];
        if (!entry) continue;
        if (target !== undefined && !targetMatches(entry.target, target)) continue;
        window.__TAURI_INTERNALS__.runCallback(entry.handlerId, {
          event: eventName,
          id: Number(ids[i]),
          payload
        });
      }
    };
    const handlePluginEvent = (cmd, args) => {
      if (cmd === 'plugin:event|listen') {
        const eventId = ++window.__wdio_event_id_seq__;
        const ev = args && args.event;
        if (!window.__wdio_tauri_listeners__[ev]) window.__wdio_tauri_listeners__[ev] = {};
        window.__wdio_tauri_listeners__[ev][eventId] = {
          handlerId: args && args.handler,
          target: args && args.target
        };
        return Promise.resolve(eventId);
      }
      if (cmd === 'plugin:event|unlisten') {
        const ev2 = args && args.event;
        const id = args && args.eventId;
        const bucket = window.__wdio_tauri_listeners__[ev2];
        if (bucket) delete bucket[id];
        return Promise.resolve();
      }
      if (cmd === 'plugin:event|emit') {
        window.__wdio_emit_tauri_event__(args && args.event, args && args.payload);
        return Promise.resolve();
      }
      if (cmd === 'plugin:event|emit_to') {
        window.__wdio_emit_tauri_event__(args && args.event, args && args.payload, args && args.target);
        return Promise.resolve();
      }
      return Promise.resolve();
    };
    window.__TAURI_INTERNALS__.invoke = (cmd, args, options) => {
      const mock = window.__wdio_mocks__ && window.__wdio_mocks__[cmd];
      if (mock && typeof mock === 'function') {
        const mockResult = Promise.resolve().then(() => mock(args, options));
        if (cmd && cmd.indexOf('plugin:event|') === 0) {
          return mockResult.then(() => handlePluginEvent(cmd, args));
        }
        return mockResult;
      }
      if (cmd && cmd.indexOf('plugin:event|') === 0) {
        return handlePluginEvent(cmd, args);
      }
      if (cmd && cmd.indexOf('plugin:') === 0) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('unmocked Tauri command in browser mode: ' + cmd));
    };
  });

  // Register mocks via the injected interceptor
  const settings = await client.tauri.mock('load_settings');
  await settings.mockResolvedValue({
    theme: 'system',
    custom_binary_path: null,
    custom_profile_path: null,
    active_profile: null,
    recent_folders: [],
    log_level: 'info',
    portable: false,
  });
  const saveSettings = await client.tauri.mock('save_settings');
  await saveSettings.mockResolvedValue(undefined);
  const binary = await client.tauri.mock('resolve_binary');
  await binary.mockResolvedValue({
    path: '/usr/bin/video-compare',
    source: 'PATH',
    version: '2025-01-01',
  });
  const listMediaFiles = await client.tauri.mock('list_media_files');
  await listMediaFiles.mockResolvedValue([
    { name: 'take2.mkv', path: 'P:\\videos\\clip\\take2.mkv', size: 208 * 1024 * 1024, mtime: null, ext: 'mkv', is_video: true },
    { name: 'take2-h264.mp4', path: 'P:\\videos\\clip\\take2-h264.mp4', size: 96 * 1024 * 1024, mtime: null, ext: 'mp4', is_video: true },
    { name: 'take2-av1.mkv', path: 'P:\\videos\\clip\\take2-av1.mkv', size: 61 * 1024 * 1024, mtime: null, ext: 'mkv', is_video: true },
    { name: 'take2-prores.mov', path: 'P:\\videos\\clip\\take2-prores.mov', size: 1240 * 1024 * 1024, mtime: null, ext: 'mov', is_video: true },
    { name: 'take2.srt', path: 'P:\\videos\\clip\\take2.srt', size: 14 * 1024, mtime: null, ext: 'srt', is_video: false },
    { name: 'notes.txt', path: 'P:\\videos\\clip\\notes.txt', size: 2 * 1024, mtime: null, ext: 'txt', is_video: false },
  ]);
  const runInfoCommand = await client.tauri.mock('run_info_command');
  await runInfoCommand.mockResolvedValue(
    'Available filters:\n  yadif\n  scale\n  crop\n  hstack\n  vstack\n  ...',
  );
  const describePath = await client.tauri.mock('describe_path');
  await describePath.mockResolvedValue({ is_dir: false });
}

/** Seed localStorage presets before the app loads (PresetsBar reads on init). */
async function seedPresets(client) {
  await client.execute(() => {
    const presets = [
      {
        name: 'H264 vs AV1',
        options: { 'display-mode': { value: 'split' } },
        left: { path: 'P:\\videos\\clip\\take2-h264.mp4' },
        rights: [{ path: 'P:\\videos\\encode-test\\take2-av1.mkv' }],
        updatedAt: Date.now(),
      },
      {
        name: 'ProRes master',
        options: {},
        left: { path: 'P:\\videos\\clip\\take2-prores.mov' },
        rights: [],
        updatedAt: Date.now(),
      },
    ];
    localStorage.setItem('vidcompare.presets.v1', JSON.stringify(presets));
  });
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
  }
}

async function populateFilePanels(client) {
  // Type a directory path into each panel's input and commit it; the mocked
  // list_media_files returns fixture entries.
  const inputs = await client.$$('.dir-input');
  if (inputs.length >= 2) {
    await inputs[0].setValue('P:\\videos\\clip');
    await inputs[0].keys('Enter');
    await client.pause(300);
    await inputs[1].setValue('P:\\videos\\encode-test');
    await inputs[1].keys('Enter');
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

async function showLogPanel(client) {
  // Emit fake launch events so the log panel renders with sample output.
  await client.tauri.emitEvent('launch://stdout', { id: 'shot', line: 'video-compare 2025-01-01' });
  await client.tauri.emitEvent('launch://stdout', { id: 'shot', line: 'Left:  take2-h264.mp4' });
  await client.tauri.emitEvent('launch://stdout', { id: 'shot', line: 'Right: take2-av1.mkv' });
  await client.tauri.emitEvent('launch://stderr', { id: 'shot', line: 'Frame 1200 / 5400' });
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

async function writeFile(path, data) {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(path, data);
}

async function captureScreenshots(client) {
  // Clean and create current directory
  if (existsSync(CURRENT_DIR)) rmSync(CURRENT_DIR, { recursive: true });
  mkdirSync(CURRENT_DIR, { recursive: true });

  // Wait for app to be ready
  await client.pause(3000);

  // Set window size for 2× DPI (base 960×540 → 1920×1080 at 2×)
  await client.setWindowRect(0, 0, WIDTH, HEIGHT);

  for (const shot of SHOTS) {
    console.log(`Capturing ${shot.name}...`);

    // Apply theme if needed
    if (shot.theme !== 'system') {
      await applyTheme(client, shot.theme);
      await client.pause(500); // Wait for theme transition
    }

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

  if (isBrowser) {
    // Browser mode: headless Chrome + Vite dev server + mocked IPC.
    // The standalone tauri-service init() doesn't support browser mode
    // (it expects a driver port), so we drive Chrome directly and mock
    // IPC via the injected interceptor script.
    const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    const devServer = spawn(process.execPath, [viteBin, '--port', '1420', '--strictPort'], {
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

    // Navigate to the dev server
    await client.url('http://localhost:1420');
    await client.pause(2000);

    // Mock IPC via the injected interceptor (browser-mode service does this
    // automatically; here we do it manually via execute).
    await mockIpc(client);
    await seedPresets(client);
    await client.refresh();
    await client.pause(2000);
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
    console.log('\n✓ All 7 screenshots captured successfully');
  } catch (err) {
    console.error('\n✗ Capture failed:', err.message);
    process.exit(1);
  } finally {
    if (isBrowser) {
      await client.deleteSession();
    } else {
      await cleanupWdioSession(client);
    }
  }
}

main();
