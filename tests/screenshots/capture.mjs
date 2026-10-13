#!/usr/bin/env node
/**
 * VidCompare screenshot capture script.
 *
 * Uses WebdriverIO's embedded WebDriver provider (tauri-plugin-wdio-webdriver)
 * to launch the compiled Tauri app and capture 7 screenshots at 2× DPI
 * matching the exact filenames expected by the website.
 *
 * Prerequisites (native mode):
 *   - Built Tauri binary: `cargo build --release` in src-tauri/
 *   - Display server (Xvfb on headless Linux, native on Windows/macOS)
 *
 * If prerequisites are missing, exits 0 with a clear message (CI-friendly).
 *
 * Usage:
 *   node tests/screenshots/capture.mjs [--help]
 *
 * Output: tests/screenshots/current/*.png (7 files)
 */

import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { startWdioSession, cleanupWdioSession } from '@wdio/tauri-service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');
const SCREENSHOTS_DIR = join(ROOT, 'tests', 'screenshots');
const CURRENT_DIR = join(SCREENSHOTS_DIR, 'current');
const BASELINE_DIR = join(SCREENSHOTS_DIR, 'baseline');

const SHOTS = [
  { name: 'main-window-light.png', theme: 'light', setup: null },
  { name: 'main-window-dark.png', theme: 'dark', setup: null },
  { name: 'file-panels.png', theme: 'system', setup: 'populate-files' },
  { name: 'options-groups.png', theme: 'system', setup: 'expand-options' },
  { name: 'log-panel.png', theme: 'system', setup: 'show-log' },
  { name: 'presets-bar.png', theme: 'system', setup: 'show-presets' },
  { name: 'find-helper-dialog.png', theme: 'system', setup: 'open-find-helper' },
];

const DPI_SCALE = 2; // 2× DPI for crisp website images

function printHelp() {
  console.log(`
VidCompare Screenshot Capture
=============================

Captures 7 screenshots at 2× DPI for the website gallery.

Prerequisites (native mode):
  1. Build the Tauri app:    cd src-tauri && cargo build --release
  2. Display server:
     - Linux CI: xvfb-run -a --server-args="-screen 0 1920x1080x24"
     - Windows/macOS: native display

If any prerequisite is missing, the script exits 0 with a message
(so CI doesn't fail on environments that can't run native tests).

Usage:
  node tests/screenshots/capture.mjs [--help]

Output:
  tests/screenshots/current/*.png (7 files matching website manifest)
`);
}

async function checkPrerequisites() {
  const ext = process.platform === 'win32' ? '.exe' : '';
  const binaryPath = resolve(ROOT, `src-tauri/target/release/vidcompare${ext}`);

  const missing = [];
  if (!existsSync(binaryPath)) {
    missing.push(`Tauri binary not found: ${binaryPath}\n  Fix: cd src-tauri && cargo build --release`);
  }

  // Check for display on Linux
  if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
    missing.push('No display server (DISPLAY/WAYLAND_DISPLAY not set)\n  Fix: run under xvfb-run -a --server-args="-screen 0 1920x1080x24"');
  }

  return { binaryPath, missing };
}

async function captureScreenshots(binaryPath) {
  // Clean and create current directory
  if (existsSync(CURRENT_DIR)) rmSync(CURRENT_DIR, { recursive: true });
  mkdirSync(CURRENT_DIR, { recursive: true });

  // Standalone session via the service's init/cleanup API — plain
  // webdriverio remote() ignores `services` (only the WDIO testrunner
  // initializes them), so the driver would never be spawned otherwise.
  const client = await startWdioSession({
    'wdio:tauriServiceOptions': {
      mode: 'native',
      // Embedded provider runs the WebDriver server inside the app via
      // tauri-plugin-wdio-webdriver — no external tauri-driver needed.
      driverProvider: 'embedded',
      appBinaryPath: binaryPath,
      captureBackendLogs: true,
    },
    'tauri:options': {
      application: binaryPath,
    },
  });

  try {
    // Wait for app to be ready
    await client.pause(3000);

    // Set window size for 2× DPI (base 960×540 → 1920×1080 at 2×)
    await client.setWindowRect(0, 0, 1920, 1080);

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
  } finally {
    await cleanupWdioSession(client);
  }
}

