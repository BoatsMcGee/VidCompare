/**
 * VidCompare E2E smoke tests.
 *
 * Runs in two modes (see tests/e2e/wdio.conf.ts):
 * - native: real Tauri window via tauri-driver — window title assertions
 *   only work here.
 * - browser: frontend in Chrome with mocked Tauri IPC — the title check
 *   is skipped (document.title is not the OS window title).
 *
 * In browser mode the Tauri commands the app invokes on startup
 * (load_settings, resolve_binary, app_info) must be mocked before the
 * page loads, otherwise the app renders its error banner.
 */

const isBrowserMode = (browser.capabilities as { browserName?: string })
  ?.browserName === 'chrome' ||
  !!(browser.capabilities as Record<string, unknown>)['wdio:tauriServiceOptions'];

describe('VidCompare app', () => {
  before(async () => {
    if (isBrowserMode) {
      // Mock the IPC surface the app touches during startup so the UI
      // renders its normal state instead of the error banner.
      const settings = await browser.tauri.mock('load_settings');
      await settings.mockResolvedValue({
        theme: 'system',
        custom_binary_path: null,
        custom_profile_path: null,
        active_profile: null,
        recent_folders: [],
        log_level: 'info',
        portable: false,
      });
      const binary = await browser.tauri.mock('resolve_binary');
      await binary.mockResolvedValue({
        path: '/usr/bin/video-compare',
        source: 'PATH',
        version: '2025-01-01',
      });
    }
  });

  it('shows the VidCompare window title', async () => {
    if (isBrowserMode) return; // document.title is not the OS window title

    const title = await browser.getTitle();
    expect(title).toBe('VidCompare');
  });

  it('renders the header and file panels', async () => {
    const header = await $('h1=VidCompare');
    await header.waitForDisplayed({ timeout: 20_000 });
    expect(await header.isDisplayed()).toBe(true);

    // Both file panels with their side badges and titles.
    expect(await $('.badge-left').isDisplayed()).toBe(true);
    expect(await $('.badge-right').isDisplayed()).toBe(true);
    expect(await $('span=Reference').isDisplayed()).toBe(true);
    expect(await $('span=Distorted').isDisplayed()).toBe(true);

    // Empty state until a folder is picked.
    expect(await $('div=No folder selected').isExisting()).toBe(true);
  });

  it('renders the options form with group tabs and search', async () => {
    const search = await $('input[placeholder="🔍 Search options…"]');
    expect(await search.isDisplayed()).toBe(true);

    // Group tabs come from the loaded profile.
    const tabs = await $$('.group-tabs button');
    expect(tabs.length).toBeGreaterThan(0);

    // Shared/global options section is present.
    expect(await $('h3=Shared (both sides)').isDisplayed()).toBe(true);
  });

  it('renders the launch button (disabled without a left file)', async () => {
    const launch = await $('button=▶ Launch');
    await launch.waitForDisplayed({ timeout: 20_000 });
    expect(await launch.isDisplayed()).toBe(true);
    expect(await launch.isEnabled()).toBe(false);
  });

  it('toggles a link chip in the options form', async () => {
    // Switch to a group that has pair options (L/R link buttons).
    const ioTab = await $('button=Inputs & Decoding');
    if (await ioTab.isExisting()) {
      await ioTab.click();
    }

    const linkBtn = await $('.link-btn');
    await linkBtn.waitForDisplayed({ timeout: 10_000 });
    const before = await linkBtn.getAttribute('class');
    await linkBtn.click();
    const after = await linkBtn.getAttribute('class');
    expect(after).not.toBe(before);
  });

  it('opens and closes the settings dialog', async () => {
    const settingsBtn = await $('button=Settings');
    await settingsBtn.click();

    const dialog = await $('[role="dialog"][aria-label="Settings"]');
    await dialog.waitForDisplayed({ timeout: 10_000 });
    expect(await dialog.isDisplayed()).toBe(true);

    const closeBtn = await $('button.primary=Close');
    await closeBtn.click();
    await dialog.waitForDisplayed({ timeout: 10_000, reverse: true });
    expect(await dialog.isDisplayed()).toBe(false);
  });
});
