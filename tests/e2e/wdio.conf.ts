import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Options } from '@wdio/types';

/**
 * WebdriverIO E2E configuration for the VidCompare Tauri app.
 *
 * Two modes, selected with the E2E_MODE environment variable:
 *
 * - `native` (default): launches the compiled Tauri binary through
 *   tauri-driver. Requires a built binary (`cargo build` in src-tauri)
 *   plus tauri-driver on PATH (Linux also needs webkit2gtk-driver,
 *   Windows needs msedgedriver — auto-managed by the service).
 *   REQUIRES A DISPLAY (xvfb-run on headless Linux CI).
 *
 * - `browser`: runs the Svelte frontend in plain Chrome against the Vite
 *   dev server with Tauri IPC mocked at the JS boundary. No Rust build,
 *   no tauri-driver, no display needed (headless Chrome). Used by CI as
 *   the always-on smoke tier.
 *
 * Run:            npm run e2e
 * Browser mode:   $env:E2E_MODE='browser'; npm run e2e   (PowerShell)
 *                 E2E_MODE=browser npm run e2e           (bash)
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mode = (process.env.E2E_MODE ?? 'native') as 'native' | 'browser';
const isBrowser = mode === 'browser';

/** Debug vs release binary — release is what CI builds. */
const profile = process.env.TAURI_PROFILE ?? 'release';
const ext = process.platform === 'win32' ? '.exe' : '';
const appBinary = path.resolve(
  __dirname,
  `../../src-tauri/target/${profile}/vidcompare${ext}`,
);

export const config: Options.Testrunner = {
  runner: 'local',
  // Spec globs resolved against the config file's directory via an absolute
  // glob (forward slashes so glob never treats Windows backslashes as
  // escapes) — independent of how the WDIO version defaults rootDir.
  specs: [`${path.resolve(__dirname, '*.e2e.ts').replaceAll('\\', '/')}`],
  maxInstances: 1,
  user: process.env.WEBDRIVER_USER,
  key: process.env.WEBDRIVER_KEY,

  services: [
    [
      '@wdio/tauri-service',
      isBrowser
        ? {
            mode: 'browser',
            devServerUrl: 'http://localhost:1420',
            // Auto-start `vite dev` if not already running (local convenience).
            devServer: {
              command: 'npx vite --port 1420 --strictPort',
              reuseExistingServer: true,
              // A cold dependency cache (fresh npm ci wipes node_modules/.vite)
              // can push Vite's first ready past 60s.
              timeoutMs: 180_000,
            },
          }
        : {
            mode: 'native',
            driverProvider: 'external',
            appBinaryPath: appBinary,
            // CI installs tauri-driver into a known prefix; see e2e.yml.
            tauriDriverPath: process.env.TAURI_DRIVER_PATH,
            autoInstallTauriDriver: false,
            autoDownloadEdgeDriver: true,
          },
    ],
  ],

  capabilities: [
    isBrowser
      ? {
          browserName: 'tauri',
          'wdio:tauriServiceOptions': {
            mode: 'browser',
            devServerUrl: 'http://localhost:1420',
          },
        }
      : {
          browserName: 'tauri',
          'tauri:options': {
            application: appBinary,
          },
        },
  ],

  logLevel: (process.env.WDIO_LOG_LEVEL ?? 'warn') as Options.Testrunner['logLevel'],
  bail: 0,
  baseUrl: 'http://localhost',
  waitforTimeout: 10_000,
  connectionRetryTimeout: 120_000,
  connectionRetryCount: 3,

  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120_000,
  },

  reporters: ['spec'],

  afterTest: async (_test, _context, { error }) => {
    if (error) {
      await browser.takeScreenshot();
    }
  },
};
