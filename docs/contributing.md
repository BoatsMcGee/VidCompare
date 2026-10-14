# Contributing

## Development setup

Prerequisites:

- **Node.js 20+** and npm
- **Rust stable** (`rustup update stable`) with the MSVC/GNU toolchain for your OS
- **Tauri v2 CLI** (installed via `npm install`, invoked with `npx tauri`)
- **FFmpeg** (optional, only for generating E2E fixture videos)

```bash
npm install          # frontend + Tauri CLI dependencies
npm run dev          # Vite dev server (frontend only, mocked backend absent)
npx tauri dev        # full app in dev mode (Rust + webview)
```

Common Rust commands run from the repo root via npm scripts:
`npm run cargo:check` / `cargo:test` / `cargo:clippy` / `cargo:fmt` / `cargo:clean`.

For the sidecar (video-compare binary) during development, see
`scripts/` and `sidecar-version.json`; the app also works with a custom binary
path configured in Settings.

### Optional: local compiler cache

`src-tauri/.cargo/config.toml` is gitignored so you can opt into a local
rustc wrapper (e.g. [kache](https://github.com/kunobi-ninja/kache) or sccache)
without affecting CI, which uses `Swatinem/rust-cache`. Example:

```toml
[build]
rustc-wrapper = "kache"

[env]
KACHE_LOCAL_ONLY = "1"
KACHE_CACHE_DIR = "P:/kache-store"  # same volume as the build tree
```

### Website

The marketing/docs site is a **separate package**:

```bash
cd website
npm install
npm run dev           # dev server (base path /vidcompare)
npm run build         # static output in website/build
npm run preview       # preview the production build
```

## Code layout

| Path | Contents |
|---|---|
| `src/` | Svelte 5 frontend (components in `src/lib/components`, state in `src/lib/state`, argv/profile logic in `src/lib/options`, theme in `src/styles/theme.css`) |
| `src-tauri/` | Rust backend: Tauri commands (`commands.rs`), process launch, settings, profiles; embedded profile in `src-tauri/profiles/` |
| `profiles/` | Published profile artifacts + `profiles-index.json` |
| `tools/generate-profile.ts` | Regenerates a profile from the sidecar's `--help` output |
| `tests/` | WebdriverIO E2E specs and fixtures |
| `website/` | SvelteKit static site (home, demo, docs, changelog, gallery) |
| `docs/` | Developer documentation (this file set) |
| `.github/workflows/` | `ci.yml` (quality gates), `release.yml` (tag builds), `update-binary.yml` (sidecar bumps), `website.yml` (Pages deploy), `audit.yml` (weekly audits) |

## Style

- **TypeScript strict**; no `any` without a comment justifying it.
- **Svelte 5 runes** — prefer `$state`/`$derived` over stores for new code.
- **Plain CSS custom properties** — no Tailwind, no component libraries.
  Colors come from `theme.css` tokens only.
- Formatting: `prettier` for TS/Svelte/CSS, `rustfmt` for Rust.
- UI strings are side-aware: use the L/R badges and tokens from
  `docs/design.md`; don't introduce layouts that break column alignment.
- Commit style: imperative mood, scoped prefix, e.g. `feat(options): add
  color-space link toggle`, `fix(launch): handle empty stderr`.

## Tests & quality gates

Run locally before pushing:

```bash
npm run check         # svelte-check + tsc (type safety)
npm test              # Vitest unit tests (args, profile, media, settings)
cd src-tauri && cargo test
cargo fmt --check
cargo clippy -- -D warnings
npx wdio run tests/e2e/wdio.conf.ts   # E2E (requires tauri-driver)
```

CI enforces the same gates plus coverage thresholds and builds on
Windows/Ubuntu/macOS.

## PR checklist

- [ ] `npm run check`, `npm test`, `cargo test` pass locally
- [ ] `cargo fmt --check` and `cargo clippy -D warnings` clean
- [ ] New options/behavior covered by unit tests (`args.test.ts`,
      `profile.test.ts`)
- [ ] UI changes respect `docs/design.md` (tokens, L/R alignment, light+dark
      contrast) and update `docs/design.md` if rules changed
- [ ] Profile or schema changes keep backward compatibility (see
      `docs/option-profiles.md`) and update the embedded profile if needed
- [ ] Docs updated (`docs/`, website pages) when user-facing behavior changes
- [ ] No secrets, binaries or generated screenshots committed by hand — CI
      owns `website/static/screenshots/*.png`
