# VidCompare

A fast, lightweight, cross-platform GUI launcher for [pixop/video-compare](https://github.com/pixop/video-compare).

[![CI](https://github.com/vidcompare/vidcompare/actions/workflows/ci.yml/badge.svg)](https://github.com/vidcompare/vidcompare/actions/workflows/ci.yml)
[![Release](https://github.com/vidcompare/vidcompare/actions/workflows/release.yml/badge.svg)](https://github.com/vidcompare/vidcompare/actions/workflows/release.yml)
[![License: GPL-3.0-only](https://img.shields.io/badge/License-GPL--3.0--only-blue.svg)](LICENSE)

**[Live demo](https://vidcompare.github.io/vidcompare/demo)** — an interactive simulation of the app UI, no install required.

> [!NOTE]
> This project is built entirely by agentic LLMs and is not ready for production.

## Features

- **Every video-compare option** — the entire UI is driven by external, versioned Option Profile JSON files that can be swapped without rebuilding the app
- **Side-aware options** — options that apply to left/right/both inputs are organized in columns aligned with the video inputs, with a link toggle for shared vs independent values
- **Multi-rendition support** — compare a reference against multiple distorted videos
- **Embedded compare** — video-compare runs inside the app window (Windows) with its full featureset and keyboard shortcuts intact; separate-window fallback everywhere else
- **In-app logging** — no external terminal; stdout/stderr streams into the app
- **Light/dark theme** — follows system preference, manual override
- **Portable builds** — Windows zip, Linux AppImage, macOS zip
- **Cross-platform** — Windows, Linux, macOS

## Development

```powershell
npm install            # install deps
npm run dev            # Vite dev server (port 1420)
npx tauri dev          # full app in dev mode
npm run build          # frontend build (includes copy:profiles)
npm test               # vitest (unit + component)
npm run test:coverage  # vitest with coverage gate (lines 80 / fn 80 / branches 70)
npm run lint           # ESLint (src)
cargo check            # from src-tauri/
cargo test             # from src-tauri/
```

Windows-first development environment; see `scripts/` for `.ps1`/`.sh` pairs (sidecar fetching).

## Architecture

- **Frontend**: Svelte 5 + TypeScript + Vite
- **Backend**: Rust (Tauri v2)
- **Options UI**: Driven by `src-tauri/profiles/video-compare-latest.json`
- **Testing**: Vitest (unit), WebdriverIO + tauri-driver (E2E)

## Docs

- [Architecture](docs/architecture.md) — IPC contract, window embedding, option profiles
- [Design](docs/design.md) — UI/UX patterns, theming tokens, Compare card
- [Option profiles](docs/option-profiles.md) — the data-driven options system
- [Testing](docs/testing.md) — unit/component/e2e/screenshot layers
- [Debugging](docs/debugging.md) — VS Code launch configs, WebView attach, Rust debugging
- [Releasing](docs/releasing.md) — version bump → tag → artifacts → website
- [Contributing](docs/contributing.md) — workflow and conventions
- [Lint toolchain](docs/lint-toolchain-decision.md) — ESLint 9 decision record
- [Third-party notices](THIRD-PARTY-NOTICES.md) — video-compare (GPL-2.0) attribution

## Debugging

See [docs/debugging.md](docs/debugging.md) for comprehensive debugging setup including:
- VS Code launch configurations (Full Stack Debug compound, WebView attach, Rust debugging)
- Platform-specific prerequisites (WebView2, WebKit, Safari Web Inspector)
- Frontend (Svelte/Vitest) and backend (Rust) debugging
- Troubleshooting common issues

## License

GPL-3.0-only — see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for
attribution of the video-compare sidecar (GPL-2.0, separate process whose
window is embedded on Windows).
