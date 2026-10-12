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
  { file: 'main-window-light.png', caption: 'Main window — light theme' },
  { file: 'main-window-dark.png', caption: 'Main window — dark theme' },
  { file: 'file-panels.png', caption: 'File panels with sibling file lists' },
  { file: 'options-groups.png', caption: 'Options groups with side-aligned L/R columns' },
  { file: 'log-panel.png', caption: 'In-app log panel streaming sidecar output' },
  { file: 'presets-bar.png', caption: 'Presets bar' },
  { file: 'find-helper-dialog.png', caption: 'Find-helper dialog for custom video-compare binaries' }
];

export function shotUrl(file: string): string {
  return `${base}/screenshots/${file}`;
}
