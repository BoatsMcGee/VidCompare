<script lang="ts">
  import { appState } from '../state/app.svelte';
  import { ipc, type FileEntry } from '../ipc';
  import { open } from '@tauri-apps/plugin-dialog';
  import { getCurrentWebview } from '@tauri-apps/api/webview';
  import { parentDir } from '../path';
  import { t } from '../i18n/messages';

  let { side }: { side: 'left' | 'right' } = $props();

  let panelEl = $state<HTMLElement | null>(null);
  let draftDir = $state('');
  let pathError = $state(false);
  let dragActive = $state(false);
  let dragPos = $state<{ x: number; y: number } | null>(null);

  let dir = $derived(side === 'left' ? appState.leftDir : appState.rightDir);
  let files = $derived(side === 'left' ? appState.leftEntries : appState.rightEntries);
  let showAll = $derived(side === 'left' ? appState.leftShowAll : appState.rightShowAll);
  let selected = $derived(side === 'left' ? appState.leftFile : appState.rightFiles[0] ?? null);

  function insideDrop(pos: { x: number; y: number }): boolean {
    if (!panelEl) return false;
    const rect = panelEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const x = pos.x / dpr;
    const y = pos.y / dpr;
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  let dragOver = $derived(dragActive && dragPos !== null && insideDrop(dragPos));

  $effect(() => {
    draftDir = dir;
    pathError = false;
  });

  async function loadFiles(d: string): Promise<boolean> {
    try {
      const entries = await ipc.listMediaFiles(d, showAll);
      if (side === 'left') appState.leftEntries = entries;
      else appState.rightEntries = entries;
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function setDir(d: string): Promise<boolean> {
    if (side === 'left') appState.leftDir = d;
    else appState.rightDir = d;
    const ok = await loadFiles(d);
    pathError = !ok;
    return ok;
  }

  async function commitDir() {
    const d = draftDir.trim();
    if (!d || d === dir) {
      draftDir = dir;
      return;
    }
    const ok = await setDir(d);
    if (!ok) draftDir = dir;
  }

  async function browse() {
    const selected = await open({
      multiple: false,
      filters: [
        { name: 'Video files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'ts', 'm2ts', 'mts', 'mpg', 'mpeg', 'wmv', 'flv', 'ogv', 'm4v', 'y4m', '3gp', 'vob', 'divx', 'rmvb', 'gif', 'apng', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'jxl', 'bmp', 'tiff', 'exr'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (selected && typeof selected === 'string') {
      if (side === 'left') appState.leftFile = { path: selected };
      else appState.rightFiles = [{ path: selected }, ...appState.rightFiles.slice(1)];
      await setDir(parentDir(selected));
    }
  }

  async function handleDrop(path: string) {
    try {
      const info = await ipc.describePath(path);
      if (info.is_dir) {
        await setDir(path);
      } else {
        if (side === 'left') appState.leftFile = { path };
        else appState.rightFiles = [{ path }, ...appState.rightFiles.slice(1)];
        await setDir(parentDir(path));
      }
    } catch (e) {
      console.error(e);
    }
  }

  $effect(() => {
    // Drag-drop is Tauri-only: getCurrentWebview() throws outside a Tauri
    // webview (browser-mode E2E), and an exception here aborts Svelte's
    // flush, dropping queued renders app-wide.
    let unlisten: Promise<() => void> | undefined;
    try {
      unlisten = getCurrentWebview().onDragDropEvent((event) => {
        const payload = event.payload;
        if (payload.type === 'enter' || payload.type === 'over') {
          dragActive = true;
          dragPos = { x: payload.position.x, y: payload.position.y };
        } else if (payload.type === 'drop') {
          dragPos = { x: payload.position.x, y: payload.position.y };
          const over = insideDrop(payload.position);
          dragActive = false;
          if (over && payload.paths.length > 0) void handleDrop(payload.paths[0]);
        } else {
          dragActive = false;
          dragPos = null;
        }
      });
    } catch {
      return;
    }
    return () => {
      void unlisten?.then((f) => f());
    };
  });

  async function toggleShowAll() {
    if (side === 'left') appState.leftShowAll = !appState.leftShowAll;
    else appState.rightShowAll = !appState.rightShowAll;
    if (dir) await loadFiles(dir);
  }

  function selectFile(entry: FileEntry) {
    if (side === 'left') {
      appState.leftFile = { path: entry.path };
    } else {
      appState.rightFiles = [{ path: entry.path }, ...appState.rightFiles.slice(1)];
    }
  }

  function listBackgroundClick(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.file-entry, .empty')) return;
    void browse();
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
</script>

<div class="panel" class:drag-over={dragOver} bind:this={panelEl}>
  <div class="panel-header">
    <span class="badge {side === 'left' ? 'badge-left' : 'badge-right'}">{side === 'left' ? 'L' : 'R'}</span>
    <span class="panel-title">{side === 'left' ? t('filePanel.left') : t('filePanel.right')}</span>
    <input
      class="dir-input"
      class:error={pathError}
      type="text"
      bind:value={draftDir}
      placeholder={t('filePanel.pathPlaceholder')}
      aria-label={t('filePanel.folderPath')}
      title={pathError ? t('filePanel.pathInvalid') : ''}
      onkeydown={(e) => e.key === 'Enter' && commitDir()}
      onblur={commitDir}
    />
    <button class="browse-btn" onclick={browse} aria-label={t('filePanel.browse')}>📂</button>
    <label class="show-all">
      <input type="checkbox" checked={showAll} onchange={toggleShowAll} />
      {t('filePanel.showAll')}
    </label>
  </div>

  <!-- Pointer-only shortcut: clicking the list background opens the file
       dialog. The keyboard-accessible path is the browse button/empty state. -->
  <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
  <div class="file-list" onclick={listBackgroundClick}>
    {#each files as entry (entry.path)}
      <button
        class="file-entry"
        class:selected={selected?.path === entry.path}
        title={entry.name}
        onclick={() => selectFile(entry)}
      >
        <span class="file-name">{entry.name}</span>
        <span class="file-size">{formatSize(entry.size)}</span>
      </button>
    {/each}
    {#if files.length === 0}
      <button class="empty" onclick={browse}>{t('filePanel.empty')}</button>
    {/if}
  </div>
</div>

<style>
  .panel {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px;
    background: var(--bg-secondary);
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .panel.drag-over {
    border-color: var(--accent);
    outline: 2px dashed var(--accent);
    outline-offset: -4px;
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
  .dir-input.error {
    border-color: var(--danger);
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
    flex: 1;
    min-height: 48px;
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
  .show-all {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    font-size: 12px;
    color: var(--fg-secondary);
  }
  .empty {
    display: block;
    width: 100%;
    padding: 12px 8px;
    border: none;
    background: transparent;
    color: var(--fg-muted);
    font-size: 12px;
    text-align: center;
    cursor: pointer;
  }
  .empty:hover {
    background: var(--bg-tertiary);
    color: var(--fg-secondary);
  }
</style>
