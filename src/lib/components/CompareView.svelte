<script lang="ts">
  import { onMount } from 'svelte';
  import { listen } from '@tauri-apps/api/event';
  import { appState } from '../state/app.svelte';
  import { ipc, type MpvRect } from '../ipc';
  import { buildArgs } from '../options/args';
  import { t } from '../i18n/messages';

  /**
   * Embed surface for the real video-compare window (Windows).
   *
   * "Compare" spawns video-compare via `embed_launch`; the backend captures
   * the child's top-level window, strips its frame, and positions it over
   * the placeholder below. The child keeps its own process, renderer, and
   * keyboard handling — the full upstream featureset and shortcuts work
   * unchanged. A rAF loop forwards the surface geometry (physical pixels)
   * so the captured window tracks layout changes. When capture fails or is
   * unsupported, the launch falls back to a normal external window and the
   * placeholder explains why.
   */
  let { onExternal, binaryPath }: { onExternal?: () => void; binaryPath?: string | null } =
    $props();

  let embedId = $state<string | null>(null);
  let embedFailed = $state<string | null>(null);
  let busy = $state(false);
  let exited = $state(false);

  let surfaceEl = $state<HTMLDivElement | null>(null);

  let leftFile = $derived(appState.leftFile);
  let rightFile = $derived(appState.rightFiles[0] ?? null);
  let canCompare = $derived(!!leftFile && !!rightFile);

  function measure(el: HTMLElement | null): MpvRect | null {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return {
      x: Math.round(r.left * dpr),
      y: Math.round(r.top * dpr),
      width: Math.round(r.width * dpr),
      height: Math.round(r.height * dpr),
    };
  }

  async function compare() {
    if (!leftFile || !rightFile) return;
    busy = true;
    embedFailed = null;
    exited = false;
    try {
      const rect = measure(surfaceEl);
      if (!rect) return;
      const args = buildArgs(appState.buildState, appState.profile!);
      const result = await ipc.embedLaunch(binaryPath ?? '', args, rect);
      embedId = result.embedded ? result.id : null;
      if (!result.embedded) {
        embedFailed = result.reason ?? 'window capture failed';
      }
    } catch (e) {
      embedFailed = String(e);
    } finally {
      busy = false;
    }
  }

  // Track the surface geometry so the captured window follows layout
  // changes. The backend dedupes identical rects.
  //
  // rAF alone lags during scrolling: the browser may throttle frames and
  // the child window trails the surface by a frame or more. Scroll and
  // resize are therefore handled synchronously (capture phase, so we see
  // the event before the browser paints), with rAF as the catch-all for
  // every other layout change.
  $effect(() => {
    if (!embedId) return;
    const id = embedId;
    let lastRect: MpvRect | null = null;
    let frame = 0;
    let scheduled = false;

    const push = () => {
      scheduled = false;
      const rect = measure(surfaceEl);
      if (rect && JSON.stringify(rect) !== JSON.stringify(lastRect)) {
        lastRect = rect;
        void ipc.embedSetRect(id, rect, true).catch(() => undefined);
      }
    };

    // Coalesce bursts of scroll events into one IPC call per frame.
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      frame = requestAnimationFrame(push);
    };

    const tick = () => {
      push();
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
    };
  });

  // Watch for the child process exiting.
  $effect(() => {
    const unlisten = listen<{ id: string; code: number | null }>('launch://exit', (e) => {
      if (embedId && e.payload.id === embedId) {
        exited = true;
        embedId = null;
      }
    });
    return () => {
      void unlisten.then((f) => f());
    };
  });

  onMount(() => {
    return () => {
      if (embedId) void ipc.embedRelease(embedId).catch(() => undefined);
    };
  });
</script>

<section class="compare" aria-label={t('compare.title')}>
  <header class="compare-header">
    <h2>{t('compare.title')}</h2>
    {#if embedId}
      <span class="status" data-testid="embed-active">{t('compare.embedded')}</span>
    {:else if exited}
      <span class="status muted">{t('compare.exited')}</span>
    {/if}
  </header>

  <div
    class="surface"
    data-testid="surface"
    bind:this={surfaceEl}
    role="application"
    aria-roledescription={t('compare.surfaceRole')}
    aria-label={t('compare.title')}
  >
    {#if embedFailed}
      <p class="error" role="alert">{embedFailed}</p>
    {:else if embedId}
      <!-- captured video-compare window renders here -->
    {:else}
      <span class="placeholder">
        {canCompare
          ? t('compare.readyHint')
          : t('compare.needBothFiles')}
      </span>
    {/if}
  </div>

  <div class="controls" role="group" aria-label={t('compare.title')}>
    <button class="primary" onclick={compare} disabled={!canCompare || busy} data-testid="compare-launch">
      {busy ? t('compare.starting') : t('compare.start')}
    </button>
    {#if onExternal}
      <button class="external" onclick={onExternal} disabled={!canCompare || busy} data-testid="open-external">
        {t('compare.external')}
      </button>
    {/if}
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
  .compare-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  .compare-header h2 {
    font-size: 13px;
    font-weight: 600;
  }
  .status {
    font-size: 11px;
    color: var(--success);
  }
  .status.muted {
    color: var(--fg-muted);
  }
  .error {
    font-size: 12px;
    color: var(--danger);
    padding: 0 8px;
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
