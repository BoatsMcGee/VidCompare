<script lang="ts">
  import { onMount } from 'svelte';
  import { listen } from '@tauri-apps/api/event';
  import { appState } from '../state/app.svelte';
  import { ipc, type MpvRect } from '../ipc';
  import { buildArgs } from '../options/args';
  import { t } from '../i18n/messages';

  /**
   * Full-page embed surface for the real video-compare window (Windows).
   *
   * Entering this page spawns video-compare via `embed_launch`; the backend
   * captures the child's top-level window, strips its frame, and positions
   * it over the surface below. The child keeps its own process, renderer,
   * and keyboard handling — the full upstream featureset and shortcuts work
   * unchanged. A rAF loop forwards the surface geometry (physical pixels)
   * so the captured window tracks layout changes. When the child exits, the
   * page returns to setup automatically. When capture fails or is
   * unsupported, the surface explains why and stays put so the user can go
   * back and launch externally instead.
   */
  let { binaryPath }: { binaryPath?: string | null } = $props();

  let embedId = $state<string | null>(null);
  let embedFailed = $state<string | null>(null);
  // Child process id regardless of capture success, so Back/unmount can
  // always kill it — including the external-window fallback.
  let childId: string | null = null;

  let surfaceEl = $state<HTMLDivElement | null>(null);

  let leftFile = $derived(appState.leftFile);
  let rightFile = $derived(appState.rightFiles[0] ?? null);
  let canCompare = $derived(!!leftFile && !!rightFile);

  // Aspect ratio (w/h) of the captured video-compare window, reported by
  // the backend at capture time. The surface is letterboxed to this so the
  // video is never stretched. Until known, fill the surface.
  let contentAspect = $state<number | null>(null);

  function measure(el: HTMLElement | null): MpvRect | null {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    let w = r.width;
    let h = r.height;
    if (contentAspect) {
      if (w / h > contentAspect) w = h * contentAspect;
      else h = w / contentAspect;
    }
    return {
      x: Math.round((r.left + (r.width - w) / 2) * dpr),
      y: Math.round((r.top + (r.height - h) / 2) * dpr),
      width: Math.round(w * dpr),
      height: Math.round(h * dpr),
    };
  }

  function back() {
    stopEmbed();
    appState.view = 'setup';
  }

  function stopEmbed() {
    const id = childId;
    childId = null;
    embedId = null;
    if (!id) return;
    void ipc.embedRelease(id).catch(() => undefined);
    void ipc.kill(id).catch(() => undefined);
  }

  async function compare() {
    if (!leftFile || !rightFile || !appState.profile) return;
    embedFailed = null;
    try {
      const rect = measure(surfaceEl);
      if (!rect) return;
      const args = buildArgs(appState.buildState, appState.profile);
      const result = await ipc.embedLaunch(binaryPath ?? '', args, rect);
      childId = result.id;
      embedId = result.embedded ? result.id : null;
      if (result.embedded && result.aspect && result.aspect > 0) {
        contentAspect = result.aspect;
      }
      if (!result.embedded) {
        embedFailed = result.reason ?? 'window capture failed';
      }
    } catch (e) {
      embedFailed = String(e);
    }
  }

  // Track the surface geometry so the captured window follows layout
  // changes. Identical rects are deduped here; the backend always
  // repositions because a window move leaves client coords unchanged.
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

    // Coalesce bursts of scroll/resize events into one IPC call per frame.
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
    // Moving the app window doesn't change client-relative rects, but the
    // captured child is positioned in screen space — force a re-push by
    // invalidating the dedupe cache.
    const unlistenMove = listen('tauri://move', () => {
      lastRect = null;
      schedule();
    });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      void unlistenMove.then((f) => f());
    };
  });

  // When the child process exits, return to the setup page.
  $effect(() => {
    const unlisten = listen<{ id: string; code: number | null }>('launch://exit', (e) => {
      if (childId && e.payload.id === childId) {
        childId = null;
        embedId = null;
        back();
      }
    });
    return () => {
      void unlisten.then((f) => f());
    };
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') back();
  }

  onMount(() => {
    // Auto-start once the surface is in the DOM and measurable.
    const frame = requestAnimationFrame(() => void compare());
    return () => {
      cancelAnimationFrame(frame);
      stopEmbed();
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="compare-page" aria-label={t('compare.title')}>
  <header class="compare-bar">
    <button class="back" onclick={back} data-testid="compare-back">{t('compare.back')}</button>
    <h1>{t('compare.title')}</h1>
    {#if embedId}
      <span class="status" data-testid="embed-active">{t('compare.embedded')}</span>
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
        {canCompare ? t('compare.starting') : t('compare.needBothFiles')}
      </span>
    {/if}
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
  .error {
    font-size: 12px;
    color: var(--danger);
    padding: 0 8px;
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
