<script lang="ts">
  import { appState } from '../state/app.svelte';
  import FindHelperDialog from './FindHelperDialog.svelte';
  import PresetsBar from './PresetsBar.svelte';

  let findKind = $state<string | null>(null);

  let groups = $derived(appState.profile?.groups ?? []);
  let options = $derived(appState.profile?.options ?? []);
  let activeGroup = $derived(appState.activeGroup);

  let groupOptions = $derived(
    options
      .filter((o) => o.group === activeGroup)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  );

  let leftOptions = $derived(groupOptions.filter((o) => o.appliesTo === 'left' || o.appliesTo === 'pair'));
  let rightOptions = $derived(groupOptions.filter((o) => o.appliesTo === 'right' || o.appliesTo === 'pair'));
  let globalOptions = $derived(groupOptions.filter((o) => o.appliesTo === 'global' || o.appliesTo === 'both'));

  // Unique id prefix for label/control association (a11y).
  const side = 'main';

  let searchResults = $derived(
    appState.searchQuery
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(appState.searchQuery.toLowerCase()) ||
            o.flag?.toLowerCase().includes(appState.searchQuery.toLowerCase()) ||
            o.help.toLowerCase().includes(appState.searchQuery.toLowerCase()),
        )
      : [],
  );

  function getValue(id: string) {
    return appState.optionValues[id]?.value ?? '';
  }

  function setValue(id: string, value: unknown) {
    appState.setOption(id, { ...appState.optionValues[id], value });
  }

  function getLinked(id: string) {
    return appState.optionValues[id]?.linked !== false;
  }

  function setLinked(id: string, linked: boolean) {
    appState.setOption(id, { ...appState.optionValues[id], linked });
  }

  function getLeftValue(id: string) {
    return appState.optionValues[id]?.leftValue ?? '';
  }

  function setLeftValue(id: string, value: unknown) {
    appState.setOption(id, { ...appState.optionValues[id], leftValue: value });
  }

  function getRightValue(id: string) {
    return appState.optionValues[id]?.rightValue ?? '';
  }

  function setRightValue(id: string, value: unknown) {
    appState.setOption(id, { ...appState.optionValues[id], rightValue: value });
  }
</script>

