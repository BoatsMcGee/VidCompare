# Website screenshots

This folder is populated by the CI screenshot pipeline. It intentionally
contains no binary files in git — only this README and a `.gitkeep` so the
directory exists.

## How it works

1. The `screenshots` job in `.github/workflows/e2e.yml` captures 30 PNGs
   (15 subjects × light/dark themes, 2× DPI) in browser mode and uploads
   them as a workflow artifact.
2. The `website.yml` workflow triggers on `workflow_run` of `e2e.yml` (or on
   `workflow_dispatch`), downloads the artifact into this folder, builds the
   site, and deploys to GitHub Pages.

## Expected file names

CI drops PNG captures (2× DPI) here using exactly these names:

| File | State captured |
|---|---|
| `main-window-light.png` / `main-window-dark.png` | Main window |
| `file-panels-light.png` / `file-panels-dark.png` | File panels populated with fixture media |
| `options-groups-light.png` / `options-groups-dark.png` | Options groups expanded, side-aligned L/R columns |
| `log-panel-light.png` / `log-panel-dark.png` | Output panel with sample sidecar output |
| `presets-bar-light.png` / `presets-bar-dark.png` | Presets bar |
| `find-helper-dialog-light.png` / `find-helper-dialog-dark.png` | Find-helper dialog for a custom binary |
| `compare-page-light.png` / `compare-page-dark.png` | Compare page with embedded video-compare surface |
| `options-quick-light.png` / `options-quick-dark.png` | Quick options group |
| `options-display-light.png` / `options-display-dark.png` | Display options group |
| `options-playback-light.png` / `options-playback-dark.png` | Playback options group |
| `options-color-light.png` / `options-color-dark.png` | Color options group |
| `options-filters-light.png` / `options-filters-dark.png` | Filters options group |
| `options-io-light.png` / `options-io-dark.png` | Inputs & decoding options group |
| `options-scopes-light.png` / `options-scopes-dark.png` | Scopes options group |
| `options-advanced-light.png` / `options-advanced-dark.png` | Advanced options group |

Each subject has a `-light` and a `-dark` variant; the site's Screenshot
component swaps the suffix to match the visitor's active theme.

The same manifest lives in `website/src/lib/site.ts` (`shots`), which powers the
gallery and the home-page screenshots. Keep both in sync if names change.

Pages referencing a missing image render a styled placeholder instead of a
broken image, so the site stays presentable before the pipeline lands.

To preview locally, copy captures from `tests/screenshots/` into this folder:

```powershell
Copy-Item tests\screenshots\current\*.png website\static\screenshots\
```

Files here are served at `/VidCompare/screenshots/<name>.png`.
