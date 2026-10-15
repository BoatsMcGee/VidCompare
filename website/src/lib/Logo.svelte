<script lang="ts">
  let {
    size = 20,
    label,
    class: className = ''
  }: { size?: number; label?: string; class?: string } = $props();
</script>

<svg
  class={className}
  viewBox="0 0 32 32"
  width={size}
  height={size}
  fill="currentColor"
  aria-hidden={label ? undefined : 'true'}
  role={label ? 'img' : undefined}
  aria-label={label}
>
  <!-- smooth play icon (left), rounded corners via round-joined stroke -->
  <path d="M4 5 L13.5 16 L4 27 Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
  <!-- divider -->
  <rect x="15.5" y="4" width="1" height="24" opacity="0.6" />
  <!-- pixelated play icon (right) -->
  <path d="M18 4 h4 v4 h-4 Z M18 8 h8 v4 h-8 Z M18 12 h12 v8 h-12 Z M18 20 h8 v4 h-8 Z M18 24 h4 v4 h-4 Z" />
</svg>
