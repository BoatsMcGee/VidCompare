#!/usr/bin/env bash
#
# Fetch the pinned video-compare sidecar into src-tauri/binaries/.
#
# Tauri v2's bundle.externalBin requires target-triple-suffixed files, so the
# sidecar is installed as:
#   src-tauri/binaries/video-compare-<target-triple>[.exe]
# Windows runtime DLLs are placed in src-tauri/binaries/dlls/, which
# tauri.conf.json bundles as a resource next to the sidecar.
#
# libmpv note: the app embeds the real video-compare window (Windows) instead
# of loading libmpv in-process, so no libmpv binary is fetched. Linux/macOS
# launch video-compare in its own window.
#
# Usage:
#   scripts/fetch-sidecars.sh [options]
#
# Options:
#   --version <tag>          Override the pin from sidecar-version.json
#   --target <triple>        Override the target triple (default: host triple)
#   --stub                   Create compile-only placeholder files (for
#                            cargo check/clippy/test jobs; never run them)
#   --force                  Re-fetch even if the sidecar already exists
#   --no-build               Fail instead of building from source when no
#                            prebuilt release asset exists for this platform
#   --build-from-source      Skip the download and always build from source
#   -h, --help               Show this help
#
# Prebuilt assets: upstream pixop/video-compare publishes a Windows x86_64
# zip only; Linux/macOS builds fall back to building the pinned tag from
# source (requires git, make, g++, pkg-config plus FFmpeg/SDL2 dev packages).

set -euo pipefail

die() { echo "fetch-sidecars: error: $*" >&2; exit 1; }
info() { echo "fetch-sidecars: $*"; }
warn() { echo "fetch-sidecars: warning: $*" >&2; }

usage() {
  sed -n '2,27p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

VERSION_OVERRIDE=""
TARGET_OVERRIDE=""
STUB=0
FORCE=0
BUILD_MODE="auto" # auto | never | always

while [ $# -gt 0 ]; do
  case "$1" in
    --version)
      [ $# -ge 2 ] || die "--version requires a value"
      VERSION_OVERRIDE="$2"; shift 2 ;;
    --target)
      [ $# -ge 2 ] || die "--target requires a value"
      TARGET_OVERRIDE="$2"; shift 2 ;;
    --stub) STUB=1; shift ;;
    --force) FORCE=1; shift ;;
    --no-build) BUILD_MODE="never"; shift ;;
    --build-from-source) BUILD_MODE="always"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; die "unknown argument: $1" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PIN_FILE="${ROOT_DIR}/sidecar-version.json"
BIN_DIR="${ROOT_DIR}/src-tauri/binaries"
DLL_DIR="${BIN_DIR}/dlls"
WORK_DIR="${BIN_DIR}/.fetch-work"

# node -e resolves require() relative to the process cwd, so cd first.
cd "$ROOT_DIR"

# Reads a top-level field of the "video-compare" object in sidecar-version.json.
pin_get() {
  if command -v node >/dev/null 2>&1; then
    node -e 'const m=require("./sidecar-version.json")["video-compare"];const v=m[process.argv[1]];if(v==null)process.exit(3);process.stdout.write(String(v))' "$1"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import json,sys;d=json.load(open("sidecar-version.json"))["video-compare"];v=d.get(sys.argv[1]);sys.exit(3) if v is None else sys.stdout.write(str(v))' "$1"
  else
    die "need node or python3 to read sidecar-version.json"
  fi
}

# Prints the pinned sha256 for an asset name, if any.
pin_sha256() {
  if command -v node >/dev/null 2>&1; then
    node -e 'const m=require("./sidecar-version.json")["video-compare"];process.stdout.write((m.sha256||{})[process.argv[1]]||"")' "$1"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import json,sys;d=json.load(open("sidecar-version.json"))["video-compare"];sys.stdout.write(d.get("sha256",{}).get(sys.argv[1],""))' "$1"
  fi
}

