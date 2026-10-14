<script lang="ts">
  import { shotUrl } from './site';
  import { getResolvedTheme, type ResolvedTheme } from './theme.svelte';

  let {
    file,
    caption,
    theme
  }: { file: string; caption?: string; theme?: ResolvedTheme } = $props();

  // Swap a `-light`/`-dark` filename suffix for the active theme's variant.
  let themedFile = $derived.by(() => {
    const t = theme ?? getResolvedTheme();
    const m = file.match(/^(.*)-(light|dark)(\.[^.]+)$/);
    return m ? `${m[1]}-${t}${m[3]}` : file;
  });

  let failed = $state(false);
  let open = $state(false);
  let zoom = $state(1);

  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.25;

  function openModal() {
    zoom = 1;
    open = true;
  }

  function closeModal() {
    open = false;
  }

  function zoomIn() {
    zoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
  }

  function zoomOut() {
    zoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeModal();
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else if (e.deltaY > 0) zoomOut();
  }
</script>

{#if failed}
  <figure class="placeholder">
    <div class="placeholder-inner">🖼 {file}</div>
    {#if caption}<figcaption>{caption}</figcaption>{/if}
  </figure>
{:else}
  <figure>
    <button type="button" class="shot-btn" onclick={openModal} aria-label="View {caption ?? file} fullscreen">
      <img
        src={shotUrl(themedFile)}
        alt={caption ?? file}
        loading="lazy"
        onerror={() => (failed = true)}
      />
    </button>
    {#if caption}<figcaption>{caption}</figcaption>{/if}
  </figure>
{/if}

{#if open}
  <div
    class="overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Screenshot preview: {caption ?? file}"
    tabindex="-1"
    onclick={closeModal}
    onkeydown={onKeydown}
    onwheel={onWheel}
  >
    <div class="toolbar" onclick={(e) => e.stopPropagation()}>
      <button type="button" onclick={zoomOut} aria-label="Zoom out">−</button>
      <span class="zoom-level">{Math.round(zoom * 100)}%</span>
      <button type="button" onclick={zoomIn} aria-label="Zoom in">+</button>
      <button type="button" class="close" onclick={closeModal} aria-label="Close preview">✕</button>
    </div>
    <div class="stage">
      <img
        src={shotUrl(themedFile)}
        alt={caption ?? file}
        style="transform: scale({zoom});"
        onclick={(e) => e.stopPropagation()}
      />
    </div>
  </div>
{/if}

<style>
  figure {
    margin: 0;
  }
  .shot-btn {
    display: block;
    width: 100%;
    padding: 0;
    border: none;
    background: none;
    cursor: zoom-in;
  }
  img {
    display: block;
    width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-secondary);
  }
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    flex-direction: column;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
    padding: 12px 16px;
  }
  .toolbar button {
    background: var(--bg-secondary);
    color: var(--fg-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    width: 36px;
    height: 36px;
    font-size: 18px;
    cursor: pointer;
  }
  .toolbar .zoom-level {
    color: var(--fg-secondary);
    font-size: 13px;
    min-width: 48px;
    text-align: center;
  }
  .stage {
    flex: 1;
    overflow: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .stage img {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    transition: transform 0.15s ease;
    cursor: default;
  }
  figcaption {
    font-size: 12px;
    color: var(--fg-secondary);
    margin-top: 6px;
    text-align: center;
  }
  .placeholder-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 16 / 10;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    background: var(--bg-secondary);
    color: var(--fg-muted);
    font-size: 13px;
    padding: 12px;
    text-align: center;
    word-break: break-all;
  }
</style>
