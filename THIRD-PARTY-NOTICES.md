# Third-Party Notices

VidCompare is GPL-3.0-only. It distributes, bundles, or dynamically loads the
following third-party components. Each entry states the license and how the
component is used.

## video-compare (sidecar process, embedded window)

- Upstream: <https://github.com/pixop/video-compare>
- License: GPL-2.0 (see upstream `LICENSE.md`)
- Use: distributed as a **separate process** (sidecar binary fetched by
  `scripts/fetch-sidecars` with SHA-256 pins from `sidecar-version.json`;
  never committed to this repository). VidCompare launches it via its CLI,
  streams its stdout/stderr, and — on Windows — captures its top-level
  window and reparents it inside the app so the full upstream featureset
  and keyboard shortcuts work unchanged. Separate processes keep the
  GPL-2.0/GPL-3.0 combination at arm's length; no code is shared.

## Tauri and dependencies

Tauri v2 and the Rust/Node dependency trees are covered by their respective
licenses (MIT/Apache-2.0 for most crates and npm packages); see
`src-tauri/Cargo.lock` and `package-lock.json` for the full inventory.
