<script lang="ts">
  import Screenshot from '$lib/Screenshot.svelte';
  import { base } from '$app/paths';

  const sections = [
    { id: 'getting-started', label: 'Getting started' },
    { id: 'installing', label: 'Installing' },
    { id: 'selecting-videos', label: 'Selecting videos' },
    { id: 'options-reference', label: 'The options reference' },
    { id: 'presets', label: 'Presets' },
    { id: 'multiple-renditions', label: 'Multiple renditions' },
    { id: 'custom-binary', label: 'Custom video-compare binary' },
    { id: 'portable-mode', label: 'Portable mode' },
    { id: 'logs', label: 'Logs & troubleshooting' },
    { id: 'faq', label: 'FAQ' }
  ];
</script>

<svelte:head>
  <title>Documentation — VidCompare</title>
</svelte:head>

<div class="docs container">
  <aside class="toc">
    <h2>On this page</h2>
    <nav>
      {#each sections as s}
        <a href="#{s.id}">{s.label}</a>
      {/each}
      <a href="{base}/docs/changelog/">Changelog</a>
    </nav>
  </aside>

  <article>
    <h1>VidCompare documentation</h1>
    <p class="lead">
      VidCompare is a GUI launcher for <a href="https://github.com/pixop/video-compare"
        >pixop/video-compare</a
      >. It builds the command line for you, streams the output back into the app, and never
      hides a single flag.
    </p>

    <section id="getting-started">
      <h2>Getting started</h2>
      <ol>
        <li>Download and install VidCompare for your platform (see below).</li>
        <li>
          Launch it — the header shows a badge with the resolved
          <strong>video-compare</strong> binary and its version (for example
          <code>bundled · 2025-01-01</code>).
        </li>
        <li>
          Pick a <strong>Reference</strong> (left) and a <strong>Distorted</strong> (right) video
          from the two file panels.
        </li>
        <li>
          Adjust options — or just press <strong>▶ Compare</strong> in the header (its dropdown
          launches in a separate window). The exact command is always visible in the preview bar
          at the bottom.
        </li>
      </ol>
      <Screenshot file="main-window-light.png" caption="The main window with both videos selected" />
    </section>

    <section id="installing">
      <h2>Installing</h2>
      <p>VidCompare ships as portable archives and installers for all three platforms:</p>
      <ul>
        <li>
          <strong>Windows</strong> — <code>VidCompare-&lt;ver&gt;-portable-win64.zip</code>: extract
          it anywhere and run <code>VidCompare.exe</code>. Settings live in a <code>Data\</code>
          folder next to the executable.
        </li>
        <li>
          <strong>Linux</strong> — AppImage (<code>chmod +x</code>, then run) or <code>.deb</code> /
          <code>.rpm</code> packages.
        </li>
        <li>
          <strong>macOS</strong> — <code>.dmg</code> or a zip of the <code>.app</code> bundle.
          Builds are unsigned, so on first launch you may need to right-click → Open (or allow it
          in System Settings → Privacy &amp; Security).
        </li>
      </ul>
      <p>
        Every release also includes the matching <strong>option profile</strong> JSON files —
        download one and install it via the profile manager if you want to target a different
        upstream video-compare version.
      </p>
      <p>
        Prefer building from source? <code>npm install &amp;&amp; npx tauri build</code> — see the
        repository's contributing guide for the full toolchain.
      </p>
    </section>

    <section id="selecting-videos">
      <h2>Selecting videos</h2>
      <p>
        Click the <strong>📂</strong> button in a panel to browse for a video. VidCompare lists
        the <em>sibling files</em> of whatever you pick, so switching between encodes of the same
        clip is one click:
      </p>
      <ul>
        <li>
          The <strong>left</strong> panel is your <span class="badge badge-left">L</span> Reference —
          the source everything is compared against. It's highlighted in blue throughout the UI.
        </li>
        <li>
          The <strong>right</strong> panel is your <span class="badge badge-right">R</span>
          Distorted — the encode under test, highlighted in orange.
        </li>
        <li>
          <strong>Show all files</strong> toggles non-video siblings (subtitles, logs, posters) in
          the list.
        </li>
        <li>The <strong>⇄</strong> button between the panels swaps the two selections.</li>
      </ul>
      <Screenshot
        file="file-panels.png"
        caption="Sibling file lists with the current selection highlighted"
      />
    </section>

    <section id="options-reference">
      <h2>The options reference</h2>
      <p>
        The options area is driven entirely by an external <strong>option profile</strong> — a
        versioned JSON file describing every video-compare flag, its type, help text and the side
        it applies to. The built-in profile always matches the bundled binary.
      </p>
      <ul>
        <li>
          <strong>Group tabs</strong> (Quick, Display, Playback, Color, Filters, Inputs &amp;
          Decoding, Scopes, Advanced) filter which options are shown. Quick holds the most-used
          ones.
        </li>
        <li><strong>Search</strong> matches labels, flags and help text across all groups.</li>
        <li>
          <strong>Side-aware columns</strong>: options under the Reference panel feed the left
          input, options under the Distorted panel feed the right input, and shared options sit in
          a full-width row below.
        </li>
        <li>
          <strong>🔗 link toggles</strong>: pair options (decoder, hardware acceleration,
          demuxer, color space…) start <em>linked</em> — one value, one combined flag
          (<code>--decoder h264_cuvid</code>). Click 🔗 to unlink and set each side independently
          (<code>--left-decoder … --right-decoder …</code>). Colon-style options serialize as
          <code>--color-space left:right</code> when unlinked.
        </li>
        <li>
          <strong>Active chips</strong> show every non-default option at a glance; ✕ on a chip
          resets it.
        </li>
        <li>
          The <strong>command preview</strong> is the literal command that will run — copy it with
          📋 to use in a terminal.
        </li>
      </ul>
      <Screenshot
        file="options-groups.png"
        caption="Group tabs, side-aligned columns and the link toggle"
      />
      <p>
        Unknown option kinds fall back to a raw text field, and profiles with a
        <code>minAppVersion</code> newer than your app are rejected with a warning instead of
        breaking the UI — see <code>docs/option-profiles.md</code> in the repository for the full
        schema.
      </p>
    </section>

    <section id="presets">
      <h2>Presets</h2>
      <p>
        The presets bar sits above the options area. Type a name and press <strong>Save</strong> to
        snapshot the current option values (including per-option link states). Click a preset to
        restore it, or ✕ to delete it. Presets are stored in your settings directory and survive
        upgrades.
      </p>
      <Screenshot file="presets-bar.png" caption="Saved presets above the options area" />
    </section>

    <section id="multiple-renditions">
      <h2>Multiple renditions</h2>
      <p>
        video-compare accepts <strong>multiple right-hand inputs</strong>, so one reference can be
        compared against several encodes at once (the profile enables this with
        <code>inputs.multiRight</code>). Additional distorted slots appear next to the right panel;
        each slot can be marked as “same as left” (the <code>__</code> placeholder) or carry
        per-video overrides written as <code>::key=value</code> suffixes on the path.
      </p>
      <p>
        The command preview shows the final ordering: options first, then the reference path,
        then each distorted path.
      </p>
    </section>

    <section id="custom-binary">
      <h2>Using a custom video-compare binary</h2>
      <p>
        VidCompare resolves the binary in this order: <strong>custom path from Settings → bundled
        sidecar</strong>. Set a custom path if you build video-compare yourself, use a package
        manager (<code>brew</code>, <code>AUR</code>), or want to test a nightly upstream build.
        The header badge always tells you which source and version is active.
      </p>
      <p>
        Not sure where your binary lives? The <strong>find-helper</strong> dialog runs
        video-compare's <code>--find-*</code> helper commands for you — enter a search term and it
        prints the matches in-app.
      </p>
      <Screenshot file="find-helper-dialog.png" caption="Find-helper dialog" />
    </section>

    <section id="portable-mode">
      <h2>Portable mode</h2>
      <p>
        If a <code>portable.flag</code> file sits next to the executable (the Windows portable zip
        includes one), VidCompare runs in portable mode: settings, presets and logs are written to
        a <code>Data\</code> folder beside the app instead of your user profile. The settings UI
        shows a <strong>Portable</strong> badge so you always know which mode you're in.
      </p>
    </section>

    <section id="logs">
      <h2>Logs &amp; troubleshooting</h2>
      <ul>
        <li>
          <strong>Output panel</strong> — every launch streams stdout/stderr into the bottom
          panel, colored per stream, with one tab per session. No terminal required.
        </li>
        <li>
          <strong>“Binary not found”</strong> — video-compare isn't bundled and no custom path is
          set. Install the sidecar (release builds include it) or point Settings at your own
          binary.
        </li>
        <li>
          <strong>Nothing happens on Launch</strong> — both a reference and at least one distorted
          file must be selected; the preview shows exactly which paths will be passed.
        </li>
        <li>
          <strong>Rolling file logs</strong> — diagnostic logs are written to your settings
          directory with anonymized paths and rotated; attach them to a bug report.
        </li>
        <li>
          <strong>Option rejected</strong> — the profile may not match your binary's version;
          install the profile published with the release that matches your video-compare build.
        </li>
      </ul>
      <Screenshot
        file="log-panel.png"
        caption="Output panel with stdout (light) and stderr (red) lines"
      />
    </section>

    <section id="faq">
      <h2>FAQ</h2>
      <h3>Does VidCompare decode or process video itself?</h3>
      <p>
        No. It's a launcher: it builds a <code>video-compare</code> command line, spawns it as a
        separate process and streams its output back into the UI.
      </p>
      <h3>Are my filenames or usage data sent anywhere?</h3>
      <p>
        No — VidCompare has zero telemetry. Network access happens only when you explicitly check
        for updates or download a profile.
      </p>
      <h3>Why do some options show only on one side?</h3>
      <p>
        Because upstream defines them that way (for example <code>--left-peak-nits</code>). The
        side-aware layout makes that visible instead of hiding it behind a generic form.
      </p>
      <h3>Can I use a different upstream version?</h3>
      <p>
        Yes — profiles are published per upstream release. Load the profile that matches your
        binary and the UI reconfigures itself; no rebuild needed.
      </p>
      <h3>Where does the comparison window appear?</h3>
      <p>
        Launching opens video-compare's own window(s); VidCompare stays behind with the logs,
        preview and controls. Keyboard control during playback is video-compare's own — VidCompare
        never intercepts it.
      </p>
    </section>
  </article>
</div>

<style>
  .docs {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 32px;
    padding-top: 32px;
    padding-bottom: 48px;
  }
  .toc {
    position: sticky;
    top: 72px;
    align-self: start;
    font-size: 13px;
  }
  .toc h2 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--fg-muted);
    margin-bottom: 8px;
  }
  .toc nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-left: 2px solid var(--border);
    padding-left: 12px;
  }
  .toc a {
    color: var(--fg-secondary);
  }
  article {
    min-width: 0;
    max-width: 760px;
  }
  article h1 {
    font-size: 30px;
    margin-bottom: 8px;
  }
  .lead {
    font-size: 16px;
    color: var(--fg-secondary);
    margin-bottom: 24px;
  }
  article section {
    margin-bottom: 36px;
    scroll-margin-top: 72px;
  }
  article h2 {
    font-size: 22px;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--border);
  }
  article h3 {
    font-size: 15px;
    margin: 16px 0 6px;
  }
  article p,
  article li {
    font-size: 14px;
    margin-bottom: 8px;
  }
  article ul,
  article ol {
    padding-left: 22px;
  }
  article :global(figure) {
    margin: 16px 0;
  }
  @media (max-width: 820px) {
    .docs {
      grid-template-columns: 1fr;
    }
    .toc {
      position: static;
    }
  }
</style>
