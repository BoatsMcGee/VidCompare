#!/usr/bin/env bash
# Resolves the app version for a release build and writes it to $GITHUB_OUTPUT.
#
# Stable builds use the package.json version verbatim. Nightly builds append a
# numeric-only prerelease (<base>-<run_number>): WiX/MSI rejects non-numeric
# prerelease identifiers, so a "-nightly.N" suffix would fail the Windows msi
# target. The nightly identity is carried by the rolling tag and release name
# instead. The version is injected via `tauri build --config`, so package.json
# and tauri.conf.json stay untouched.
#
# Usage (release.yml):
#   scripts/resolve-release-version.sh <nightly:true|false> <run_number>
# Writes: version=<resolved> to $GITHUB_OUTPUT

set -euo pipefail

nightly="${1:?usage: resolve-release-version.sh <nightly:true|false> <run_number>}"
run_number="${2:?usage: resolve-release-version.sh <nightly:true|false> <run_number>}"

base=$(node -p "require('./package.json').version")

if [ "$nightly" = "true" ]; then
  echo "version=$base-$run_number" >> "$GITHUB_OUTPUT"
else
  echo "version=$base" >> "$GITHUB_OUTPUT"
fi
