<script lang="ts">
  import { demo } from './state.svelte';
</script>

<div class="log-panel">
  <div class="log-header">
    <span class="log-title">video-compare output</span>
    <div class="session-tabs">
      {#each demo.sessions as s (s.id)}
        <button
          class:active={demo.activeSessionId === s.id}
          onclick={() => (demo.activeSessionId = s.id)}
        >
          {s.id.slice(0, 8)}
          {s.exitCode !== null ? `(${s.exitCode})` : '(running)'}
        </button>
      {/each}
    </div>
  </div>
  <div class="log-content">
    {#if demo.activeSession}
      {#each demo.activeSession.lines as line, i (i)}
        <div class="log-line" class:stderr={line.stream === 'stderr'}>{line.text}</div>
      {/each}
    {:else if demo.sessions.length > 0}
      <div class="log-empty">Select a session tab to view its output.</div>
    {/if}
  </div>
</div>

<style>
  .log-panel {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--log-bg);
    color: var(--log-fg);
    height: 180px;
    display: flex;
    flex-direction: column;
  }
  .log-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background: var(--bg-secondary);
    color: var(--fg);
    border-bottom: 1px solid var(--border);
    border-radius: var(--radius) var(--radius) 0 0;
  }
  .log-title {
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .session-tabs {
    display: flex;
    gap: 2px;
    flex: 1;
  }
  .session-tabs button {
    padding: 1px 6px;
    font-size: 11px;
  }
  .session-tabs button.active {
    background: var(--accent);
    color: var(--accent-fg);
  }
  .log-content {
    flex: 1;
    overflow-y: auto;
    padding: 4px 8px;
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .log-line {
    white-space: pre-wrap;
    word-break: break-all;
  }
  .log-line.stderr {
    color: var(--log-stderr);
  }
  .log-empty {
    color: var(--fg-muted);
    font-style: italic;
  }
</style>
