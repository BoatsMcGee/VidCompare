<script lang="ts">
  import { demo } from '$lib/demo/state.svelte';
  import FilePanel from '$lib/demo/FilePanel.svelte';
  import CompareView from '$lib/demo/CompareView.svelte';
  import CompareSplitButton from '$lib/demo/CompareSplitButton.svelte';
  import OptionsForm from '$lib/demo/OptionsForm.svelte';
  import ActiveChips from '$lib/demo/ActiveChips.svelte';
  import CommandPreview from '$lib/demo/CommandPreview.svelte';
  import LogPanel from '$lib/demo/LogPanel.svelte';
  import ThemeToggle from '$lib/demo/ThemeToggle.svelte';
  import Logo from '$lib/Logo.svelte';
</script>

<svelte:head>
  <title>Demo — VidCompare</title>
</svelte:head>

<div class="demo-note container">
  <strong>Interactive demo</strong> — a faithful simulation of the desktop app using static mock
  data. Nothing is executed; the command preview updates as you change options.
</div>

<div class="app container">
  <header>
    {#if demo.view === 'compare'}
      <button
        class="back-btn"
        onclick={() => (demo.view = 'setup')}
        title="← Back"
        aria-label="← Back"
      >
        ←
      </button>
    {/if}
    <h1 class="app-title">
      <Logo class="app-logo" size={22} />
      VidCompare
    </h1>
    <div class="header-actions">
      <span class="badge badge-neutral">bundled · 20261004</span>
      <ThemeToggle />
      {#if demo.view !== 'compare'}
        <CompareSplitButton />
      {/if}
    </div>
  </header>

  {#if demo.view === 'compare'}
    <CompareView />
  {:else}
  <main>
    <div class="file-panels">
      <FilePanel side="left" />
      <div class="swap-col">
        <button onclick={() => demo.swapLeftRight()} title="Swap left and right">⇄</button>
      </div>
      <FilePanel side="right" />
    </div>

    <OptionsForm />

    <ActiveChips />
    <CommandPreview />
    {#if demo.hasVideoCompareOutput}
      <LogPanel />
    {/if}
  </main>
  {/if}
</div>

<style>
  .demo-note {
    padding-top: 16px;
    padding-bottom: 4px;
    font-size: 13px;
    color: var(--fg-secondary);
  }
  .app {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 140px);
    min-height: 560px;
    overflow: hidden;
    margin: 12px 0 24px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow-wrap: anywhere;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
  }
  header h1 {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
  }
  .back-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    margin-right: 4px;
    font-size: 15px;
    line-height: 1;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--fg);
    cursor: pointer;
  }
  .back-btn:hover {
    background: var(--bg-secondary);
  }
  /* .app-logo lives on the Logo child component's svg, so the selector must
     stay fully global for Svelte not to prune it as unused. */
  :global([data-theme='dark'] .app-logo) {
    color: #c0c4cc;
  }
  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  main {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
  }
  .file-panels {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 8px;
    margin-bottom: 12px;
    align-items: stretch;
  }
  .swap-col {
    display: flex;
    align-items: center;
  }
</style>