async function applyTheme(client, theme) {
  // The app uses a theme toggle button; click it to cycle to desired theme
  // Theme order: system → light → dark → system
  const themeBtn = await client.$('button[aria-label*="theme" i], button[aria-label*="Theme" i]');
  if (await themeBtn.isExisting()) {
    const currentTheme = await getCurrentTheme(client);
    const targetIndex = ['system', 'light', 'dark'].indexOf(theme);
    const currentIndex = ['system', 'light', 'dark'].indexOf(currentTheme);
    const clicks = (targetIndex - currentIndex + 3) % 3;
    for (let i = 0; i < clicks; i++) {
      await themeBtn.click();
      await client.pause(200);
    }
  }
}

async function getCurrentTheme(client) {
  // Try to read from the theme toggle button's aria-label or class
  const themeBtn = await client.$('button[aria-label*="theme" i], button[aria-label*="Theme" i]');
  if (await themeBtn.isExisting()) {
    const label = await themeBtn.getAttribute('aria-label');
    if (label?.includes('light')) return 'light';
    if (label?.includes('dark')) return 'dark';
    return 'system';
  }
  return 'system';
}

async function runSetup(client, setup) {
  switch (setup) {
    case 'populate-files':
      // Click folder picker for left panel, select fixture folder
      // This is a placeholder - actual implementation depends on app UI
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
  // Click the left folder button
  const leftBtn = await client.$('button:has(.badge-left), button[aria-label*="Reference" i]');
  if (await leftBtn.isExisting()) {
    await leftBtn.click();
    await client.pause(1000);
    // In a real scenario, we'd use the file dialog - for now just ensure UI renders
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
  // Trigger log panel visibility - click a button or run a command
  const logBtn = await client.$('button[aria-label*="log" i], button[aria-label*="Log" i]');
  if (await logBtn.isExisting()) {
    await logBtn.click();
    await client.pause(500);
  }
}

async function showPresetsBar(client) {
  // Presets bar should be visible by default; ensure it's in view
  const presets = await client.$('.presets-bar, [data-testid="presets-bar"]');
  if (await presets.isExisting()) {
    await presets.scrollIntoView();
    await client.pause(200);
  }
}

async function openFindHelperDialog(client) {
  // Click settings, then find helper button
  const settingsBtn = await client.$('button=Settings, button[aria-label*="Settings" i]');
  if (await settingsBtn.isExisting()) {
    await settingsBtn.click();
    await client.pause(500);
    const findBtn = await client.$('button=Find Helper, button[aria-label*="Find Helper" i]');
    if (await findBtn.isExisting()) {
      await findBtn.click();
      await client.pause(500);
    }
  }
}

async function writeFile(path, data) {
  const { writeFile } = await import('node:fs/promises');
  await writeFile(path, data);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  console.log('VidCompare Screenshot Capture');
  console.log('=============================\n');

  const { binaryPath, missing } = await checkPrerequisites();

  if (missing.length > 0) {
    console.log('⚠ Prerequisites not met (exiting 0 for CI compatibility):');
    for (const m of missing) console.log(`  - ${m}`);
    console.log('\nRun with --help for setup instructions.');
    process.exit(0);
  }

  console.log(`Binary: ${binaryPath}`);
  console.log(`Output: ${CURRENT_DIR}\n`);

  try {
    await captureScreenshots(binaryPath);
    console.log('\n✓ All 7 screenshots captured successfully');
  } catch (err) {
    console.error('\n✗ Capture failed:', err.message);
    process.exit(1);
  }
}

main();