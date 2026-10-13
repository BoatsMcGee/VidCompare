# Creates the Windows portable zip artifact for the release workflow.
#
# Tauri does not produce a plain Windows zip, so this assembles one:
# app exe + video-compare sidecar (+ DLLs) + README + LICENSE +
# THIRD-PARTY-NOTICES + a portable.flag marker. The marker makes
# is_portable() in the Rust backend redirect settings/profiles/logs into
# Data\ next to the exe (see docs/releasing.md §5).
#
# Usage (from repo root, after `tauri build`):
#   pwsh scripts/New-PortableZip.ps1 -Version 1.2.3 -Target x86_64-pc-windows-msvc
#
# Output: dist/VidCompare-<Version>-portable-win64.zip

[CmdletBinding()]
param(
  # App version as built (e.g. "1.2.3" or the nightly "1.2.3-42").
  [Parameter(Mandatory)] [string] $Version,
  # Rust target triple the build was produced for.
  [Parameter(Mandatory)] [string] $Target
)

$ErrorActionPreference = 'Stop'

$releaseDir = "src-tauri/target/$Target/release"
$stageName  = "VidCompare-$Version-portable-win64"
$stage      = Join-Path 'dist' $stageName

if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

# The exe name follows productName (VidCompare.exe); fall back to the Cargo
# package name (vidcompare.exe) for older configs.
$main = @(
  (Join-Path $releaseDir 'VidCompare.exe'),
  (Join-Path $releaseDir 'vidcompare.exe')
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $main) { throw "main executable not found in $releaseDir" }
Copy-Item $main $stage

Copy-Item "src-tauri/binaries/video-compare-$Target.exe" (Join-Path $stage 'video-compare.exe')

$dllDir = 'src-tauri/binaries/dlls'
if (Test-Path $dllDir) {
  Get-ChildItem $dllDir -Filter '*.dll' | Copy-Item -Destination $stage
}

# GPL-3.0: license and upstream attribution must travel with the artifact.
Copy-Item README.md $stage
Copy-Item LICENSE $stage
Copy-Item THIRD-PARTY-NOTICES.md $stage

New-Item -Path (Join-Path $stage 'portable.flag') -ItemType File | Out-Null

$zip = Join-Path 'dist' "$stageName.zip"
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path $stage -DestinationPath $zip
Write-Host "created $zip"
