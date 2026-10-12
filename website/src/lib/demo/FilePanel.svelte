<script lang="ts">
  import { demo } from './state.svelte';
  import { formatSize } from './mock-data';

  let { side }: { side: 'left' | 'right' } = $props();

  let entries = $derived(demo.visibleEntries(side));
  let selected = $derived(demo.selectedPath(side));
  let dir = $derived(side === 'left' ? demo.leftDir : demo.rightDir);
  let showAll = $derived(side === 'left' ? demo.leftShowAll : demo.rightShowAll);
</script>

<div class="panel">
  <div class="panel-header">
    <span class="badge {side === 'left' ? 'badge-left' : 'badge-right'}"
      >{side === 'left' ? 'L' : 'R'}</span
    >
    <span class="panel-title">{side === 'left' ? 'Left' : 'Right'}</span>
    <input
      class="dir-input"
      type="text"
      value={dir}
      readonly
      aria-label="Folder path"
      title="Demo — editing unavailable"
    />
    <button class="browse-btn" title="Browse (demo — file dialog unavailable)" disabled>📂</button>
    <label class="show-all">
      <input
        type="checkbox"
        checked={showAll}
        onchange={() => demo.toggleShowAll(side)}
      />
      Show all files
    </label>
  </div>

  <div class="file-list">
    {#each entries as entry (entry.path)}
      <button
        class="file-entry"
        class:selected={selected === entry.path}
        title={entry.name}
        onclick={() => demo.selectFile(side, entry.path)}
      >
        <span class="file-name">{entry.name}</span>
        <span class="file-size">{formatSize(entry.size)}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .panel {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px;
    background: var(--bg-secondary);
  }
  .panel-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
    min-width: 0;
  }
  .panel-title {
    font-weight: 600;
    font-size: 13px;
    flex-shrink: 0;
  }
  .dir-input {
    flex: 1;
    min-width: 0;
    font-size: 12px;
    font-family: var(--font-mono);
    padding: 2px 6px;
  }
  .browse-btn {
    padding: 2px 6px;
    font-size: 14px;
    flex-shrink: 0;
  }
  .show-all {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--fg-secondary);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .file-list {
    max-height: 200px;
    overflow-y: auto;
    overflow-x: hidden;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
  }
  .file-entry {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 4px 8px;
    border: none;
    border-bottom: 1px solid var(--border);
    background: transparent;
    text-align: left;
    font-size: 12px;
  }
  .file-entry:last-child {
    border-bottom: none;
  }
  .file-entry:hover {
    background: var(--bg-tertiary);
  }
  .file-entry.selected {
    background: var(--accent);
    color: var(--accent-fg);
  }
  .file-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }
  .file-size {
    color: var(--fg-muted);
    font-size: 11px;
    flex-shrink: 0;
  }
  .file-entry.selected .file-size {
    color: var(--accent-fg);
  }
</style>
