# Lint Toolchain Decision (M9)

Date: 2026-10-08 · Status: decided

## Decision

Adopt **ESLint 9 flat config** with `typescript-eslint strict-type-checked` +
`eslint-plugin-svelte`, ESLint as the formatter (no Prettier), plus an
**actionlint** step in CI. **Do not add** lefthook, knip, or cargo-deny for 1.0.

## Inputs evaluated

| Tool | Purpose | Verdict | Reason |
|---|---|---|---|
| ESLint 9 + typescript-eslint `strict-type-checked` | TS/Svelte lint + format | **adopt** | Decided upstream (M9 plan); flat config is the current standard; `strict-type-checked` catches real type bugs svelte-check misses (floating promises, unsafe casts). |
| eslint-plugin-svelte | Svelte-aware rules | **adopt** | Required for `.svelte` files; pairs with strict-type-checked. |
| Prettier | formatting | **reject** | Decision was ESLint-as-formatter; two formatters fight. Svelte indentation handled by eslint-plugin-svelte + svelte-check. |
| lefthook | git hooks (lint on commit) | **defer** | Zero-commits repo until now; hooks add friction for contributors on Windows (PowerShell + corepack quirks). CI already gates everything. Revisit post-1.0 if bad commits become a problem. |
| knip | dead code / unused exports | **defer** | The coverage gate (80/80/70) already forces dead frontend code to be exercised or deleted; Rust dead code is caught by `clippy -D warnings`. Adding knip now would flag the intentional `#[cfg(test)]`-gated and forward-compat exports. Revisit when the codebase doubles. |
| cargo-deny | Rust license/advisory audit | **defer** | Dependency surface is small (tauri + plugins, libloading, serde, uuid, which, dirs); `audit.yml` already runs `cargo audit` for advisories. License needs are covered by THIRD-PARTY-NOTICES.md + manual review on dependency changes. Revisit when the dependency tree grows. |
| actionlint | workflow linter | **adopt** | Free-tier CI budget means workflow bugs are expensive; actionlint catches expression/schema errors before a wasted run. |

## Consequences

- `eslint.config.js` (flat) with `strict-type-checked` + svelte plugin; `npm run lint` + `npm run format`.
- CI `lint-and-test` job gains an actionlint step (pinned binary download).
- No new config files for lefthook/knip/cargo-deny; this document records why.
