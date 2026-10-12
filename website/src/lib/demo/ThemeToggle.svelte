<script lang="ts">
  import { demo } from './state.svelte';

  function cycle() {
    const order: ('light' | 'dark' | 'system')[] = ['system', 'light', 'dark'];
    const idx = order.indexOf(demo.theme);
    demo.applyTheme(order[(idx + 1) % order.length]);
  }

  let icon = $derived(
    demo.theme === 'light' ? '☀️' : demo.theme === 'dark' ? '🌙' : '◐'
  );
</script>

<button onclick={cycle} title="Theme: {demo.theme}">{icon}</button>
