<script lang="ts">
  import { appState } from '../state/app.svelte';
  import type { OptionSpec } from '../options/profile';

  let activeOptions = $derived(
    Object.entries(appState.optionValues)
      .filter(([, v]) => {
        if (v.value !== undefined && v.value !== null && v.value !== '' && v.value !== false) return true;
        if (v.leftValue !== undefined && v.leftValue !== null && v.leftValue !== '' && v.leftValue !== false) return true;
        if (v.rightValue !== undefined && v.rightValue !== null && v.rightValue !== '' && v.rightValue !== false) return true;
        return false;
      })
      .map(([id, v]) => {
        const spec = appState.profile?.options.find((o) => o.id === id);
        return { id, spec, value: v };
      }),
  );

  function formatValue(spec: OptionSpec | undefined, v: { value?: unknown; leftValue?: unknown; rightValue?: unknown; linked?: boolean }): string {
    if (!spec) return '';
    if (spec.appliesTo === 'pair' && v.linked === false) {
      const l = v.leftValue !== undefined && v.leftValue !== '' ? String(v.leftValue) : '—';
      const r = v.rightValue !== undefined && v.rightValue !== '' ? String(v.rightValue) : '—';
      return `L=${l} R=${r}`;
    }
    return String(v.value ?? '');
  }
</script>

{#if activeOptions.length > 0}
  <div class="chips">
    <span class="label">Active:</span>
    {#each activeOptions as opt (opt.id)}
      <span class="chip">
        {opt.spec?.label ?? opt.id}={formatValue(opt.spec, opt.value)}
        <button onclick={() => appState.resetOption(opt.id)}>✕</button>
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
