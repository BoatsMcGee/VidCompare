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
      version: '0.1.2',
      date: '2026-10-15',
      summary:
        'Patch release: no more terminal windows, and a cleaner Compare page.',
      changes: [
        { type: 'fixed', text: 'No terminal window opens any more — when the app launches, when both files are selected, or when Compare starts. video-compare is a console-subsystem binary, so Windows allocated a new console for every spawn; processes are now created without a console.' },
        { type: 'fixed', text: 'If embedding fails, the app returns to the main page instead of leaving you on an empty Compare page, and cleans up the process it started.' },
        { type: 'fixed', text: 'The back button is word-labelled like the other header buttons, and the logo stays left-aligned in the header.' },
        { type: 'changed', text: 'The Compare page is chrome-free: the banner, “Compare” heading and “embedded” status are gone, leaving only the embed surface. The back button now lives in the app header, left of the logo.' }
      ]
    },
    {
      version: '0.1.1',
      date: '2026-10-15',
      summary:
        'Patch release fixing embedded compare on freshly installed builds, and shipping the real VidCompare application icons.',
      changes: [
        { type: 'fixed', text: 'Embedded compare now works on a freshly installed or extracted build. The window-wait timeout was 5 s, but a first-ever launch of the sidecar and its ~278 MB of FFmpeg/SDL2 libraries takes longer while they are cold-loaded and scanned; it now waits up to 30 s and reports the sidecar’s exit code instead of a bare timeout.' },
        { type: 'fixed', text: 'The Compare wait no longer blocks the UI thread, so the app stays responsive while the embedded window starts.' },
        { type: 'changed', text: 'Warm-up: the sidecar is started once in the background as soon as both files are selected, so the first Compare does not pay the cold-start cost.' },
        { type: 'changed', text: 'Application icons are now the VidCompare mark rather than the Tauri default, including the Windows installer and uninstaller icons and the website favicon. The README gained the icon as a hero image.' }
      ]
    },
    {
      version: '0.1.0',
      date: '2026-10-15',
      summary:
        'First public release — a cross-platform GUI launcher for pixop/video-compare: pick two videos, tune every option, launch — with the real video-compare window embedded in the app.',
      changes: [
        { type: 'added', text: 'Embedded video-compare window (Compare): the real video-compare window runs in-app with the full upstream featureset and every keyboard shortcut; an “Open in separate window” button is always available.' },
        { type: 'added', text: 'File panels with drag & drop: drop a file or folder on either panel, browse via the inline path textbox or the native dialog; sibling media files are listed with sizes, a video extension filter and a “Show all files” toggle; Swap (⇄) exchanges the complete left/right state.' },
        { type: 'added', text: 'Data-driven options UI: every video-compare option is rendered from external, versioned Option Profile JSON — grouped in tabs with search, a presets bar, an active-options chip bar with one-click reset, and side-aware Left/Right columns with 🔗 link toggles for shared values.' },
        { type: 'added', text: 'Live command preview: exact argv builder with a copy button; multi-rendition inputs (__ same-as-left, ::key=value per-video overrides).' },
        { type: 'added', text: 'Launch & logs: stdout and stderr stream into an in-app output panel; a Find-helper dialog runs --find-* commands in-app; rolling, path-anonymized diagnostic logs.' },
        { type: 'added', text: 'Binary resolution: custom video-compare path or bundled sidecar (pinned by SHA-256), with a source/version badge and a warning when the binary and profile versions drift.' },
        { type: 'added', text: 'Profile manager: bundled, downloaded and custom profiles with install-from-file; profiles are published as release artifacts.' },
        { type: 'added', text: 'Auto-update: minisign-signed updater manifests served from GitHub Releases (artifacts themselves stay unsigned).' },
        { type: 'added', text: 'Portable mode: a portable.flag next to the executable keeps settings, presets and logs in a Data\\ folder; Windows portable zips ship per release.' },
        { type: 'added', text: 'Light/dark/system theme with a persisted manual override; i18n dictionary (English first, structure ready for translations).' },
        { type: 'fixed', text: 'UX polish: Left/Right labels everywhere, file lists truncate long names instead of scrolling, the command preview wraps instead of overflowing, themed scrollbars, and non-blocking (async) binary/profile resolution and folder listing.' },
        { type: 'fixed', text: 'Profile upstream.version now matches the shipped video-compare binary (20261004); compact date versions compare correctly.' },
        { type: 'changed', text: 'The in-process libmpv embed approach was removed in favor of embedding the real video-compare window (full upstream UX without vendoring libmpv).' },
        { type: 'changed', text: 'Layout compaction: the video-compare output panel appears only after a launch produces logs; the Compare section is always rendered.' }
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
      {#each ['added', 'changed', 'fixed'] as const as type (type)}
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
