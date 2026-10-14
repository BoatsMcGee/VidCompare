import { base } from '$app/paths';

/** Repository home — the single absolute repo URL for the site; everything else derives from it. */
export const repoUrl = 'https://github.com/BoatsMcGee/VidCompare';
export const releasesUrl = `${repoUrl}/releases`;
export const upstreamUrl = 'https://github.com/pixop/video-compare';

/** Screenshot file names produced by the CI screenshot pipeline (see website/static/screenshots/README.md). */
export interface Shot {
  file: string;
  caption: string;
}

export const shots: Shot[] = [
  { file: 'main-window-light.png', caption: 'Main window' },
  { file: 'main-window-dark.png', caption: 'Main window' },
  { file: 'file-panels-light.png', caption: 'File panels with sibling file lists' },
  { file: 'file-panels-dark.png', caption: 'File panels with sibling file lists' },
  { file: 'options-groups-light.png', caption: 'Options groups with side-aligned L/R columns' },
  { file: 'options-groups-dark.png', caption: 'Options groups with side-aligned L/R columns' },
  { file: 'log-panel-light.png', caption: 'In-app log panel streaming sidecar output' },
  { file: 'log-panel-dark.png', caption: 'In-app log panel streaming sidecar output' },
  { file: 'presets-bar-light.png', caption: 'Presets bar' },
  { file: 'presets-bar-dark.png', caption: 'Presets bar' },
  { file: 'find-helper-dialog-light.png', caption: 'Find-helper dialog for custom video-compare binaries' },
  { file: 'find-helper-dialog-dark.png', caption: 'Find-helper dialog for custom video-compare binaries' },
  { file: 'compare-page-light.png', caption: 'Compare page with embedded video-compare surface' },
  { file: 'compare-page-dark.png', caption: 'Compare page with embedded video-compare surface' },
  { file: 'options-quick-light.png', caption: 'Quick options group' },
  { file: 'options-quick-dark.png', caption: 'Quick options group' },
  { file: 'options-display-light.png', caption: 'Display options group' },
  { file: 'options-display-dark.png', caption: 'Display options group' },
  { file: 'options-playback-light.png', caption: 'Playback options group' },
  { file: 'options-playback-dark.png', caption: 'Playback options group' },
  { file: 'options-color-light.png', caption: 'Color options group' },
  { file: 'options-color-dark.png', caption: 'Color options group' },
  { file: 'options-filters-light.png', caption: 'Filters options group' },
  { file: 'options-filters-dark.png', caption: 'Filters options group' },
  { file: 'options-io-light.png', caption: 'Inputs & decoding options group' },
  { file: 'options-io-dark.png', caption: 'Inputs & decoding options group' },
  { file: 'options-scopes-light.png', caption: 'Scopes options group' },
  { file: 'options-scopes-dark.png', caption: 'Scopes options group' },
  { file: 'options-advanced-light.png', caption: 'Advanced options group' },
  { file: 'options-advanced-dark.png', caption: 'Advanced options group' }
];

export function shotUrl(file: string): string {
  return `${base}/screenshots/${file}`;
}
