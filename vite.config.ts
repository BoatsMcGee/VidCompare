import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: { port: 1420, strictPort: true },
  // Vitest runs in node: force the browser entrypoints of svelte
  // (otherwise `mount()` resolves to the server build and throws).
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/lib/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Coverage gate scope: all library code + Svelte components.
      include: ['src/lib/**/*.{ts,svelte}'],
      exclude: ['**/*.test.ts', '**/test-utils.ts', '**/test-setup.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
})
