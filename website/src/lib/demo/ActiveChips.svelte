<script lang="ts">
  import { demo } from './state.svelte';
  import { demoOptions } from './mock-data';

  let activeOptions = $derived(
    Object.keys(demo.optionValues)
      .map((id) => ({ id, spec: demoOptions.find((o) => o.id === id), text: demo.formatOption(id) }))
      .filter((o) => o.text !== null)
  );
</script>

{#if activeOptions.length > 0}
  <div class="chips">
    <span class="label">Active:</span>
    {#each activeOptions as opt (opt.id)}
      <span class="chip">
        {opt.spec?.label ?? opt.id}={opt.text}
        <button onclick={() => demo.resetOption(opt.id)}>✕</button>
      </span>
    {/each}
  </div>
{/if}

<style>
  .chips {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }
  .label {
    font-size: 12px;
    color: var(--fg-secondary);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 1px 6px;
    background: var(--bg-tertiary);
    border-radius: 10px;
    font-size: 11px;
  }
  .chip button {
    padding: 0 2px;
    font-size: 10px;
    border: none;
    background: transparent;
  }
</style>
