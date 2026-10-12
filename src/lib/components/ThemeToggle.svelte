<script lang="ts">
  import { appState } from '../state/app.svelte';
  import { ipc } from '../ipc';

  const order: ('light' | 'dark' | 'system')[] = ['system', 'light', 'dark'];

  async function cycle() {
    const idx = order.indexOf(appState.theme);
    const next = order[(idx + 1) % order.length];
    appState.theme = next;
    if (appState.settings) {
      appState.settings.theme = next;
      try {
        await ipc.saveSettings(appState.settings);
      } catch (e) {
        console.error(e);
      }
    }
  }

  let icon = $derived(appState.theme === 'light' ? '☀️' : appState.theme === 'dark' ? '🌙' : '◐');
</script>

<button onclick={cycle} title="Theme: {appState.theme}">{icon}</button>
