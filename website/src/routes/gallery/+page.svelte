<script lang="ts">
  import Screenshot from '$lib/Screenshot.svelte';
  import { shots } from '$lib/site';
</script>

<svelte:head>
  <title>Gallery — VidCompare</title>
</svelte:head>

<div class="gallery-page container">
  <h1>Gallery</h1>
  <p class="lead">
    Screenshots are captured from the real application by the CI screenshot pipeline and
    refreshed on every release. Missing images render as placeholders until the pipeline lands.
  </p>
  <div class="grid">
    {#each shots as shot (shot.file)}
      <Screenshot file={shot.file} caption={shot.caption} />
    {/each}
  </div>
</div>

<style>
  .gallery-page {
    padding-top: 32px;
    padding-bottom: 48px;
  }
  h1 {
    font-size: 30px;
    margin-bottom: 8px;
  }
  .lead {
    font-size: 15px;
    color: var(--fg-secondary);
    max-width: 720px;
    margin-bottom: 24px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }
</style>
