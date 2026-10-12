<script lang="ts">
  import '../styles/theme.css';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  onMount(() => {
    // Follow the OS theme while the visitor is on "system".
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem('vc-theme');
      } catch {
        /* ignore */
      }
      if (stored !== 'light' && stored !== 'dark') {
        document.documentElement.setAttribute('data-theme', media.matches ? 'dark' : 'light');
      }
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  });
</script>

<header class="site-header">
  <a class="site-logo" href="{base}/">VidCompare</a>
  <nav class="site-nav">
    <a href="{base}/">Home</a>
    <a href="{base}/demo/">Demo</a>
    <a href="{base}/docs/">Docs</a>
    <a href="{base}/docs/changelog/">Changelog</a>
    <a href="{base}/gallery/">Gallery</a>
  </nav>
</header>

{@render children()}

<footer class="site-footer">
  <div class="footer-inner">
    <div>
      VidCompare is free software licensed under
      <a href="https://www.gnu.org/licenses/gpl-3.0.html">GPL-3.0-only</a>.
      It launches <a href="https://github.com/pixop/video-compare">pixop/video-compare</a> as an
      external process.
    </div>
    <div>
      <a href="{base}/docs/">Documentation</a>
      <a href="{base}/demo/">Live demo</a>
      <a href="{base}/docs/changelog/">Changelog</a>
    </div>
  </div>
</footer>
