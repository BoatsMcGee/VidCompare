<script lang="ts">
  /**
   * Demo mirror of the app's CompareView: a single 16:9 embed surface with a
   * Compare button and a separate-window backup. Static — nothing is
   * executed; the real app embeds the video-compare window here.
   */
  import { demo } from './state.svelte';

  const leftFile = $derived(demo.leftFile);
  const rightFile = $derived(demo.rightFile);
  const canCompare = $derived(!!leftFile && !!rightFile);
</script>

<section class="compare" aria-label="Compare">
  <header class="compare-header">
    <h2>Compare</h2>
  </header>

  <div class="surface" role="application" aria-roledescription="Embedded video-compare window" aria-label="Compare">
    <span class="placeholder">
      {canCompare
        ? 'video-compare will run embedded here — full keyboard shortcuts supported.'
        : 'Select both a left and a right file to compare.'}
    </span>
  </div>

  <div class="controls" role="group" aria-label="Compare">
    <button class="primary" disabled={!canCompare}>▶ Compare</button>
    <button class="external" disabled={!canCompare}>Open in separate window</button>
  </div>
</section>

<style>
  .compare {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-secondary);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }
  .compare-header h2 {
    font-size: 13px;
    font-weight: 600;
  }
  .surface {
    position: relative;
    aspect-ratio: 16 / 9;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    overflow: hidden;
  }
  .placeholder {
    font-size: 12px;
    color: var(--fg-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 90%;
  }
  .controls {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .controls .external {
    margin-left: auto;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
