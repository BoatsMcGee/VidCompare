<script lang="ts">
  import { appState } from '../state/app.svelte';
  import { ipc, type ProfileMeta } from '../ipc';
  import { parseProfile } from '../options/profile';
  import { open } from '@tauri-apps/plugin-dialog';
  import { readTextFile } from '@tauri-apps/plugin-fs';

  let profiles = $state<ProfileMeta[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  async function load() {
    loading = true;
    try {
      profiles = await ipc.listProfiles();
    } catch (e) {
      console.error(e);
    }
    loading = false;
  }

  async function install() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (selected && typeof selected === 'string') {
      try {
        await ipc.installProfile(selected);
        await load();
      } catch (e) {
        console.error(e);
      }
    }
  }

  async function activate(p: ProfileMeta) {
    error = null;
    try {
      const text = await readTextFile(p.path);
      appState.profile = parseProfile(JSON.parse(text));
      appState.profileId = p.id;
      if (!appState.profile.groups.some((g) => g.id === appState.activeGroup)) {
        appState.activeGroup = appState.profile.groups[0]?.id ?? 'quick';
      }
      if (appState.settings) {
        appState.settings.active_profile = p.id;
        appState.settings.custom_profile_path = p.path;
        await ipc.saveSettings(appState.settings);
      }
    } catch (e) {
      error = `Failed to load profile "${p.id}": ${String(e)}`;
    }
  }

  $effect(() => {
    void load();
  });
</script>

<div class="profile-manager">
  <h3>Option Profiles</h3>
  {#if error}<p class="error">{error}</p>{/if}
  {#if loading}
    <p>Loading…</p>
  {:else}
    <ul>
      {#each profiles as p (p.id)}
        <li class:active={appState.profileId === p.id}>
          <span class="profile-id">{p.id}</span>
          <span class="profile-meta">upstream {p.upstream_version} · {p.source}</span>
          <button onclick={() => activate(p)}>Use</button>
        </li>
      {/each}
    </ul>
  {/if}
  <button onclick={install}>Install from file…</button>
</div>

<style>
  .profile-manager {
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-secondary);
  }
  .profile-manager h3 {
    font-size: 13px;
    margin-bottom: 6px;
  }
  .error {
    font-size: 11px;
    color: var(--danger);
    margin-bottom: 4px;
  }
  ul {
    list-style: none;
    margin-bottom: 8px;
  }
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 12px;
  }
  li.active {
    font-weight: 600;
  }
  .profile-id {
    flex: 1;
  }
  .profile-meta {
    color: var(--fg-muted);
    font-size: 11px;
  }
</style>
