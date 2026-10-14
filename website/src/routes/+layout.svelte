<script lang="ts">
  import '../styles/theme.css';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import { initTheme, cycleTheme, getThemeSetting } from '$lib/theme.svelte';

  let { children }: { children: Snippet } = $props();

  onMount(() => initTheme());

  const themeIcons = { system: '🖥', light: '☀️', dark: '🌙' } as const;
  let setting = $derived(getThemeSetting());
</script>

<header class="site-header">
  <a class="site-logo" href="{base}/"><img class="logo-icon" src="{base}/logo.svg" alt="" width="20" height="20" />VidCompare</a>
  <nav class="site-nav">
    <a href="{base}/">Home</a>
    <a href="{base}/demo/">Demo</a>
    <a href="{base}/docs/">Docs</a>
    <a href="{base}/docs/changelog/">Changelog</a>
    <a href="{base}/gallery/">Gallery</a>
    <a href="{base}/#download">Download</a>
    <a href="https://github.com/BoatsMcGee/VidCompare">Repository</a>
    <button
      type="button"
      class="theme-toggle"
      onclick={cycleTheme}
      title="Theme: {setting} (click to change)"
      aria-label="Theme: {setting}. Activate to switch theme."
    >{themeIcons[setting]}</button>
  </nav>
</header>

{@render children()}

<footer class="site-footer">
  <div class="footer-inner">
    <div>
      <a href="{base}/docs/">Documentation</a>
      <a href="{base}/demo/">Live demo</a>
      <a href="{base}/docs/changelog/">Changelog</a>
      <a href="https://github.com/BoatsMcGee/VidCompare">Repository</a>
    </div>
  </div>
</footer>

<style>
  .site-logo {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .logo-icon {
    display: block;
  }
  .theme-toggle {
    padding: 2px 8px;
    font-size: 14px;
    line-height: 1.4;
  }
</style>
