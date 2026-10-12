<script lang="ts">
  import { appState } from '../state/app.svelte';
  import { listen } from '@tauri-apps/api/event';
  import { onMount } from 'svelte';

  let contentEl = $state<HTMLDivElement | null>(null);

  function clearActive() {
    const session = appState.activeSession;
    if (session) session.lines = [];
  }

  onMount(() => {
    const unlistenStdout = listen<{ id: string; line: string }>('launch://stdout', (e) => {
      const session = appState.sessions.find((s) => s.id === e.payload.id);
      if (session) session.lines = [...session.lines, { stream: 'stdout', text: e.payload.line }];
    });
    const unlistenStderr = listen<{ id: string; line: string }>('launch://stderr', (e) => {
      const session = appState.sessions.find((s) => s.id === e.payload.id);
      if (session) session.lines = [...session.lines, { stream: 'stderr', text: e.payload.line }];
    });
    const unlistenExit = listen<{ id: string; code: number | null }>('launch://exit', (e) => {
      const session = appState.sessions.find((s) => s.id === e.payload.id);
      if (session) session.exitCode = e.payload.code;
    });
    return () => {
      void unlistenStdout.then((f) => f());
      void unlistenStderr.then((f) => f());
      void unlistenExit.then((f) => f());
    };
  });
</script>

<div class="log-panel">
  <div class="log-header">
    <span class="log-title">video-compare output</span>
    <div class="session-tabs">
      {#each appState.sessions as s (s.id)}
        <button
          class:active={appState.activeSessionId === s.id}
          onclick={() => (appState.activeSessionId = s.id)}
        >
          {s.id.slice(0, 8)} {s.exitCode !== null ? `(${s.exitCode})` : '(running)'}
        </button>
      {/each}
    </div>
    <button onclick={() => clearActive()} title="Clear output">Clear</button>
  </div>
  <div class="log-content" bind:this={contentEl}>
    {#if appState.activeSession}
      {#each appState.activeSession.lines as line, i (i)}
        <div class="log-line" class:stderr={line.stream === 'stderr'}>{line.text}</div>
      {/each}
    {:else if appState.sessions.length > 0}
      <div class="log-empty">Select a session tab to view its output.</div>
    {:else}
      <div class="log-empty">video-compare output appears here after you launch it.</div>
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
