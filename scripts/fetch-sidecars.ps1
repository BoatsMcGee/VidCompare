<#
.SYNOPSIS
  Fetch the pinned video-compare sidecar into src-tauri/binaries/ (Windows).

.DESCRIPTION
  Tauri v2's bundle.externalBin requires target-triple-suffixed files, so the
  sidecar is installed as:
    src-tauri\binaries\video-compare-<target-triple>.exe
  Windows runtime DLLs are placed in src-tauri\binaries\dlls\, which
  tauri.conf.json bundles as a resource next to the sidecar.

  Upstream pixop/video-compare publishes a Windows x86_64 zip only; Linux and
  macOS use scripts/fetch-sidecars.sh (which can build the pinned tag from
  source when no prebuilt asset exists).

.PARAMETER Version
  Override the video-compare pin from sidecar-version.json.

.PARAMETER Target
  Override the target triple (default: x86_64-pc-windows-msvc, matching the
  release.yml build target; sidecar triple must match the app build target).

.PARAMETER Stub
  Create a compile-only placeholder (for cargo check/clippy/test jobs;
  never run it).

.PARAMETER Force
  Re-fetch even if the sidecar already exists.

.EXAMPLE
  scripts/fetch-sidecars.ps1
  scripts/fetch-sidecars.ps1 -Version 20261004 -Force
#>
[CmdletBinding()]
param(
  [string]$Version,
  [string]$Target,
  [switch]$Stub,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$ProgressPreference = 'SilentlyContinue'

$RootDir = Split-Path -Parent $PSScriptRoot
$PinFile = Join-Path $RootDir 'sidecar-version.json'
$BinDir = Join-Path $RootDir 'src-tauri\binaries'
$DllDir = Join-Path $BinDir 'dlls'
$WorkDir = Join-Path $BinDir '.fetch-work'

function Fail([string]$Message) {
  throw "fetch-sidecars: error: $Message"
}

function Info([string]$Message) {
  Write-Host "fetch-sidecars: $Message"
}

function Get-Prop($Object, [string]$Name) {
  if ($null -eq $Object) { return $null }
  $prop = $Object.PSObject.Properties[$Name]
  if ($null -ne $prop) { return $prop.Value }
  return $null
}

# Never mistake a compile-only stub for a real sidecar.
function Test-IsStub([string]$Path) {
  if (-not (Test-Path $Path)) { return $false }
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $buffer = New-Object byte[] 200
    $count = $stream.Read($buffer, 0, 200)
    return [System.Text.Encoding]::UTF8.GetString($buffer, 0, $count).Contains('sidecar stub')
  } finally {
    $stream.Dispose()
  }
}

if (-not (Test-Path $PinFile)) { Fail "missing $PinFile" }
$pin = Get-Content -Raw -Path $PinFile | ConvertFrom-Json
$meta = Get-Prop $pin 'video-compare'
if ($null -eq $meta) { Fail "sidecar-version.json: missing 'video-compare' entry" }

if (-not $Version) { $Version = [string](Get-Prop $meta 'version') }
if (-not $Version) { Fail 'could not determine video-compare version (check sidecar-version.json)' }
$repo = Get-Prop $meta 'repo'
if (-not $repo) { $repo = 'pixop/video-compare' }

if (-not $Target) {
  if ($env:PROCESSOR_ARCHITECTURE -eq 'AMD64') {
    # Sidecar triple must match the app build target used in release.yml.
    $Target = 'x86_64-pc-windows-msvc'
  } else {
    Fail "unsupported architecture '$($env:PROCESSOR_ARCHITECTURE)'; pass -Target explicitly"
  }
}

$Dest = Join-Path $BinDir "video-compare-$Target.exe"
New-Item -ItemType Directory -Force -Path $DllDir | Out-Null

if ($Stub) {
  if (-not (Test-Path $Dest)) {
    Set-Content -Path $Dest -Value 'video-compare sidecar stub created by fetch-sidecars.ps1 -Stub'
    Info "created compile-only stub: $Dest"
  } else {
    Info "stub target already present: $Dest"
  }
  exit 0
}

if ((Test-IsStub $Dest) -and -not $Force) {
  Write-Warning "existing file at $Dest is a compile-only stub; fetching the real sidecar"
  $Force = $true
}

# The sidecar needs its runtime DLLs next to it; an exe with an empty dlls\
# directory is an incomplete install (e.g. a stale cache).
if (-not $Force) {
  $dllCount = @(Get-ChildItem -Path $DllDir -File -Filter '*.dll' -ErrorAction SilentlyContinue).Count
  if ($dllCount -eq 0) {
    Write-Warning "runtime DLLs missing from $DllDir; re-fetching sidecar"
    $Force = $true
  }
}

if ((Test-Path $Dest) -and -not $Force) {
  Info "already present: $Dest (use -Force to re-fetch)"
  exit 0
}

# Windows release asset naming used by pixop/video-compare.
$Asset = "video-compare-$Version-win10-x86_64.zip"
$Url = "https://github.com/$repo/releases/download/$Version/$Asset"

if (Test-Path $WorkDir) { Remove-Item -Recurse -Force $WorkDir }
New-Item -ItemType Directory -Force -Path $WorkDir | Out-Null

try {
  $ZipPath = Join-Path $WorkDir $Asset
  Info "downloading $Url"
  try {
    Invoke-WebRequest -Uri $Url -OutFile $ZipPath -UseBasicParsing
  } catch {
    Fail "download failed for $Url - check sidecar-version.json or pass -Version ($($_.Exception.Message))"
  }

  $expected = Get-Prop (Get-Prop $meta 'sha256') $Asset
  if ($expected) {
    $actual = (Get-FileHash -Path $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected.ToLowerInvariant()) {
      Fail "SHA-256 mismatch for ${Asset}: expected $expected, got $actual"
    }
    Info "SHA-256 verified: $Asset"
  } else {
    Write-Warning "no pinned sha256 for $Asset; skipping verification"
  }

  $ExtractDir = Join-Path $WorkDir 'extract'
  Expand-Archive -Path $ZipPath -DestinationPath $ExtractDir -Force

  $exe = Get-ChildItem -Path $ExtractDir -Recurse -File -Filter 'video-compare.exe' |
    Select-Object -First 1
  if ($null -eq $exe) { Fail "video-compare.exe not found inside $Asset" }
  Copy-Item -Path $exe.FullName -Destination $Dest -Force

  $dlls = Get-ChildItem -Path $ExtractDir -Recurse -File -Filter '*.dll'
  foreach ($dll in $dlls) {
    Copy-Item -Path $dll.FullName -Destination $DllDir -Force
  }
  Info "installed: $Dest ($($dlls.Count) runtime DLL(s) in $DllDir)"
} finally {
  if (Test-Path $WorkDir) { Remove-Item -Recurse -Force $WorkDir }
}
