<script lang="ts">
  import { demo } from './state.svelte';

  interface Preset {
    name: string;
    options: Record<string, unknown>;
  }

  let presets = $state<Preset[]>([
    { name: 'HDR nits check', options: { 'left-peak-nits': { value: 1000 }, 'right-peak-nits': { value: 600 } } },
    { name: 'HW decode', options: { hwaccel: { value: 'cuda' } } }
  ]);
  let newName = $state('');

  function save() {
    if (!newName.trim()) return;
    presets = [...presets, { name: newName.trim(), options: { ...demo.optionValues } }];
    newName = '';
  }

  function load(p: Preset) {
    demo.optionValues = { ...(p.options as typeof demo.optionValues) };
  }

  function remove(index: number) {
    presets = presets.filter((_, i) => i !== index);
  }
</script>

<div class="presets">
  <span class="label">Presets:</span>
  {#each presets as p, i (i)}
    <button onclick={() => load(p)}>{p.name}</button>
    <button class="remove" onclick={() => remove(i)}>✕</button>
  {/each}
  <input
    type="text"
    bind:value={newName}
    placeholder="New preset name…"
    onkeydown={(e) => e.key === 'Enter' && save()}
  />
  <button onclick={save}>Save</button>
</div>

<style>
  .presets {
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
  .presets button {
    padding: 2px 8px;
    font-size: 12px;
  }
  .presets .remove {
    padding: 2px 4px;
    font-size: 10px;
  }
  .presets input {
    width: 140px;
    font-size: 12px;
  }
</style>
