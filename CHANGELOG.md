# Changelog

All notable changes to VidCompare are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[semver](https://semver.org/).

## [Unreleased]

### Added

- **Embedded video-compare window (Compare)**: the Compare section embeds the
  *real* video-compare window instead of recreating its UX. `embed_launch`
  spawns video-compare through the shared launch machinery (stdout/stderr
  still stream to the log panel), finds its top-level window by PID
  (`EnumWindows` + `GetWindowThreadProcessId`, retrying briefly after spawn),
  strips the caption/borders, sets `WS_EX_TOOLWINDOW`, and reparents it as an
  owned popup (`SetWindowLongPtrW(GWL_HWNDPARENT)`) positioned over the HTML
  embed surface. Owned windows always sit above the WebView2 compositor, so
  the captured window reliably covers the placeholder and stays above the app
  while the page scrolls. The child keeps its own process, renderer, and
  keyboard handling — the entire upstream featureset and every shortcut work
  unchanged. New IPC: `embed_available`,
  `embed_launch(binary, args, rect) → { id, embedded, reason }`,
  `embed_set_rect(id, rect, visible)` (backend dedupes identical rects,
  driven by a requestAnimationFrame loop plus capture-phase `scroll`/`resize`
  listeners), `embed_release(id)`. The backend intersects the surface rect
  with the owner's client area, so the captured window is clipped to the
  visible slice while scrolling and hidden when fully scrolled out of view.
  `launch://exit` clears the embed state; `EmbedState::drop` releases every
  captured window on app exit. Windows-first: non-Windows builds compile a
  stub and the child runs in its own window (macOS forbids cross-process
  reparenting; Wayland lacks a stable foreign-surface protocol).
- **FilePanel drag & drop**: a file *or* folder can be dropped on a panel
  (drop hit-tested against the panel rect using physical coordinates);
  dropping a folder navigates to it, dropping a file selects it and lists
  its parent folder (`describe_path` decides which).
- **FilePanel inline path textbox**: single-row header (L/R badge, title,
  folder-path textbox, 📂 browse button, show-all checkbox); commits on
  Enter or blur, invalid folder → red border + "Folder not found." tooltip
  and the input reverts. Clicking the file-list background opens the browse
  dialog; the empty state is itself a browse button ("Click to browse, or
  drop a file or folder here."). New shared `src/lib/path.ts` helper
  (`parentDir`, `baseName`).
- **CompareView as the primary always-on compare surface**: a 16:9 embed
  surface with a placeholder hint, a Compare button, and an explicit
  "Open in separate window" backup button; capture failures surface the
  reason instead of breaking the UI. Frontend tests cover the launch flow,
  failure states, the external button, and scroll-driven rect re-forwarding
  (166 frontend tests total).

### Removed

- **mpv embed (Option C) and its dependencies**: the in-process libmpv FFI
  layer (`commands::mpv`, `commands::mpv_window`), the `libloading`
  dependency, the libmpv SHA-256 pin in `sidecar-version.json`, the
  `mpv-2.dll` bundle resource, the libmpv fetch logic in
  `scripts/fetch-sidecars.ps1`, and the libmpv entry in
  `THIRD-PARTY-NOTICES.md`. Embedding the real video-compare window gives
  the full upstream UX (features + keyboard shortcuts) without vendoring or
  recreating it, which the mpv approach could not do.
- **Updater wiring**: `tauri-plugin-updater` + `tauri-plugin-process`
  registered in the builder; `updater:default` capability;
  `createUpdaterArtifacts: true` and a real minisign pubkey in
  `tauri.conf.json`. `release.yml` sets
  `TAURI_SIGNING_PRIVATE_KEY` for minisign manifest signing (`.sig` files)
  and dispatches the website rebuild on release. The keypair lives in
  gitignored `secrets/` — the private key must be added as the
  `TAURI_SIGNING_PRIVATE_KEY` GitHub secret before the first tagged release.
  Release artifacts stay unsigned (no code signing — project convention);
  portable zips are excluded from auto-update.
- **i18n dictionary**: `src/lib/i18n/messages.ts` with a typed `t()` lookup
  and `{placeholder}` interpolation; English first, structure ready for
  translations.
- **Lint toolchain**: ESLint 9 flat config (`typescript-eslint
  strict-type-checked` + `eslint-plugin-svelte`), ESLint as the formatter (no
  Prettier), `npm run lint` / `lint:fix`; actionlint step in CI; Dependabot
  config (npm ×2, cargo, github-actions). Decision record:
  `docs/lint-toolchain-decision.md`.
- **Tests**: CompareView component + a11y tests, embed IPC tests, i18n tests,
  and coverage for previously-untested components (ThemeToggle, LogPanel,
  CommandPreview, ProfileManager). 166 frontend tests + Rust tests for the
  embed command surface.
- `THIRD-PARTY-NOTICES.md` (video-compare GPL-2.0 sidecar whose window is
  embedded on Windows).
- `LICENSE` (GPL-3.0-only full text) — the README badge and Cargo manifest
  now resolve.
- CI actionlint download SHA-256 corrected (was a placeholder that would fail
  `sha256sum -c`).

### Fixed

- **UX overhaul** (user review of the first build):
  - Panel/tile labels unified as **Left**/**Right** everywhere (files,
    options columns, command, logs) — "Reference"/"Distorted" removed from
    the UI.
  - **Swap (⇄)** now swaps the full side-scoped state: directories, file
    entries, show-all flags, and left/right option values — previously it
    only changed the generated command.
  - Left panel no longer widens past 50% after selecting a folder
    (`min-width: 0` on grid children stops content-driven sizing).
  - File lists truncate long filenames with ellipsis + `title` tooltip
    instead of scrolling horizontally.
  - Presets bar moved adjacent to the options form so presets visibly act
    on the settings below them.
  - Video-compare log moved from a bottom drawer to directly under the
    command preview, titled "video-compare output"; header **Logs** button
    (which mixed up app logs with video-compare logs) removed.
  - Command preview is a wrapping read-only `<textarea>` — long commands
    (many options) fit without horizontal scrolling.
  - "Find filters" search shows a non-blocking loading state
    (`Searching…`, `aria-busy`) instead of appearing to freeze the UI.
  - Binary/profile resolution and folder listing (`resolve_binary`,
    `run_info_command`, `list_media_files`) are now async Tauri commands —
    they no longer block the WebView main thread.
  - Profile version fixed: `upstream.version` now matches the shipped
    video-compare binary (`20261004`); `version.ts` parses compact dates
    and compares `20261004` ≡ `2026-10-04`.
  - Native scrollbars replaced with themed `::-webkit-scrollbar` styles in
    both themes.
  - Non-functional **Compare** card gated behind a new
    `show_compare_card` setting (Settings → Experimental, default off) with
    an explicit experimental hint.
- `emitOption` in `src/lib/options/args.ts` dropped left/right-only options
  that define `flags.left`/`flags.right` but no top-level `flag`.
- VS Code debug setup restructured to the standard Tauri v2 + CodeLLDB recipe
  (single app instance per F5, WebView attach via
  `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`).
- `rust-analyzer.check.targets` removed (non-host targets caused ~103
  spurious errors).
- Clippy warnings fixed across `src-tauri` (`sort_by_key`, `map_while`,
  `collapsible_if`); `cargo clippy -- -D warnings` and `cargo fmt --check`
  pass.
- Coverage gate restored: lines 90.8% / functions 85.9% / branches 73.6%
  (thresholds 80/80/70) — was failing at 78.2% lines before the embed work.

### Changed

- **Layout compaction**: the presets bar moved inside the options container
  (rendered at the top of the options area, so presets visibly act on the
  options below them); the video-compare output panel now appears only after
  a launch produces logs (`hasVideoCompareOutput`); the Compare section is no
  longer experimental — it is always rendered and the `show_compare_card`
  setting was removed entirely (Rust `Settings` struct, TS `Settings`
  interface, settings dialog section, i18n keys). The external video-compare
  launch (Launch button) is the backup path.
- Bundle size: 173.8 KB JS + 13.1 KB CSS pre-gzip (54.6 KB gzip) vs the
  <150 KB budget — see the performance audit in `report.html` (generated
  locally via `tools/build-report.mjs`) for the per-library breakdown and
  justification.

## [0.1.0]

### Added

- Initial milestones M1–M8: Tauri v2 + Svelte 5 scaffold, file selection,
  profile engine (Zod + lenient parsing), profiles lifecycle, launch & logs,
  bundling & CI/CD (5 workflows), testing & screenshots (axe a11y, e2e
  harness, screenshot pipeline), SvelteKit website + docs.
