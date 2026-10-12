<script lang="ts">
  import { appState } from '../state/app.svelte';
  import { ipc } from '../ipc';
  import { parentDir } from '../path';
  import {
    deletePreset,
    loadPresets,
    renamePreset,
    savePreset,
    type Preset,
  } from '../state/presets';

  const storage: Storage = localStorage;

  let presets = $state<Preset[]>(loadPresets(storage));
  let newName = $state('');
  let error = $state<string | null>(null);
  let renaming = $state<string | null>(null);
  let renameValue = $state('');

  async function refreshEntries(side: 'left' | 'right', dir: string) {
    if (!dir) return;
    try {
      const showAll = side === 'left' ? appState.leftShowAll : appState.rightShowAll;
      const entries = await ipc.listMediaFiles(dir, showAll);
      if (side === 'left') appState.leftEntries = entries;
      else appState.rightEntries = entries;
    } catch (e) {
      console.error(e);
    }
  }

  function save() {
    const res = savePreset(
      presets,
      {
        name: newName,
        options: { ...appState.optionValues },
        left: appState.leftFile,
        rights: [...appState.rightFiles],
      },
      storage,
    );
    presets = res.presets;
    error = res.error ?? null;
    if (!res.error) newName = '';
  }

  function apply(p: Preset) {
    appState.optionValues = { ...p.options };
    appState.leftFile = p.left ? { ...p.left } : null;
    appState.rightFiles = p.rights.map((r) => ({ ...r }));
    error = null;
    if (p.left) {
      appState.leftDir = parentDir(p.left.path);
      void refreshEntries('left', appState.leftDir);
    }
    const firstRight = p.rights[0];
    if (firstRight) {
      appState.rightDir = parentDir(firstRight.path);
      void refreshEntries('right', appState.rightDir);
    }
  }

  function startRename(p: Preset) {
    renaming = p.name;
    renameValue = p.name;
  }

  function confirmRename() {
    if (renaming === null) return;
    const res = renamePreset(presets, renaming, renameValue, storage);
    presets = res.presets;
    error = res.error ?? null;
    renaming = null;
  }

  function remove(p: Preset) {
    presets = deletePreset(presets, p.name, storage);
    error = null;
  }
</script>

<div class="presets">
  <span class="label">Presets:</span>
  {#each presets as p (p.name)}
    {#if renaming === p.name}
      <span class="rename-row">
        <input type="text" bind:value={renameValue} onkeydown={(e) => e.key === 'Enter' && confirmRename()} />
        <button class="remove" onclick={confirmRename} title="Confirm rename">✓</button>
        <button class="remove" onclick={() => (renaming = null)} title="Cancel rename">✕</button>
      </span>
    {:else}
      <button onclick={() => apply(p)} title="Apply preset">{p.name}</button>
      <button class="remove" onclick={() => startRename(p)} title="Rename">✎</button>
      <button class="remove" onclick={() => remove(p)} title="Delete">✕</button>
    {/if}
  {/each}
  <input
    type="text"
    bind:value={newName}
    placeholder="New preset name…"
    onkeydown={(e) => e.key === 'Enter' && save()}
  />
  <button onclick={save}>Save</button>
  {#if error}<span class="error">{error}</span>{/if}
</div>

<style>
  .presets {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }
  .label {
    font-size: 12px;
    color: var(--fg-secondary);
  }
  .presets button {
    padding: 2px 8px;
    font-size: 12px;
  }
  .presets .remove {
    padding: 2px 4px;
    font-size: 10px;
  }
  .presets input {
    width: 140px;
    font-size: 12px;
  }
  .rename-row {
    display: inline-flex;
    gap: 2px;
    align-items: center;
  }
  .error {
    font-size: 11px;
    color: var(--danger);
  }
</style>
