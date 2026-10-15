<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    slideCount,
    ariaLabel,
    children
  }: {
    /** Number of slides rendered inside the track; drives dots and clamping. */
    slideCount: number;
    ariaLabel: string;
    /** Renders one slide's content, given the slide index. */
    children: Snippet<[number]>;
  } = $props();

  let index = $state(0);
  let viewportEl = $state<HTMLDivElement | null>(null);
  // Last requested slide; buttons advance from here, not from the in-flight scroll position.
  let target = 0;

  const canPrev = $derived(index > 0);
  const canNext = $derived(index < slideCount - 1);

  function goTo(i: number) {
    target = Math.max(0, Math.min(slideCount - 1, i));
    index = target;
    // No `behavior` here: CSS scroll-behavior applies (and reduced-motion overrides it).
    viewportEl?.scrollTo({ left: target * (viewportEl.clientWidth ?? 0) });
  }

  // Keep dots/arrows in sync with manual scrolling (touch, trackpad, drag).
  function onScroll() {
    const el = viewportEl;
    if (!el || el.clientWidth === 0) return;
    const i = Math.max(0, Math.min(slideCount - 1, Math.round(el.scrollLeft / el.clientWidth)));
    if (i !== index) index = i;
    // Re-baseline only once a manual scroll settles on a snap point.
    if (Math.abs(el.scrollLeft - i * el.clientWidth) < 2) target = i;
  }
</script>

<div class="carousel" role="group" aria-roledescription="carousel" aria-label={ariaLabel}>
  <div class="stage">
    <div class="viewport" bind:this={viewportEl} onscroll={onScroll}>
      <div class="track">
        {#each Array(slideCount) as _, i}
          <div
            class="slide"
            role="group"
            aria-roledescription="slide"
            aria-label="{i + 1} of {slideCount}"
            aria-hidden={i !== index ? 'true' : undefined}
            inert={i !== index}
          >
            {@render children(i)}
          </div>
        {/each}
      </div>
    </div>

    <button
      type="button"
      class="arrow prev"
      onclick={() => goTo(target - 1)}
      disabled={!canPrev}
      aria-label="Previous slide"
    >
      &#8592;
    </button>
    <button
      type="button"
      class="arrow next"
      onclick={() => goTo(target + 1)}
      disabled={!canNext}
      aria-label="Next slide"
    >
      &#8594;
    </button>
  </div>

  <div class="dots">
    {#each Array(slideCount) as _, i}
      <button
        type="button"
        class="dot"
        class:active={i === index}
        aria-label="Go to slide {i + 1}"
        aria-current={i === index ? 'true' : undefined}
        onclick={() => goTo(i)}
      ></button>
    {/each}
  </div>

  <span class="sr-only" aria-live="polite">Slide {index + 1} of {slideCount}</span>
</div>

<style>
  .carousel {
    position: relative;
  }
  .stage {
    position: relative;
  }
  .viewport {
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    scrollbar-width: none;
  }
  .viewport::-webkit-scrollbar {
    display: none;
  }
  .track {
    display: flex;
  }
  .slide {
    flex: 0 0 100%;
    min-width: 100%;
    scroll-snap-align: start;
  }
  .arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--fg);
    font-size: 18px;
    cursor: pointer;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .arrow:hover:not(:disabled) {
    background: var(--bg-tertiary);
  }
  .arrow:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .arrow:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .arrow.prev {
    left: 8px;
  }
  .arrow.next {
    right: 8px;
  }
  .dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 12px;
  }
  .dot {
    width: 10px;
    height: 10px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg-tertiary);
    cursor: pointer;
  }
  .dot.active {
    background: var(--accent);
    border-color: var(--accent);
  }
  .dot:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .viewport {
      scroll-behavior: auto;
    }
  }
</style>
