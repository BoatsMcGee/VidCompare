# VidCompare — Agent Guidelines

Tauri v2 + Svelte 5 + TypeScript GUI launcher for pixop/video-compare. Rust backend (`src-tauri/`), Svelte frontend (`src/`), SvelteKit website (`website/`), tests (`tests/`).

## Build & Test

```bash
npm install            # install deps
npm run dev            # Vite dev server (port 1420)
npx tauri dev          # full app in dev mode
npm run build          # frontend build (includes copy:profiles)
npm test               # vitest (unit + component)
npm run test:coverage  # vitest with coverage gate (lines 80 / fn 80 / branches 70)
cargo check            # from src-tauri/
cargo test             # from src-tauri/
```

Run the smallest suite covering your change. `npm run check` (svelte-check + tsc) must stay at 0 errors.

## Code Style

- **Comments**: minimal, focused, non-rambling — only when the process or result is not obvious. Never narrate what the code plainly does.
- **Single source of truth**: never duplicate a constant, type, list, or rule that already exists elsewhere — import it. If two definitions must stay in sync, they belong in one place. Watch for compatibility drift between: app UI (`src/`), website demo (`website/src/lib/components/demo/`), option profiles (`profiles/`, `public/profiles/`, `src-tauri/profiles/` — generated via `scripts/copy-profiles.mjs`, edit only the source), and docs.
- **Types**: strong typings everywhere. No `any`; use `unknown` when the type cannot be ascertained, then narrow with a validator (Zod on the TS side). Prefer discriminated unions over boolean-flag soup.
- **Organization**: group types and business logic by relevance — colocate a module's types with its logic; shared types live in `src/lib/types.ts` or the domain module that owns them, not in grab-bag files.
- **Abstraction**: prefer small pure functions and typed boundaries (e.g. `src/lib/options/args.ts` builds argv from a profile; components never format CLI strings themselves).
- **Svelte 5**: runes (`$state`, `$derived`, `$props`) — no legacy stores for new code. Plain CSS with design tokens; no CSS frameworks, no vendored component libraries.
- **Rust**: idiomatic clippy-clean code; `cargo fmt` before commit. Commands in `src-tauri/src/` return typed results — no stringly-typed IPC.

## Architecture Rules

- The options UI is **data-driven** from versioned Option Profile JSON (see `docs/option-profiles.md`). Never hardcode a video-compare option in component code; add it to the profile.
- Profile JSON is validated by Zod with lenient parsing: unknown option kinds fall back to raw passthrough so older/newer profiles still render. Preserve that forward-compatibility when touching `src/lib/options/profile.ts`.
- Side-applicability (`global` / `left` / `right` / `both`) is a first-class concept — keep option grouping and the link-toggle semantics consistent with it.
- `report.html` is **generated** by `tools/build-report.mjs` (local-only, not committed) — never edit it directly; edit the generator and re-run it.
- `website/` mirrors app UI for the demo; when app components change, update the demo mirrors in the same PR to avoid drift.

## Testing

- New frontend logic needs unit tests; new components need component tests (jsdom + @testing-library/svelte) and axe-core a11y assertions (disable jsdom-inapplicable rules, e.g. color-contrast, with a comment).
- E2E (WebdriverIO + tauri-driver) and the screenshot pipeline live in `tests/`; screenshot filenames are a contract with `website/static/screenshots/README.md`.
- See `docs/testing.md` for the full layer breakdown.

## Docs

Update the doc that owns the surface you changed: `docs/architecture.md`, `docs/design.md`, `docs/option-profiles.md`, `docs/testing.md`, `docs/debugging.md`, `docs/contributing.md`, `docs/releasing.md`. Keep them terse and cross-linked rather than duplicating content.

## Conventions That Differ From Defaults

- Windows-first development environment; use PowerShell-compatible commands in docs and scripts (`.ps1` + `.sh` pairs under `scripts/`).
- No code signing, no certificates — release artifacts are unsigned; auto-update (planned) must account for that.
- GPL-3.0-only: keep the license header/attribution requirements when copying upstream video-compare material.
- Free-tier CI runners: keep workflows lean; sidecar binaries are fetched by pinned SHA-256 (`sidecar-version.json`), never committed.

## Subagent Protocol (Hardened)

**Purpose**: run background agents that survive interruptions, avoid stray files, and produce verifiable deliverables.

### 1. Resume Protocol (mandatory for every background agent)
- Each agent owns a progress file under `reports/<task-name>-progress.md`.
- At START: read the file (if exists) and continue the checklist; if new, create it with a checklist of all tasks.
- After EVERY completed task or significant discovery: update the file — mark tasks done, record files created/changed, verification results, decisions/caveats. Keep it terse: checklist + one-line notes.
- The progress file is the source of truth; the final message is a summary.

### 2. File Ownership Boundaries (explicit in every prompt)
- List files/dirs the agent MAY create/modify.
- List files/dirs the agent MUST NOT touch (other agents' domains, generated files, config owned by other milestones).
- If a needed change falls in a forbidden file, document the recommendation in the progress file instead of editing.

### 3. Stray File Prevention
- Agents must NOT write scratch files to the repo root (`.m6-*.rs`, `.m6-*.py`, `.tmp-*`, `.agent-progress/`, etc.).
- All intermediate work goes into the progress file or the agent's owned output directories.
- Before spawning a new agent, the orchestrator cleans any stray root files from prior runs.

### 4. Verification Gates (agent must pass before declaring done)
- All JSON created/modified parses via `node -e "JSON.parse(...)"`.
- TypeScript configs compile (`npx tsc --noEmit` on new .ts files).
- Scripts pass `node --check` on new .mjs files.
- `npm run build` passes.
- `npm run check` (svelte-check + tsc) introduces no NEW errors.
- `npx vitest run` passes (all tests including new ones).
- For research agents: the progress file flips to "complete" and contains the full structured report with citations.

### 5. Orchestrator Responsibilities

- Monitor via `list_agents` / `read_agent`; do not poll excessively.
- On interruption: read the progress file, verify filesystem state, restart agent with same prompt + "RESUME PROTOCOL" reminder.
- Fold completed deliverables into `report.html` via `tools/build-report.mjs` (never edit `report.html` directly).
