<script lang="ts">
  import { appState } from '../state/app.svelte';
  import { buildArgs, formatCommand } from '../options/args';

  let { onLaunch }: { onLaunch: () => void } = $props();

  let args = $derived(appState.profile ? buildArgs(appState.buildState, appState.profile) : []);
  let command = $derived(formatCommand(args));
  let canLaunch = $derived(!!appState.leftFile && args.length > 0);

  function copy() {
    void navigator.clipboard.writeText(command);
  }
</script>

<div class="preview">
  <div class="command-wrap">
    <textarea
      class="command"
      readonly
      rows={Math.min(6, Math.max(2, command.split('\n').length))}
      spellcheck="false"
      aria-label="video-compare command"
      >{command}</textarea
    >
  </div>
  <div class="actions">
    <button onclick={copy} title="Copy command">📋</button>
    <button class="primary" onclick={onLaunch} disabled={!canLaunch}>▶ Launch</button>
  </div>
</div>

<style>
  .preview {
    display: flex;
    align-items: stretch;
    gap: 8px;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-secondary);
    margin-bottom: 12px;
  }
  .command-wrap {
    flex: 1;
    min-width: 0;
  }
  .command {
    width: 100%;
    height: 100%;
    resize: vertical;
    min-height: 44px;
    font-family: var(--font-mono);
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    overflow-wrap: anywhere;
    padding: 4px 8px;
    background: var(--bg);
    border-radius: var(--radius-sm);
    color: var(--fg);
  }
  .actions {
    display: flex;
    gap: 4px;
    align-items: flex-start;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