detect_target() {
  case "$(uname -s)" in
    Linux*)
      case "$(uname -m)" in
        x86_64) echo "x86_64-unknown-linux-gnu" ;;
        *) die "unsupported Linux architecture: $(uname -m) (expected x86_64)" ;;
      esac ;;
    Darwin*)
      case "$(uname -m)" in
        arm64) echo "aarch64-apple-darwin" ;;
        x86_64) echo "x86_64-apple-darwin" ;;
        *) die "unsupported macOS architecture: $(uname -m)" ;;
      esac ;;
    MINGW*|MSYS*|CYGWIN*)
      # The sidecar triple must match the app build target (release.yml uses
      # the MSVC toolchain; upstream's MinGW-built .exe runs fine regardless).
      echo "x86_64-pc-windows-msvc" ;;
    *) die "unsupported operating system: $(uname -s)" ;;
  esac
}

file_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c 'import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],"rb").read()).hexdigest())' "$1"
  else
    warn "no sha256 tool available; skipping checksum verification"
    echo ""
  fi
}

extract_archive() {
  # $1 = archive, $2 = destination dir
  case "$1" in
    *.tar.gz|*.tgz) tar -xzf "$1" -C "$2" ;;
    *.zip)
      if command -v unzip >/dev/null 2>&1; then
        unzip -q "$1" -d "$2"
      elif command -v python3 >/dev/null 2>&1; then
        python3 -m zipfile -e "$1" "$2"
      else
        die "need unzip or python3 to extract $1"
      fi ;;
    *) die "unknown archive format: $1" ;;
  esac
}

# ---------------------------------------------------------------------------
# Compile-only stub: satisfies tauri-build's externalBin/resources lookups so
# cargo check/clippy/test can run without network access. Never ship/run it.
make_stub() {
  mkdir -p "$DLL_DIR"
  if [ -f "$DEST" ]; then
    info "stub target already present: $DEST"
    return
  fi
  printf 'video-compare sidecar stub created by fetch-sidecars.sh --stub\n' > "$DEST"
  chmod +x "$DEST"
  info "created compile-only stub: $DEST"
}

build_from_source() {
  if [ "$PLATFORM" = "windows" ]; then
    die "building video-compare from source is not supported on Windows by this script; the prebuilt release asset must exist for your pinned version"
  fi
  command -v git >/dev/null 2>&1 || die "git is required to build video-compare from source"
  command -v make >/dev/null 2>&1 || die "make is required to build video-compare from source"
  command -v pkg-config >/dev/null 2>&1 || die "pkg-config is required to build video-compare from source"
  if ! command -v g++ >/dev/null 2>&1 && ! command -v c++ >/dev/null 2>&1; then
    die "a C++ compiler (g++/c++) is required to build video-compare from source"
  fi
  info "cloning ${REPO} @ ${VERSION} to build the sidecar from source..."
  rm -rf "${WORK_DIR}/src"
  git clone --depth 1 --branch "$VERSION" "https://github.com/${REPO}.git" "${WORK_DIR}/src"
  local jobs
  jobs="$(getconf _NPROCESSORS_ONLN 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)"
  make -C "${WORK_DIR}/src" -j"$jobs" USE_PKG_CONFIG=1
  local built="${WORK_DIR}/src/video-compare"
  [ -x "$built" ] || die "expected build output not found: $built"
  mkdir -p "$DLL_DIR"
  cp "$built" "$DEST"
  chmod +x "$DEST"
}

# ---------------------------------------------------------------------------
TARGET="${TARGET_OVERRIDE:-$(detect_target)}"
EXE_EXT=""
PLATFORM=""
case "$TARGET" in
  *-pc-windows-*) PLATFORM="windows"; EXE_EXT=".exe" ;;
  *-unknown-linux-*) PLATFORM="linux" ;;
  *-apple-darwin) PLATFORM="macos" ;;
  *) die "unsupported target triple: $TARGET" ;;
esac
ARCH="${TARGET%%-*}"
DEST="${BIN_DIR}/video-compare-${TARGET}${EXE_EXT}"

mkdir -p "$BIN_DIR" "$DLL_DIR"

if [ "$STUB" = 1 ]; then
  make_stub
  exit 0
fi

