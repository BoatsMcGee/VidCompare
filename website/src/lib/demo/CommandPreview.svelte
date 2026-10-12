<script lang="ts">
  import { demo } from './state.svelte';
  import { buildArgs, formatCommand } from './demo-args';
  import { demoOptions } from './mock-data';

  let args = $derived(
    demo.leftFile && demo.rightFile
      ? buildArgs(demoOptions, demo.optionValues, demo.leftFile, demo.rightFile)
      : []
  );
  let command = $derived(formatCommand(args));

  function copy() {
    navigator.clipboard?.writeText(command);
  }
</script>

<div class="preview">
  <div class="command-wrap">
    <textarea
      class="command"
      readonly
      rows={Math.min(6, Math.max(2, command.split('\n').length))}
      spellcheck="false"
      aria-label="video-compare command">{command}</textarea
    >
  </div>
  <div class="actions">
    <button onclick={copy} title="Copy command">📋</button>
    <button class="primary" onclick={() => demo.launch(command)}>▶ Launch</button>
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
</style>
