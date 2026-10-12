<script lang="ts">
  import { shotUrl } from './site';

  let { file, caption }: { file: string; caption?: string } = $props();

  let failed = $state(false);
</script>

{#if failed}
  <figure class="placeholder">
    <div class="placeholder-inner">🖼 {file}</div>
    {#if caption}<figcaption>{caption}</figcaption>{/if}
  </figure>
{:else}
  <figure>
    <img
      src={shotUrl(file)}
      alt={caption ?? file}
      loading="lazy"
      onerror={() => (failed = true)}
    />
    {#if caption}<figcaption>{caption}</figcaption>{/if}
  </figure>
{/if}

<style>
  figure {
    margin: 0;
  }
  img {
    display: block;
    width: 100%;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-secondary);
  }
  figcaption {
    font-size: 12px;
    color: var(--fg-secondary);
    margin-top: 6px;
    text-align: center;
  }
  .placeholder-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 16 / 10;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    background: var(--bg-secondary);
    color: var(--fg-muted);
    font-size: 13px;
    padding: 12px;
    text-align: center;
    word-break: break-all;
  }
</style>
