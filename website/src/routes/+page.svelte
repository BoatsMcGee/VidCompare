<script lang="ts">
  import { base } from '$app/paths';
  import { releasesUrl, upstreamUrl } from '$lib/site';
  import Screenshot from '$lib/Screenshot.svelte';

  const features = [
    {
      title: 'Full video-compare option coverage',
      body: 'The entire UI is rendered from external, versioned Option Profile JSON files — every upstream flag, with help text, types and validation, swappable without rebuilding the app.'
    },
    {
      title: 'Side-by-side column-aligned options',
      body: 'Options that apply to left/right/both inputs sit in columns under their video, with a 🔗 link toggle for shared vs independent values.'
    },
    {
      title: 'External versioned profiles',
      body: 'Profiles are published as release artifacts with version guards, so you can target any upstream video-compare release.'
    },
    {
      title: 'In-app logs',
      body: 'stdout and stderr stream into a bottom output panel with per-session tabs — no external terminal needed.'
    },
    {
      title: 'Light & dark theme',
      body: 'Follows your system preference with a manual override, and every surface — including the log panel — is themed.'
    },
    {
      title: 'Portable builds',
      body: 'Windows portable zip keeps settings, presets and logs next to the executable; Linux ships as an AppImage, macOS as a zip.'
    },
    {
      title: 'Cross-platform',
      body: 'Windows, Linux and macOS builds from the same codebase, bundling a pinned, SHA-256-verified video-compare sidecar.'
    },
    {
      title: 'Presets & multi-rendition',
      body: 'Save option sets as presets and compare one reference against multiple distorted videos, with per-video overrides.'
    }
  ];
</script>

<svelte:head>
  <title>VidCompare — side-by-side video comparison, simplified</title>
</svelte:head>

<section class="hero">
  <div class="container">
    <h1>VidCompare</h1>
    <p class="tagline">
      A fast, lightweight, cross-platform GUI launcher for
      <a href={upstreamUrl}>pixop/video-compare</a> — every option, side-aware, with your logs
      right in the app.
    </p>
    <div class="cta">
      <a class="btn primary" href="{base}/docs/">Get Started</a>
      <a class="btn" href="{base}/demo/">View Demo</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <h2>Features</h2>
    <div class="features">
      {#each features as f}
        <div class="feature">
          <h3>{f.title}</h3>
          <p>{f.body}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

<section class="section alt">
  <div class="container">
    <h2>Gallery</h2>
    <p class="muted">
      Screenshots are regenerated from the real app by CI on every release.
      See the <a href="{base}/gallery/">full gallery</a>.
    </p>
    <div class="gallery">
      <Screenshot file="main-window-light.png" caption="Main window — light theme" />
      <Screenshot file="main-window-dark.png" caption="Main window — dark theme" />
      <Screenshot file="options-groups.png" caption="Side-aligned option columns" />
    </div>
  </div>
</section>

<section class="section" id="download">
  <div class="container">
    <h2>Download &amp; install</h2>
    <div class="downloads">
      <div class="download">
        <h3>Windows</h3>
        <p>Portable zip — extract anywhere, or run the installer (.exe).</p>
        <a class="btn" href={releasesUrl}>Download for Windows</a>
      </div>
      <div class="download">
        <h3>Linux</h3>
        <p>AppImage (chmod +x, run) or .deb/.rpm packages.</p>
        <a class="btn" href={releasesUrl}>Download for Linux</a>
      </div>
      <div class="download">
        <h3>macOS</h3>
        <p>.dmg or portable zip of the app bundle (unsigned).</p>
        <a class="btn" href={releasesUrl}>Download for macOS</a>
      </div>
    </div>
    <p class="muted">
      Or build from source — see the <a href="{base}/docs/">getting started guide</a>. Every
      release also ships the matching option profiles for manual install.
    </p>
  </div>
</section>

<style>
  .hero {
    padding: 72px 0 56px;
    text-align: center;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
  }
  .hero h1 {
    font-size: 44px;
    letter-spacing: -0.02em;
    margin-bottom: 12px;
  }
  .tagline {
    font-size: 18px;
    color: var(--fg-secondary);
    max-width: 640px;
    margin: 0 auto 24px;
  }
  .cta {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .btn {
    display: inline-block;
    padding: 8px 20px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--fg);
    font-size: 14px;
  }
  .btn:hover {
    text-decoration: none;
    background: var(--bg-tertiary);
  }
  .btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg);
  }
  .btn.primary:hover {
    background: var(--accent-hover);
  }
  .section {
    padding: 48px 0;
  }
  .section.alt {
    background: var(--bg-secondary);
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
  .section h2 {
    font-size: 26px;
    margin-bottom: 20px;
  }
  .muted {
    color: var(--fg-secondary);
    margin-bottom: 16px;
  }
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  .feature {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    background: var(--bg-secondary);
  }
  .feature h3 {
    font-size: 15px;
    margin-bottom: 6px;
  }
  .feature p {
    font-size: 13px;
    color: var(--fg-secondary);
  }
  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }
  .downloads {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }
  .download {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    background: var(--bg-secondary);
  }
  .download h3 {
    font-size: 15px;
    margin-bottom: 6px;
  }
  .download p {
    font-size: 13px;
    color: var(--fg-secondary);
    margin-bottom: 12px;
  }
</style>
