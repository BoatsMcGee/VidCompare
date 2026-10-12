# Website screenshots

This folder is populated by the CI screenshot pipeline (M7). It intentionally
contains no binary files in git — only this README and a `.gitkeep` so the
directory exists.

## Expected file names

CI drops PNG captures (2× DPI) here using exactly these names:

| File | State captured |
|---|---|
| `main-window-light.png` | Main window, light theme |
| `main-window-dark.png` | Main window, dark theme |
| `file-panels.png` | File panels populated with fixture media |
| `options-groups.png` | Options groups expanded, side-aligned L/R columns |
| `log-panel.png` | Output panel with sample sidecar output |
| `presets-bar.png` | Presets bar |
| `find-helper-dialog.png` | Find-helper dialog for a custom binary |

The same manifest lives in `website/src/lib/site.ts` (`shots`), which powers the
gallery and the home-page screenshots. Keep both in sync if names change.

Pages referencing a missing image render a styled placeholder instead of a
broken image, so the site stays presentable before the pipeline lands.

To preview locally, copy captures from `tests/screenshots/` into this folder:

```powershell
Copy-Item tests\screenshots\*.png website\static\screenshots\
```

Files here are served at `/vidcompare/screenshots/<name>.png`.
