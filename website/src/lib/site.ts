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
  { file: 'compare-page-dark.png', caption: 'Compare page with embedded video-compare surface' }
];

export function shotUrl(file: string): string {
  return `${base}/screenshots/${file}`;
}
