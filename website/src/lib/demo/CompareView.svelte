<script lang="ts">
  /**
   * Demo mirror of the app's full-page CompareView: a bare embed surface
   * with no chrome of its own — the app header carries the back button.
   * Static — nothing is executed; the real app embeds the video-compare
   * window over the surface.
   */
  import { demo } from './state.svelte';

  const canCompare = $derived(!!demo.leftFile && !!demo.rightFile);
</script>

<section class="compare-page" aria-label="Embedded video-compare window">
  <div
    class="surface"
    role="application"
    aria-roledescription="Embedded video-compare window"
    aria-label="Embedded video-compare window"
  >
    <span class="placeholder">
      {canCompare
        ? 'video-compare will run embedded here — full keyboard shortcuts supported.'
        : 'Starting…'}
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
