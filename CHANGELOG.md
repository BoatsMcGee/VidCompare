# Changelog

All notable changes to VidCompare are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[semver](https://semver.org/).

## [Unreleased]

### Fixed

- **Embedded compare failed on a freshly installed or extracted build**
  ("no window found for pid …", falling back to an external window) while
  `tauri dev` always worked. The window-wait timeout was 5 s, but the first
  compare after a fresh install takes longer than that: the sidecar and its
  ~278 MB of FFmpeg/SDL2 libraries are being cold-loaded and scanned for the
  first time. Subsequent launches were fast (~0.3 s), which is why retrying
  and every dev run appeared to work.
  - The wait now allows up to 30 s and fails fast with the child's exit code
    when the sidecar dies before opening a window, instead of reporting a
    timeout.
  - `embed_launch` is now `async` so the wait runs off the UI thread — a sync
    Tauri command would have frozen the window for the whole timeout.
- **Updater/loader warm-up**: a new `warm_sidecar` command runs the sidecar
  once (`--version`) as soon as both inputs are selected, so the first Compare
  does not pay the cold-start cost. Verified on a fresh install: warm-up
  0.65 s, first embed 0.67 s.

### Changed

- **Application icons** are now the VidCompare mark instead of the Tauri
  default — all platform icons (`.ico`, `.icns`, PNGs, Windows store logos)
  are regenerated from `src-tauri/icons/icon.svg`. The NSIS installer and
  uninstaller now use the app icon too. `public/favicon.svg` was an unrelated
  template graphic and now matches `icon.svg`. The README gained the icon as
  a hero image.

## [0.1.0] - 2026-10-15

First public release. A cross-platform GUI launcher for
[pixop/video-compare](https://github.com/pixop/video-compare): pick two
videos, tune every option, launch — with the real video-compare window
embedded in the app.

### Added

- **Embedded video-compare window (Compare)**: the Compare section embeds
  the *real* video-compare window — the full upstream featureset and every
  keyboard shortcut work unchanged, in-app. On Windows the child window is
  captured and reparented over the embed surface (clipped while scrolling,
  released on exit); on other platforms it runs in its own window. An
  explicit "Open in separate window" button is always available, and capture
  failures surface the reason instead of breaking the UI.
- **File panels with drag & drop**: drop a file or folder on either panel;
  browse via the inline path textbox (invalid paths revert with a hint) or
  the native dialog; sibling media files are listed with sizes, a video
  extension filter and a "Show all files" toggle; **Swap (⇄)** exchanges the
  complete left/right state.
- **Data-driven options UI**: every video-compare option is rendered from
  external, versioned Option Profile JSON (Zod-validated, lenient parsing,
  `minAppVersion` guards) — bool, string, number, enum, path, color,
  key-value-list, filter-chain and more, grouped in tabs with search, a
  presets bar, an active-options chip bar with one-click reset, and
  side-aware Left/Right columns with 🔗 link toggles for shared values.
- **Live command preview**: exact argv builder with a copy button;
  multi-rendition inputs (`__` same-as-left, `::key=value` per-video
  overrides).
- **Launch & logs**: video-compare launches through the app with stdout and
  stderr streaming into an in-app output panel; a Find-helper dialog runs
  `--find-*` commands in-app; rolling, path-anonymized diagnostic logs.
- **Binary resolution**: custom video-compare path or bundled sidecar
  (pinned by SHA-256 in `sidecar-version.json`), with a source/version badge
  and a warning when the binary and profile versions drift.
- **Profile manager**: bundled, downloaded and custom profiles with
  install-from-file; profiles are published as release artifacts.
- **Auto-update**: minisign-signed updater manifests served from GitHub
  Releases (artifacts themselves stay unsigned — no code signing).
- **Portable mode**: a `portable.flag` next to the executable keeps settings,
  presets and logs in a `Data\` folder; Windows portable zips ship per
  release.
- **Light/dark/system theme** with a persisted manual override and shared
  design tokens; i18n dictionary (English first, structure ready for
  translations).
- **Website** (GitHub Pages): homepage with OS-detected download links,
  in-browser demo, docs and changelog; screenshots captured from the app in
  CI.
- **Testing**: 166 frontend tests (unit + component + axe a11y), Rust tests,
  browser-mode E2E, and a screenshot pipeline wired into CI.

### Fixed

- **UX overhaul from the first review pass**: Left/Right labels everywhere
  (replacing "Reference"/"Distorted"), Swap now swaps the full side-scoped
  state, file lists truncate long names instead of scrolling, the command
  preview wraps instead of overflowing, the presets bar sits directly above
  the options it acts on, video-compare output moved next to the command
  preview, themed scrollbars, and async (non-blocking) binary/profile
  resolution and folder listing.
- Profile `upstream.version` now matches the shipped video-compare binary
  (`20261004`); compact date versions compare correctly.
- Left/right-only options with no top-level flag are no longer dropped from
  the generated command.

### Changed

- The in-process libmpv embed approach was removed in favor of embedding the
  real video-compare window (full upstream UX without vendoring libmpv).
- Layout compaction: the video-compare output panel appears only after a
  launch produces logs; the Compare section is always rendered (no longer
  experimental).
