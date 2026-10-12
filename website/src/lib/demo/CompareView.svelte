<script lang="ts">
  /**
   * Demo mirror of the app's full-page CompareView: a slim bar with a Back
   * button and a full-window embed surface. Static — nothing is executed;
   * the real app embeds the video-compare window over the surface.
   */
  import { demo } from './state.svelte';

  const canCompare = $derived(!!demo.leftFile && !!demo.rightFile);

  function back() {
    demo.view = 'setup';
  }
</script>

<section class="compare-page" aria-label="Compare">
  <header class="compare-bar">
    <button class="back" onclick={back}>← Back</button>
    <h1>Compare</h1>
    <span class="status">embedded</span>
  </header>

  <div
    class="surface"
    role="application"
    aria-roledescription="Embedded video-compare window"
    aria-label="Compare"
  >
    <span class="placeholder">
      {canCompare
        ? 'video-compare will run embedded here — full keyboard shortcuts supported.'
        : 'Select both a left and a right file to compare.'}
    </span>
  </div>
</section>

<style>
  .compare-page {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .compare-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
  }
  .compare-bar h1 {
    font-size: 13px;
    font-weight: 600;
  }
  .status {
    font-size: 11px;
    color: var(--success);
    margin-left: auto;
  }
  .surface {
    position: relative;
    flex: 1;
    min-height: 0;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
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
</style>