VERSION="${VERSION_OVERRIDE:-$(pin_get version)}"
[ -n "$VERSION" ] || die "could not determine video-compare version (check sidecar-version.json)"
REPO="$(pin_get repo || true)"
REPO="${REPO:-pixop/video-compare}"

# Never mistake a compile-only stub for a real sidecar.
if [ -f "$DEST" ] && head -c 200 "$DEST" 2>/dev/null | grep -q "sidecar stub"; then
  warn "existing file at $DEST is a compile-only stub; fetching the real sidecar"
  FORCE=1
fi

# On Windows the sidecar needs its runtime DLLs next to it; an exe with an
# empty dlls/ directory is an incomplete install (e.g. a stale cache).
if [ "$PLATFORM" = "windows" ] && [ "$FORCE" = 0 ]; then
  dll_count="$(find "$DLL_DIR" -maxdepth 1 -type f -iname '*.dll' 2>/dev/null | wc -l)"
  if [ "$dll_count" -eq 0 ]; then
    warn "runtime DLLs missing from $DLL_DIR; re-fetching sidecar"
    FORCE=1
  fi
fi

if [ -f "$DEST" ] && [ "$FORCE" = 0 ]; then
  info "already present: $DEST (use --force to re-fetch)"
  exit 0
fi

# Candidate prebuilt assets for this platform (upstream currently publishes
# only the Windows zip; the others are forward-compatible patterns).
ASSETS=()
case "$PLATFORM" in
  windows) ASSETS+=("video-compare-${VERSION}-win10-x86_64.zip") ;;
  linux)   ASSETS+=("video-compare-${VERSION}-linux-x86_64.tar.gz"
                    "video-compare-${VERSION}-linux-x86_64.zip") ;;
  macos)   ASSETS+=("video-compare-${VERSION}-macos-${ARCH}.tar.gz"
                    "video-compare-${VERSION}-macos-${ARCH}.zip"
                    "video-compare-${VERSION}-darwin-${ARCH}.tar.gz") ;;
esac

command -v curl >/dev/null 2>&1 || die "curl is required to download release assets"
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
cleanup() { rm -rf "$WORK_DIR"; }
trap cleanup EXIT

downloaded=0
if [ "$BUILD_MODE" != "always" ]; then
  for asset in "${ASSETS[@]}"; do
    url="https://github.com/${REPO}/releases/download/${VERSION}/${asset}"
    info "downloading ${url}"
    if curl -fL --retry 2 --retry-delay 2 -o "${WORK_DIR}/${asset}" "$url" 2>/dev/null; then
      expected="$(pin_sha256 "$asset")"
      if [ -n "$expected" ]; then
        actual="$(file_sha256 "${WORK_DIR}/${asset}")"
        if [ -n "$actual" ] && [ "$actual" != "$expected" ]; then
          die "SHA-256 mismatch for ${asset}: expected ${expected}, got ${actual}"
        fi
        info "SHA-256 verified: ${asset}"
      else
        warn "no pinned sha256 for ${asset}; skipping verification"
      fi
      extract_dir="${WORK_DIR}/extract"
      mkdir -p "$extract_dir"
      extract_archive "${WORK_DIR}/${asset}" "$extract_dir"
      found="$(find "$extract_dir" -type f \( -name 'video-compare' -o -name 'video-compare.exe' \) | head -n 1)"
      [ -n "$found" ] || die "video-compare binary not found inside ${asset}"
      mkdir -p "$DLL_DIR"
      cp "$found" "$DEST"
      chmod +x "$DEST"
      # Bundle any runtime DLLs that ship alongside the binary (Windows zips).
      find "$extract_dir" -type f -iname '*.dll' -exec cp {} "$DLL_DIR"/ \;
      downloaded=1
      break
    fi
  done
fi

if [ "$downloaded" = 0 ]; then
  if [ "$PLATFORM" = "windows" ]; then
    die "no prebuilt asset found for ${REPO} ${VERSION} (tried: ${ASSETS[0]}). Check sidecar-version.json or pass --version."
  fi
  if [ "$BUILD_MODE" = "never" ]; then
    die "no prebuilt asset for ${VERSION} on this platform and --no-build was given"
  fi
  build_from_source
fi

info "installed: $DEST"
