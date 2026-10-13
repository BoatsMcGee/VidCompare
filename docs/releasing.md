# Releasing

How a VidCompare release flows from a version bump to downloadable artifacts,
profiles and an updated website.

## 1. Version bump

VidCompare uses semver. Bump the version in **both**:

- `package.json` → `"version"`
- `src-tauri/tauri.conf.json` → `app.version`

The app version is surfaced in the header and logs, and is checked against
profile `minAppVersion` guards, so both must move together.

## 2. Sidecar version

The bundled video-compare binary is pinned in **`sidecar-version.json`**:

- upstream tag (e.g. `2025-01-01`) and SHA-256 per platform artifact
- consumed by `scripts/fetch-sidecars.{sh,ps1}` and by CI during `tauri build`
- bumped by the `update-binary.yml` workflow (manual/weekly), which opens a PR
  containing the new pin **and** a draft regenerated profile from
  `tools/generate-profile.ts` so option drift is reviewed before merging

Never bump the sidecar without regenerating and reviewing the profile diff.

## 3. Profiles

Profiles are release artifacts, not build-time side effects:

1. Regenerate with `tools/generate-profile.ts`, diffing the sidecar's
   `--help` output against the embedded
   `src-tauri/profiles/video-compare-latest.json` (the golden test fails on
   drift).
2. Bump `profileVersion` only for format changes; `minAppVersion` guards
   older apps from newer profiles.
3. Publish alongside the app: `profiles/*.json` plus an updated
   `profiles/profiles-index.json` (`upstream_version`, SHA-256, download URL).

## 4. Tag & workflow

`release.yml` triggers on a `v*` tag:

1. **Build matrix** (Windows MSVC, Linux, macOS): `npm ci` → `npm run build`
   → `cargo tauri build` for the target triple.
2. **Sidecars**: pinned binaries fetched/built and SHA-256-verified
   (video-compare on all platforms via `fetch-sidecars.ps1` / `.sh`).
3. **Artifacts**: NSIS `.exe`, `.deb`, `.rpm`, AppImage, `.dmg`, plus portable
   zips (`VidCompare-<ver>-portable-win64.zip` with `portable.flag`) — every
   artifact bundles license files and the profile set. Updater `.sig` files
   are produced next to the bundles when
   `TAURI_SIGNING_PRIVATE_KEY` is set (manifest signing, not code signing).
4. **GitHub Release**: artifacts + option profiles +
   `profiles/profiles-index.json` uploaded with generated notes. Semver
   pre-release tags (`vX.Y.Z-<suffix>`, e.g. `v1.2.0-beta.1`) publish as a
   **pre-release** and are not marked "Latest"; stable tags (`vX.Y.Z`) become
   the Latest release. Stable releases also get a generated **`latest.json`**
   updater manifest (the endpoint configured in `tauri.conf.json`):
   the publish job maps each updater-enabled bundle (Windows NSIS
   `-setup.exe`, Linux `.AppImage.tar.gz`, macOS `.app.tar.gz`) to its
   updater platform key (`windows-x86_64`, `linux-x86_64`,
   `darwin-aarch64`) with the download URL and the `.sig` file contents
   embedded (see `scripts/generate-updater-manifest.sh`). Nightlies skip
   the manifest — they are never "Latest", so the endpoint keeps serving
   the last stable manifest.
5. **Post-release**: `release.yml` dispatches `website.yml` so the Pages site
   rebuilds with the new release; regenerate screenshots into
   `tests/screenshots/` and `website/static/screenshots/`. Download links on
   the home page resolve to this release.

## 5. Portable zip

Windows portable zip layout:

```
VidCompare-<ver>-portable-win64/
├── VidCompare.exe          # app
├── video-compare.exe       # sidecar
├── portable.flag           # enables portable mode
└── Data/                   # settings, presets, logs at runtime
```

`portable.flag` next to the executable makes `paths.rs` redirect
settings/presets/logs into `Data\`; `app_info` reports portable mode so the UI
can show the badge.

## 6. Nightly builds

`nightly.yml` runs on a daily cron (and manually via `workflow_dispatch`). It
compares `main` HEAD against the commit the rolling `nightly` tag points at
and dispatches `release.yml` with `nightly: true` only when code changed.

Nightly runs reuse the release build matrix but:

- inject version `<package.json version>-<run_number>` via
  `tauri build --config` (no repo files touched). The prerelease is
  numeric-only because WiX/MSI rejects non-numeric prerelease identifiers
  (`-nightly.N` fails the Windows msi target); the nightly identity is
  carried by the rolling tag and release name.
- publish to the rolling `nightly` tag: the previous nightly release + tag
  are deleted and recreated, so there is exactly one nightly pre-release,
  never marked "Latest"
- skip the website rebuild dispatch (the site tracks stable releases)

## 7. Release checklist

- [ ] `npm run check`, `npm run lint`, `npm test`, `cargo test`, clippy/fmt green on `main`
- [ ] E2E green on all three OSes
- [ ] Profile regenerated and diff reviewed against the new sidecar
- [ ] `sidecar-version.json` SHAs verified (video-compare)
- [ ] Version bumped in `package.json` + `tauri.conf.json`
- [ ] `CHANGELOG.md` updated; website changelog
      (`website/src/routes/docs/changelog/+page.svelte`) updated
- [ ] Updater minisign keypair present: public key in `tauri.conf.json`
      (`plugins.updater.pubkey`), private key in the
      `TAURI_SIGNING_PRIVATE_KEY` secret. The repo's keypair lives in
      gitignored `secrets/updater-private.key(.pub)` — for a real release,
      regenerate with `npx tauri signer generate -w secrets/updater-private.key`
      and store the private key ONLY as a GitHub secret (never in the repo).
      Secret format rules (a malformed secret fails the build with
      `failed to decode secret key: ... Missing comment in secret key`):
      - `TAURI_SIGNING_PRIVATE_KEY` must be the **exact file contents** of
        `secrets/updater-private.key` — a single base64 line, no leading or
        trailing blank lines (the base64 must decode to a first line of
        `untrusted comment: rsign encrypted secret key`).
      - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` is the key password, or empty
        for a passwordless key.
      - Keys generated by Tauri CLI v2.9.3–v2.10.0 with an empty password
        were broken (tauri-apps/tauri#15022) — regenerate with a current
        CLI if in doubt.
      - Verify the keypair matches before releasing: sign a test file with
        `npx tauri signer sign --private-key-path secrets/updater-private.key`
        and confirm the signature's keynum matches the pubkey configured in
        `tauri.conf.json` (a stale local keypair silently mismatches).
- [ ] Tag pushed: `git tag v0.x.y && git push origin v0.x.y`
- [ ] Release workflow complete; artifacts + `.sig` files downloadable
- [ ] Website deploy succeeded (auto-dispatched by `release.yml`); screenshots
      refreshed
