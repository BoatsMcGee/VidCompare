<script lang="ts">
  /**
   * Demo mirror of the app's header split button: primary "Compare" enters
   * the compare page; the chevron opens a menu with "Launch in separate
   * window" (static in the demo).
   */
  import { demo } from './state.svelte';

  const canCompare = $derived(!!demo.leftFile && !!demo.rightFile);

  let open = $state(false);

  function compare() {
    if (!canCompare) return;
    demo.view = 'compare';
  }
</script>

<div class="split">
  <button class="primary main" onclick={compare} disabled={!canCompare}>▶ Compare</button>
  <button
    class="primary chevron"
    onclick={() => (open = !open)}
    disabled={!canCompare}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-label="Launch in separate window"
  >
    ▾
  </button>
  {#if open}
    <div class="menu" role="menu">
      <button role="menuitem" onclick={() => (open = false)}>Launch in separate window</button>
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
