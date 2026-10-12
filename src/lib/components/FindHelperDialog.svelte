<script lang="ts">
  import { ipc } from '../ipc';

  let { kind, onClose }: { kind: string; onClose: () => void } = $props();

  let term = $state('');
  let result = $state('');
  let loading = $state(false);

  async function search() {
    loading = true;
    try {
      result = await ipc.runInfoCommand(kind, term);
    } catch (e) {
      result = String(e);
    }
    loading = false;
  }
</script>

<div
  class="dialog-overlay"
  onclick={() => onClose()}
  onkeydown={(e: KeyboardEvent) => e.key === 'Escape' && onClose()}
  role="presentation"
>
  <div
    class="dialog"
    role="dialog"
    aria-modal="true"
    aria-label="Find {kind}"
      tabindex="0"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
    <h3>Find {kind}</h3>
    <div class="search-row">
      <input
        type="text"
        bind:value={term}
        placeholder="Search term…"
        aria-label="Search term"
        disabled={loading}
        onkeydown={(e) => e.key === 'Enter' && search()}
      />
      <button onclick={search} disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
    </div>
    <pre class="result" aria-busy={loading}>{loading ? 'Searching…' : result || 'Enter a search term and click Search.'}</pre>
    <button onclick={onClose}>Close</button>
  </div>
</div>

<style>
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .dialog {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    width: 600px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .search-row {
    display: flex;
    gap: 4px;
  }
  .search-row input {
    flex: 1;
  }
  .result {
    flex: 1;
    overflow: auto;
    background: var(--log-bg);
    color: var(--log-fg);
    padding: 8px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 12px;
    max-height: 400px;
    white-space: pre-wrap;
  }
</style>
