<script lang="ts">
  interface Change {
    type: 'added' | 'changed' | 'fixed';
    text: string;
  }

  interface Release {
    version: string;
    date: string;
    summary: string;
    changes: Change[];
  }

  const releases: Release[] = [
    {
      version: '0.1.0',
      date: 'Unreleased',
      summary: 'First public release — scaffold, file selection, option profiles and launch/logs.',
      changes: [
        { type: 'added', text: 'Tauri v2 + Svelte 5 + TypeScript (strict) application scaffold with typed IPC contract and settings store (M1).' },
        { type: 'added', text: 'Light/dark/system theme system with persisted manual override, shared CSS design tokens (M1).' },
        { type: 'added', text: 'CI workflow skeleton with frontend and Rust quality gates (M1).' },
        { type: 'added', text: 'File panels for Reference (left) and Distorted (right) with sibling file listing after browsing (M2).' },
        { type: 'added', text: 'Video extension filter with a “Show all files” toggle, file sizes and one-click reselection (M2).' },
        { type: 'added', text: 'Native file dialogs and recent-folder tracking in settings (M2).' },
        { type: 'added', text: 'Swap (⇄) button exchanging the left and right selections (M2).' },
        { type: 'added', text: 'Unit tests for file/media helpers (M2).' },
        { type: 'added', text: 'External option-profile engine: Zod parsing, lenient unknown-field handling, version guards (profileVersion / minAppVersion) and group fallback (M3).' },
        { type: 'added', text: 'Full option field renderer set driven by the profile: bool, string, text, number, enum, enum-multi, path, size, time-offset, color, key-value-list, filter-chain, string-list and raw fallback (M3).' },
        { type: 'added', text: 'Side-aware two-column options layout with 🔗 link toggles for pair options, including separateFlags and colon pair styles (M3).' },
        { type: 'added', text: 'Group tabs, option search, active-options chip bar with one-click reset (M3).' },
        { type: 'added', text: 'Exact argv builder with unit tests plus live command preview with copy button (M3).' },
        { type: 'added', text: 'Binary resolution (custom path → bundled sidecar) with a source/version badge in the header (M5).' },
        { type: 'added', text: 'Process launch with streaming stdout/stderr events and a session-tabbed in-app Output panel (M5).' },
        { type: 'added', text: 'Find-helper dialog running video-compare --find-* commands in-app (M5).' },
        { type: 'added', text: 'Multi-rendition input support with __ same-as-left placeholder and ::key=value per-video overrides in the argv builder (M5).' },
        { type: 'added', text: 'Rolling, path-anonymized diagnostic logs (M5).' }
      ]
    }
  ];

  const labels: Record<Change['type'], string> = {
    added: 'Added',
    changed: 'Changed',
    fixed: 'Fixed'
  };
</script>

<svelte:head>
  <title>Changelog — VidCompare</title>
</svelte:head>

<div class="changelog container">
  <h1>Changelog</h1>
  <p class="lead">
    All notable changes to VidCompare. Releases follow semantic versioning; option profiles
    carry their own version (<code>profileVersion</code>) independent of the app.
  </p>

  {#each releases as rel (rel.version)}
    <section class="release">
      <header>
        <h2>{rel.version}</h2>
        <span class="date">{rel.date}</span>
      </header>
      <p class="summary">{rel.summary}</p>
      {#each ['added', 'changed', 'fixed'] as type (type)}
        {@const items = rel.changes.filter((c) => c.type === type)}
        {#if items.length > 0}
          <h3>{labels[type]}</h3>
          <ul>
            {#each items as c}
              <li>{c.text}</li>
            {/each}
          </ul>
        {/if}
      {/each}
    </section>
  {/each}
</div>

<style>
  .changelog {
    padding-top: 32px;
    padding-bottom: 48px;
    max-width: 820px;
  }
  h1 {
    font-size: 30px;
    margin-bottom: 8px;
  }
  .lead {
    font-size: 15px;
    color: var(--fg-secondary);
    margin-bottom: 28px;
  }
  .release {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-secondary);
    padding: 16px 20px;
    margin-bottom: 20px;
  }
  .release header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 6px;
  }
  .release h2 {
    font-size: 20px;
  }
  .date {
    font-size: 12px;
    color: var(--fg-muted);
  }
  .summary {
    color: var(--fg-secondary);
    font-size: 13px;
    margin-bottom: 12px;
  }
  .release h3 {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--fg-muted);
    margin: 14px 0 6px;
  }
  .release ul {
    padding-left: 20px;
  }
  .release li {
    font-size: 13px;
    margin-bottom: 4px;
  }
</style>
