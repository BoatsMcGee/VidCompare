<script lang="ts">
  import { t } from '../i18n/messages';

  /**
   * Split button: primary "Compare" action plus a dropdown chevron exposing
   * "Launch in separate window". Compare enters the embedded compare page;
   * Launch spawns video-compare as an external window.
   */
  let {
    disabled = false,
    onCompare,
    onLaunch,
  }: { disabled?: boolean; onCompare: () => void; onLaunch: () => void } = $props();

  let open = $state(false);
  let rootEl = $state<HTMLDivElement | null>(null);

  function toggle() {
    open = !open;
  }

  function pickLaunch() {
    open = false;
    onLaunch();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      open = false;
      e.stopPropagation();
    }
  }

  function handlePointerDown(e: PointerEvent) {
    if (open && rootEl && !rootEl.contains(e.target as Node)) open = false;
  }
</script>

<svelte:window onpointerdown={handlePointerDown} onkeydown={handleKeydown} />

<div class="split" bind:this={rootEl}>
  <button class="primary main" onclick={onCompare} {disabled} data-testid="compare-button">
    ▶ {t('compare.title')}
  </button>
  <button
    class="primary chevron"
    onclick={toggle}
    {disabled}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label={t('compare.launchExternal')}
    data-testid="compare-menu-toggle"
  >
    ▾
  </button>
  {#if open}
    <div class="menu" role="menu">
      <button role="menuitem" onclick={pickLaunch} data-testid="launch-external">
        {t('compare.launchExternal')}
      </button>
    </div>
  {/if}
</div>

<style>
  .split {
    position: relative;
    display: inline-flex;
  }
  .main {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }
  .chevron {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    border-left: 1px solid var(--border);
    padding-left: 6px;
    padding-right: 6px;
  }
  .menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 20;
    min-width: 100%;
    white-space: nowrap;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.25);
    padding: 4px;
  }
  .menu button {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    color: var(--fg);
    cursor: pointer;
  }
  .menu button:hover {
    background: var(--bg);
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
