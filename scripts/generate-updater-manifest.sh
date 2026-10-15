#!/usr/bin/env bash
# Generates latest.json, the static updater manifest consumed by
# tauri-plugin-updater via the endpoint in tauri.conf.json
# (releases/latest/download/latest.json).
#
# Maps each updater-enabled bundle (createUpdaterArtifacts in tauri.conf.json)
# to its updater platform key and embeds the .sig file contents inline — the
# plugin requires the signature content, not a path or URL:
#   windows-x86_64  -> NSIS *-setup.exe
#   linux-x86_64    -> *.AppImage.tar.gz
#   darwin-aarch64  -> *.app.tar.gz
#
# Only run for stable releases: nightlies are never marked "Latest", so the
# endpoint keeps serving the last stable manifest.
#
# Usage (release.yml publish job, from repo root, artifacts/ populated by
# actions/download-artifact):
#   scripts/generate-updater-manifest.sh <tag>
# Output: latest.json in the working directory (attach it to the release).

set -euo pipefail

tag="${1:?usage: generate-updater-manifest.sh <tag>}"
version="${tag#v}"
base="https://github.com/${GITHUB_REPOSITORY}/releases/download/${tag}"

# Prints the contents of the .sig file matching a bundle glob within one
# downloaded artifact directory. Fails loudly if the signature is missing —
# publishing a manifest without signatures would break updater verification.
find_sig() {
  local dir="artifacts/vidcompare-$1"
  local glob="$2"
  local sig
  sig=$(find "$dir" -name "$glob.sig" | head -n1)
  [ -n "$sig" ] || { echo "missing signature for $glob" >&2; return 1; }
  cat "$sig"
}

platforms=$(jq -n '{}')

win_dir="artifacts/vidcompare-x86_64-pc-windows-msvc"
win_nsis=$(find "$win_dir" -name '*-setup.exe' ! -name '*.sig' | head -n1)
if [ -n "$win_nsis" ]; then
  platforms=$(jq --arg url "$base/$(basename "$win_nsis")" \
                 --arg sig "$(find_sig x86_64-pc-windows-msvc '*-setup.exe')" \
                 '. + {"windows-x86_64": {url: $url, signature: $sig}}' <<< "$platforms")
fi

linux_dir="artifacts/vidcompare-x86_64-unknown-linux-gnu"
# Tauri v2 signs the AppImage itself for updates (no .tar.gz wrapper): the
# updater downloads the AppImage directly and verifies it against the .sig.
linux_ai=$(find "$linux_dir" -name '*.AppImage' ! -name '*.sig' | head -n1)
if [ -n "$linux_ai" ]; then
  platforms=$(jq --arg url "$base/$(basename "$linux_ai")" \
                 --arg sig "$(find_sig x86_64-unknown-linux-gnu '*.AppImage')" \
                 '. + {"linux-x86_64": {url: $url, signature: $sig}}' <<< "$platforms")
fi

mac_dir="artifacts/vidcompare-aarch64-apple-darwin"
mac_app=$(find "$mac_dir" -name '*.app.tar.gz' ! -name '*.sig' | head -n1)
if [ -n "$mac_app" ]; then
  platforms=$(jq --arg url "$base/$(basename "$mac_app")" \
                 --arg sig "$(find_sig aarch64-apple-darwin '*.app.tar.gz')" \
                 '. + {"darwin-aarch64": {url: $url, signature: $sig}}' <<< "$platforms")
fi

if [ "$platforms" = '{}' ]; then
  echo "no updater bundles found — refusing to publish an empty manifest" >&2
  exit 1
fi

jq -n --arg version "$version" \
      --arg notes "$(git log -1 --pretty=%B | head -c 500)" \
      --arg pub_date "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --argjson platforms "$platforms" \
      '{version: $version, notes: $notes, pub_date: $pub_date, platforms: $platforms}' \
  > latest.json
cat latest.json