<div class="options-area">
  <PresetsBar />
  <div class="options-header">
    <input
      type="text"
      placeholder="🔍 Search options…"
      bind:value={appState.searchQuery}
      class="search"
    />
    <div class="group-tabs">
      {#each groups as g (g.id)}
        <button
          class:active={activeGroup === g.id}
          onclick={() => (appState.activeGroup = g.id)}
        >
          {g.label}
        </button>
      {/each}
    </div>
    <div class="helpers">
      <button onclick={() => (findKind = 'filters')} title="Run --find-filters">Find filters</button>
      <button onclick={() => (findKind = 'decoders')} title="Run --find-decoders">Find decoders</button>
    </div>
  </div>

  {#if appState.searchQuery && searchResults.length > 0}
    <div class="search-results">
      {#each searchResults as opt (opt.id)}
        <div class="search-result">
          <strong>{opt.label}</strong> <code>{opt.flag}</code> — {opt.help}
        </div>
      {/each}
    </div>
  {:else}
    <div class="columns">
      <div class="column">
        <h3><span class="badge badge-left">L</span> Left options</h3>
        {#each leftOptions as opt (opt.id)}
          {#if opt.appliesTo === 'pair'}
            <div class="option-row">
              <label for="opt-{side}-left-{opt.id}">{opt.label}</label>
              <div class="pair-field">
                <input
                  id="opt-{side}-left-{opt.id}"
                  type="text"
                  value={getLinked(opt.id) ? getValue(opt.id) : getLeftValue(opt.id)}
                  oninput={(e) => {
                    if (getLinked(opt.id)) setValue(opt.id, e.currentTarget.value);
                    else setLeftValue(opt.id, e.currentTarget.value);
                  }}
                  placeholder={opt.type.kind === 'string' ? opt.type.placeholder : ''}
                />
                <button
                  class="link-btn"
                  class:linked={getLinked(opt.id)}
                  onclick={() => setLinked(opt.id, !getLinked(opt.id))}
                  title={getLinked(opt.id) ? 'Unlink L/R' : 'Link L/R'}
                  aria-label={getLinked(opt.id) ? `Unlink ${opt.label} left/right values` : `Link ${opt.label} left/right values`}
                >
                  🔗
                </button>
              </div>
            </div>
          {:else}
            <div class="option-row">
              <label for="opt-{side}-{opt.id}">{opt.label}</label>
              {#if opt.type.kind === 'bool'}
                <input id="opt-{side}-{opt.id}" type="checkbox" checked={!!getValue(opt.id)} onchange={(e) => setValue(opt.id, e.currentTarget.checked)} />
              {:else if opt.type.kind === 'enum'}
                <select id="opt-{side}-{opt.id}" value={getValue(opt.id)} onchange={(e) => setValue(opt.id, e.currentTarget.value)}>
                  <option value="">—</option>
                  {#each opt.type.values as v (v.value)}
                    <option value={v.value}>{v.label}</option>
                  {/each}
                </select>
              {:else if opt.type.kind === 'number'}
                <input id="opt-{side}-{opt.id}" type="number" value={getValue(opt.id)} oninput={(e) => setValue(opt.id, e.currentTarget.valueAsNumber)} />
              {:else}
                <input id="opt-{side}-{opt.id}" type="text" value={getValue(opt.id)} oninput={(e) => setValue(opt.id, e.currentTarget.value)} placeholder={opt.type.kind === 'string' ? opt.type.placeholder : ''} />
              {/if}
            </div>
          {/if}
        {/each}
      </div>

      <div class="column">
        <h3><span class="badge badge-right">R</span> Right options</h3>
        {#each rightOptions as opt (opt.id)}
          {#if opt.appliesTo === 'pair'}
            <div class="option-row">
              <label for="opt-{side}-right-{opt.id}">{opt.label}</label>
              <div class="pair-field">
                <input
                  id="opt-{side}-right-{opt.id}"
                  type="text"
                  value={getLinked(opt.id) ? getValue(opt.id) : getRightValue(opt.id)}
                  oninput={(e) => {
                    if (getLinked(opt.id)) setValue(opt.id, e.currentTarget.value);
                    else setRightValue(opt.id, e.currentTarget.value);
                  }}
                  placeholder={opt.type.kind === 'string' ? opt.type.placeholder : ''}
                />
                <button
                  class="link-btn"
                  class:linked={getLinked(opt.id)}
                  onclick={() => setLinked(opt.id, !getLinked(opt.id))}
                  title={getLinked(opt.id) ? 'Unlink L/R' : 'Link L/R'}
                  aria-label={getLinked(opt.id) ? `Unlink ${opt.label} left/right values` : `Link ${opt.label} left/right values`}
                >
                  🔗
                </button>
              </div>
            </div>
          {:else}
            <div class="option-row">
              <label for="opt-{side}-{opt.id}">{opt.label}</label>
              {#if opt.type.kind === 'bool'}
                <input id="opt-{side}-{opt.id}" type="checkbox" checked={!!getValue(opt.id)} onchange={(e) => setValue(opt.id, e.currentTarget.checked)} />
              {:else if opt.type.kind === 'enum'}
                <select id="opt-{side}-{opt.id}" value={getValue(opt.id)} onchange={(e) => setValue(opt.id, e.currentTarget.value)}>
                  <option value="">—</option>
                  {#each opt.type.values as v (v.value)}
                    <option value={v.value}>{v.label}</option>
                  {/each}
                </select>
              {:else if opt.type.kind === 'number'}
                <input id="opt-{side}-{opt.id}" type="number" value={getValue(opt.id)} oninput={(e) => setValue(opt.id, e.currentTarget.valueAsNumber)} />
              {:else}
                <input id="opt-{side}-{opt.id}" type="text" value={getValue(opt.id)} oninput={(e) => setValue(opt.id, e.currentTarget.value)} placeholder={opt.type.kind === 'string' ? opt.type.placeholder : ''} />
              {/if}
            </div>
          {/if}
        {/each}
      </div>
    </div>

    {#if globalOptions.length > 0}
      <div class="shared">
        <h3>Shared (both sides)</h3>
        <div class="shared-grid">
          {#each globalOptions as opt (opt.id)}
            <div class="option-row">
              <label for="opt-{side}-{opt.id}">{opt.label}</label>
              {#if opt.type.kind === 'bool'}
                <input id="opt-{side}-{opt.id}" type="checkbox" checked={!!getValue(opt.id)} onchange={(e) => setValue(opt.id, e.currentTarget.checked)} />
              {:else if opt.type.kind === 'enum'}
                <select id="opt-{side}-{opt.id}" value={getValue(opt.id)} onchange={(e) => setValue(opt.id, e.currentTarget.value)}>
                  <option value="">—</option>
                  {#each opt.type.values as v (v.value)}
                    <option value={v.value}>{v.label}</option>
                  {/each}
                </select>
              {:else if opt.type.kind === 'number'}
                <input id="opt-{side}-{opt.id}" type="number" value={getValue(opt.id)} oninput={(e) => setValue(opt.id, e.currentTarget.valueAsNumber)} />
              {:else}
                <input id="opt-{side}-{opt.id}" type="text" value={getValue(opt.id)} oninput={(e) => setValue(opt.id, e.currentTarget.value)} placeholder={opt.type.kind === 'string' ? opt.type.placeholder : ''} />
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  {#if findKind}
    <FindHelperDialog kind={findKind} onClose={() => (findKind = null)} />
  {/if}
</div>

<style>
  .options-area {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px;
    background: var(--bg-secondary);
    margin-bottom: 12px;
  }
  .options-header {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    align-items: center;
  }
  .helpers {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }
  .helpers button {
    padding: 2px 8px;
    font-size: 11px;
  }
  .search {
    flex: 1;
    max-width: 300px;
  }
  .group-tabs {
    display: flex;
    gap: 2px;
    flex-wrap: wrap;
  }
  .group-tabs button {
    padding: 2px 8px;
    font-size: 12px;
  }
  .group-tabs button.active {
    background: var(--accent);
    color: var(--accent-fg);
    border-color: var(--accent);
  }
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .column h3 {
    font-size: 13px;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .option-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  .option-row label {
    min-width: 120px;
    font-size: 12px;
    color: var(--fg-secondary);
  }
  .option-row input[type='text'],
  .option-row input[type='number'],
  .option-row select {
    flex: 1;
    min-width: 0;
  }
  .pair-field {
    display: flex;
    gap: 4px;
    flex: 1;
  }
  .pair-field input {
    flex: 1;
    min-width: 0;
  }
  .link-btn {
    padding: 2px 4px;
    font-size: 12px;
    opacity: 0.4;
  }
  .link-btn.linked {
    opacity: 1;
    background: var(--accent);
    color: var(--accent-fg);
    border-color: var(--accent);
  }
  .shared {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }
  .shared h3 {
    font-size: 13px;
    margin-bottom: 6px;
  }
  .shared-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 4px 12px;
  }
  .search-results {
    max-height: 200px;
    overflow-y: auto;
  }
  .search-result {
    padding: 4px 8px;
    font-size: 12px;
    border-bottom: 1px solid var(--border);
  }
</style>
