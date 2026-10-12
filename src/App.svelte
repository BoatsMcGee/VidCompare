<script lang="ts">
  import { onMount } from 'svelte';
  import { open } from '@tauri-apps/plugin-dialog';
  import { readTextFile } from '@tauri-apps/plugin-fs';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { appState } from './lib/state/app.svelte';
  import { ipc } from './lib/ipc';
  import { parseProfile } from './lib/options/profile';
  import { buildArgs } from './lib/options/args';
  import { profileMatchesBinary } from './lib/state/version';
  import FilePanel from './lib/components/FilePanel.svelte';
  import CompareView from './lib/components/CompareView.svelte';
  import OptionsForm from './lib/components/OptionsForm.svelte';
  import CommandPreview from './lib/components/CommandPreview.svelte';
  import LogPanel from './lib/components/LogPanel.svelte';
  import ThemeToggle from './lib/components/ThemeToggle.svelte';
  import ActiveChips from './lib/components/ActiveChips.svelte';
  import ProfileManager from './lib/components/ProfileManager.svelte';
  import './styles/theme.css';

  const PROFILES_URL = 'https://github.com/BoatsMcGee/VidCompare/releases';

  let binaryInfo = $state<{ path: string; source: string; version: string } | null>(null);
  let error = $state<string | null>(null);
  let dismissedWarning = $state<string | null>(null);
  let profileFile = $derived(appState.settings?.custom_profile_path ?? null);

  let versionMismatch = $derived(
    binaryInfo && appState.profile && !profileMatchesBinary(binaryInfo.version, appState.profile.upstream.version)
      ? {
          key: `${binaryInfo.version}|${appState.profile.upstream.version}`,
          binaryVersion: binaryInfo.version,
          profileVersion: appState.profile.upstream.version,
        }
      : null,
  );
  let showVersionWarning = $derived(
    versionMismatch !== null && dismissedWarning !== versionMismatch.key,
  );

  async function loadEmbeddedProfile() {
    const res = await fetch('/profiles/video-compare-latest.json');
    if (!res.ok) throw new Error(`Failed to fetch embedded profile (HTTP ${res.status})`);
    const profileJson: unknown = await res.json();
    appState.profile = parseProfile(profileJson);
    appState.profileId = 'video-compare-latest';
  }

  async function loadProfileFromFile(path: string): Promise<void> {
    const text = await readTextFile(path);
    appState.profile = parseProfile(JSON.parse(text));
    appState.profileId = path.split(/[\\/]/).pop()?.replace(/\.json$/i, '') ?? path;
  }

  async function loadActiveProfile() {
    const custom = appState.settings?.custom_profile_path;
    if (custom) {
      try {
        await loadProfileFromFile(custom);
        return;
      } catch (e) {
        error = `Failed to load profile "${custom}": ${e}`;
      }
    }
    await loadEmbeddedProfile();
  }

  onMount(async () => {
    // Each startup step is independent: a rejected settings/binary IPC call
    // (e.g. unmocked at page load in browser-mode E2E) must not prevent the
    // embedded profile from loading and rendering the form.
    try {
      appState.settings = await ipc.loadSettings();
      appState.theme = (appState.settings.theme as 'light' | 'dark' | 'system') ?? 'system';
      applyTheme();
    } catch (e) {
      error = String(e);
    }

    try {
      await loadActiveProfile();
    } catch (e) {
      error = `Failed to load profile: ${e}`;
    }

    try {
      binaryInfo = await ipc.resolveBinary(appState.settings?.custom_binary_path ?? undefined);
    } catch (e) {
      error = `Binary not found: ${e}`;
    }
  });

  function applyTheme() {
    const theme = appState.theme;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  $effect(() => {
    applyTheme();
  });

  async function persistSettings() {
    if (!appState.settings) return;
    try {
      await ipc.saveSettings(appState.settings);
    } catch (e) {
      error = String(e);
    }
  }

  function setTheme(value: string) {
    const theme = value as 'light' | 'dark' | 'system';
    appState.theme = theme;
    if (appState.settings) {
      appState.settings.theme = theme;
      void persistSettings();
    }
  }

  async function resolveBinary() {
    try {
      binaryInfo = await ipc.resolveBinary(appState.settings?.custom_binary_path ?? undefined);
      if (error?.startsWith('Binary not found')) error = null;
    } catch (e) {
      binaryInfo = null;
      error = `Binary not found: ${e}`;
    }
  }

  async function browseBinary() {
    if (!appState.settings) return;
    try {
      const selected = await open({ multiple: false });
      if (selected && typeof selected === 'string') {
        appState.settings.custom_binary_path = selected;
        await persistSettings();
        await resolveBinary();
      }
    } catch (e) {
      error = String(e);
    }
  }

  async function useDefaultBinary() {
    if (!appState.settings) return;
    appState.settings.custom_binary_path = null;
    await persistSettings();
    await resolveBinary();
  }

  async function browseProfile() {
    if (!appState.settings) return;
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Option profile', extensions: ['json'] }],
      });
      if (selected && typeof selected === 'string') {
        await loadProfileFromFile(selected);
        appState.settings.custom_profile_path = selected;
        appState.settings.active_profile = appState.profileId;
        await persistSettings();
      }
    } catch (e) {
      error = `Failed to load profile: ${String(e)}`;
    }
  }

  async function useEmbeddedProfile() {
    if (!appState.settings) return;
    try {
      await loadEmbeddedProfile();
      appState.settings.custom_profile_path = null;
      appState.settings.active_profile = null;
      await persistSettings();
    } catch (e) {
      error = String(e);
    }
  }

  function dismissWarning() {
    if (versionMismatch) dismissedWarning = versionMismatch.key;
  }

  function handleWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && appState.showSettings) appState.showSettings = false;
  }

  async function openProfilesPage() {
    try {
      await openUrl(PROFILES_URL);
    } catch {
      window.open(PROFILES_URL, '_blank', 'noopener');
    }
  }

  async function launch() {
    if (!binaryInfo || !appState.leftFile) return;
    const args = buildArgs(appState.buildState, appState.profile!);
    try {
      const handle = await ipc.launch(binaryInfo.path, args);
      appState.sessions = [
        ...appState.sessions,
        {
          id: handle.id,
          binary: binaryInfo.path,
          args,
          startedAt: handle.started_at,
          exitCode: null,
          lines: [],
        },
      ];
      appState.activeSessionId = handle.id;
    } catch (e) {
      error = String(e);
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="app">
  <header>
    <h1>VidCompare</h1>
    <div class="header-actions">
      {#if binaryInfo}
        <span class="badge badge-neutral">{binaryInfo.source} · {binaryInfo.version}</span>
      {/if}
      {#if appState.profile}
        <span class="badge badge-neutral">profile · {appState.profile.upstream.version}</span>
      {/if}
      <ThemeToggle />
      <button onclick={() => (appState.showSettings = true)}>Settings</button>
    </div>
  </header>

  {#if showVersionWarning && versionMismatch}
    <div class="warn-banner">
      <span>
        video-compare {versionMismatch.binaryVersion} differs from profile
        {versionMismatch.profileVersion} — some options may be missing.
      </span>
      <button class="banner-link" onclick={openProfilesPage}>Download profiles…</button>
      <button class="banner-dismiss" onclick={dismissWarning} title="Dismiss">✕</button>
    </div>
  {/if}

  {#if error}
    <div class="error-banner">{error} <button onclick={() => (error = null)}>✕</button></div>
  {/if}

  <main>
    <div class="file-panels">
      <FilePanel side="left" />
      <div class="swap-col">
        <button onclick={() => appState.swapLeftRight()} title="Swap left and right">⇄</button>
      </div>
      <FilePanel side="right" />
    </div>

    <CompareView onExternal={launch} binaryPath={binaryInfo?.path ?? null} />

    <OptionsForm />

    <ActiveChips />

    <CommandPreview onLaunch={launch} />
    {#if appState.hasVideoCompareOutput}
      <LogPanel />
    {/if}
  </main>

  {#if appState.showSettings}
    <div class="dialog-overlay">
      <div class="settings-dialog" role="dialog" aria-label="Settings">
        <h2>Settings</h2>

        <section class="settings-section">
          <h3>Appearance</h3>
          <div class="settings-row">
            <label for="settings-theme">Theme</label>
            <select
              id="settings-theme"
              value={appState.theme}
              onchange={(e) => setTheme(e.currentTarget.value)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </section>

        <section class="settings-section">
          <h3>video-compare binary</h3>
          <div class="settings-row">
            <input
              type="text"
              value={appState.settings?.custom_binary_path ?? ''}
              placeholder="Default (bundled sidecar or PATH)"
              readonly
            />
            <button onclick={browseBinary}>Browse…</button>
            <button onclick={useDefaultBinary}>Use default</button>
          </div>
          {#if binaryInfo}
            <p class="hint">Detected: {binaryInfo.version} — {binaryInfo.path} ({binaryInfo.source})</p>
          {/if}
        </section>

        <section class="settings-section">
          <h3>Option profile</h3>
          <div class="settings-row">
            <label class="radio">
              <input
                type="radio"
                name="profile-source"
                checked={!profileFile}
                onchange={useEmbeddedProfile}
              />
              Embedded default
            </label>
            <label class="radio">
              <input
                type="radio"
                name="profile-source"
                checked={!!profileFile}
                onchange={browseProfile}
              />
              Profile file
            </label>
            <button onclick={browseProfile}>Browse…</button>
          </div>
          <p class="hint">
            {profileFile ?? 'No profile file selected — using the embedded default profile.'}
          </p>
          <ProfileManager />
        </section>

        <div class="dialog-actions">
          <button class="primary" onclick={() => (appState.showSettings = false)}>Close</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
  }
  header h1 {
    font-size: 16px;
    font-weight: 600;
  }
  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  main {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }
  .file-panels {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 8px;
    margin-bottom: 12px;
    align-items: stretch;
  }
  .swap-col {
    display: flex;
    align-items: center;
  }
  .error-banner {
    background: var(--danger);
    color: white;
    padding: 6px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .error-banner button {
    background: transparent;
    border: none;
    color: white;
    font-size: 16px;
  }
  .warn-banner {
    background: var(--warning);
    color: white;
    padding: 6px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
  }
  .warn-banner .banner-link {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.7);
    color: white;
    text-decoration: underline;
    padding: 1px 8px;
    font-size: 12px;
  }
  .warn-banner .banner-dismiss {
    margin-left: auto;
    background: transparent;
    border: none;
    color: white;
    font-size: 14px;
  }
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .settings-dialog {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    padding: 16px;
    width: 620px;
    max-height: 85vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .settings-dialog h2 {
    font-size: 16px;
  }
  .settings-section h3 {
    font-size: 13px;
    margin-bottom: 6px;
    color: var(--fg-secondary);
  }
  .settings-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .settings-row input[type='text'] {
    flex: 1;
    min-width: 200px;
  }
  .settings-row .radio {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
  }
  .hint {
    font-size: 11px;
    color: var(--fg-muted);
    margin-top: 4px;
    word-break: break-all;
  }
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
  }
</style>
