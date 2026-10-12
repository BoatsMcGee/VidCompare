export interface DemoFileEntry {
  name: string;
  path: string;
  size: number;
  ext: string;
  is_video: boolean;
}

export const leftDir = 'P:\\videos\\clip';
export const rightDir = 'P:\\videos\\encode-test';

const L = (name: string, size: number, ext: string, isVideo = true): DemoFileEntry => ({
  name,
  path: `${leftDir}\\${name}`,
  size,
  ext,
  is_video: isVideo
});

const R = (name: string, size: number, ext: string, isVideo = true): DemoFileEntry => ({
  name,
  path: `${rightDir}\\${name}`,
  size,
  ext,
  is_video: isVideo
});

export const leftEntries: DemoFileEntry[] = [
  L('take2.mkv', 208 * 1024 * 1024, 'mkv'),
  L('take2-h264.mp4', 96 * 1024 * 1024, 'mp4'),
  L('take2-av1.mkv', 61 * 1024 * 1024, 'mkv'),
  L('take2-prores.mov', 1240 * 1024 * 1024, 'mov'),
  L('take2.srt', 14 * 1024, 'srt', false),
  L('notes.txt', 2 * 1024, 'txt', false)
];

export const rightEntries: DemoFileEntry[] = [
  R('take2-h264.mp4', 96 * 1024 * 1024, 'mp4'),
  R('take2-av1.mkv', 61 * 1024 * 1024, 'mkv'),
  R('take2-hevc.mp4', 84 * 1024 * 1024, 'mp4'),
  R('take2-vp9.webm', 72 * 1024 * 1024, 'webm'),
  R('encode-test.log', 31 * 1024, 'log', false)
];

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export interface DemoGroup {
  id: string;
  label: string;
}

export const groups: DemoGroup[] = [
  { id: 'quick', label: 'Quick' },
  { id: 'display', label: 'Display' },
  { id: 'playback', label: 'Playback' },
  { id: 'color', label: 'Color' },
  { id: 'filters', label: 'Filters' },
  { id: 'io', label: 'Inputs & Decoding' },
  { id: 'scopes', label: 'Scopes' },
  { id: 'advanced', label: 'Advanced' }
];

export interface DemoOption {
  id: string;
  label: string;
  flag?: string;
  flags?: { left?: string; right?: string; both?: string };
  help: string;
  group: string;
  appliesTo: 'global' | 'left' | 'right' | 'pair';
  type: {
    kind: 'bool' | 'string' | 'number' | 'enum';
    values?: { value: string; label: string }[];
    placeholder?: string;
  };
  pairStyle?: 'separateFlags' | 'colon';
  order?: number;
}

/**
 * A representative subset of the real option profile
 * (src-tauri/profiles/video-compare-latest.json). Flags, help text, enum values
 * and pair styles are copied from it verbatim.
 */
export const demoOptions: DemoOption[] = [
  // Quick
  {
    id: 'display-mode',
    flag: '--mode',
    label: 'Display mode',
    help: 'Layout: split screen, vertical stack, or horizontal stack.',
    group: 'quick',
    appliesTo: 'global',
    type: {
      kind: 'enum',
      values: [
        { value: 'split', label: 'split' },
        { value: 'vstack', label: 'vstack' },
        { value: 'hstack', label: 'hstack' }
      ]
    },
    order: 0
  },
  {
    id: 'time-shift',
    flag: '--time-shift',
    label: 'Time shift',
    help: "Shift the right video's timestamps (e.g. 0.150, -0.1, x1.04+0.1).",
    group: 'quick',
    appliesTo: 'global',
    type: { kind: 'string', placeholder: 'e.g. 0.150' },
    order: 1
  },
  {
    id: 'auto-loop-mode',
    flag: '--auto-loop-mode',
    label: 'Auto-loop',
    help: 'Auto-loop playback when buffer fills: off, on (forward), or pp (ping-pong).',
    group: 'quick',
    appliesTo: 'global',
    type: {
      kind: 'enum',
      values: [
        { value: 'off', label: 'off' },
        { value: 'on', label: 'on' },
        { value: 'pp', label: 'pp' }
      ]
    },
    order: 2
  },
  {
    id: 'fullscreen',
    flag: '--fullscreen',
    label: 'Fullscreen',
    help: 'Start in fullscreen mode (desktop fullscreen without changing display mode).',
    group: 'quick',
    appliesTo: 'global',
    type: { kind: 'bool' },
    order: 3
  },
  // Display
  {
    id: 'window-size',
    flag: '--window-size',
    label: 'Window size',
    help: 'Override window size as WxH (e.g. 800x600, 1280x, x480).',
    group: 'display',
    appliesTo: 'global',
    type: { kind: 'string', placeholder: 'e.g. 1280x720' },
    order: 0
  },
  {
    id: 'ui-scale',
    flag: '--ui-scale',
    label: 'UI scale',
    help: 'UI scale multiplier for on-screen text (e.g. 1.25).',
    group: 'display',
    appliesTo: 'global',
    type: { kind: 'number' },
    order: 1
  },
  {
    id: 'high-dpi',
    flag: '--high-dpi',
    label: 'High DPI',
    help: 'Allow high DPI mode for e.g. displaying UHD content on Retina displays.',
    group: 'display',
    appliesTo: 'global',
    type: { kind: 'bool' },
    order: 2
  },
  // Playback
  {
    id: 'frame-buffer-size',
    flag: '--frame-buffer-size',
    label: 'Frame buffer',
    help: 'Frame buffer size (e.g. 10, 70 or 150), default is 50.',
    group: 'playback',
    appliesTo: 'global',
    type: { kind: 'number' },
    order: 0
  },
  {
    id: 'wheel-sensitivity',
    flag: '--wheel-sensitivity',
    label: 'Wheel sensitivity',
    help: 'Mouse wheel sensitivity (e.g. 0.5, -1 or 1.7), default is 1.',
    group: 'playback',
    appliesTo: 'global',
    type: { kind: 'number' },
    order: 1
  },
  // Color
  {
    id: 'color-space',
    flags: { both: '--color-space' },
    flag: '--color-space',
    label: 'Color space',
    help: 'Color space conversion (e.g. bt709, bt2020nc).',
    group: 'color',
    appliesTo: 'pair',
    pairStyle: 'colon',
    type: { kind: 'string', placeholder: 'e.g. bt709' },
    order: 0
  },
  {
    id: 'left-peak-nits',
    flags: { left: '--left-peak-nits' },
    flag: '--left-peak-nits',
    label: 'Peak nits',
    help: 'Peak luminance of the left source in nits for HDR tone mapping.',
    group: 'color',
    appliesTo: 'left',
    type: { kind: 'number' },
    order: 1
  },
  {
    id: 'right-peak-nits',
    flags: { right: '--right-peak-nits' },
    flag: '--right-peak-nits',
    label: 'Peak nits',
    help: 'Peak luminance of the right source in nits for HDR tone mapping.',
    group: 'color',
    appliesTo: 'right',
    type: { kind: 'number' },
    order: 1
  },
  // Filters
  {
    id: 'left-filters',
    flags: { left: '--left-filters' },
    flag: '--left-filters',
    label: 'Filters',
    help: 'Filter chain applied to the left video (e.g. yadif).',
    group: 'filters',
    appliesTo: 'left',
    type: { kind: 'string', placeholder: 'e.g. yadif' },
    order: 0
  },
  {
    id: 'right-filters',
    flags: { right: '--right-filters' },
    flag: '--right-filters',
    label: 'Filters',
    help: 'Filter chain applied to the right video (e.g. scale=1280:720).',
    group: 'filters',
    appliesTo: 'right',
    type: { kind: 'string', placeholder: 'e.g. scale=1280:720' },
    order: 0
  },
  {
    id: 'conversion-fit',
    flag: '--conversion-fit',
    label: 'Conversion fit',
    help: 'How filtered frames are placed on the conversion canvas: stretch or native.',
    group: 'filters',
    appliesTo: 'global',
    type: {
      kind: 'enum',
      values: [
        { value: 'stretch', label: 'stretch' },
        { value: 'native', label: 'native' }
      ]
    },
    order: 1
  },
  // Inputs & Decoding
  {
    id: 'demuxer',
    flags: { both: '--demuxer', left: '--left-demuxer', right: '--right-demuxer' },
    flag: '--demuxer',
    label: 'Demuxer',
    help: 'Force a specific demuxer for the inputs.',
    group: 'io',
    appliesTo: 'pair',
    pairStyle: 'separateFlags',
    type: { kind: 'string', placeholder: 'e.g. matroska' },
    order: 0
  },
  {
    id: 'decoder',
    flags: { both: '--decoder', left: '--left-decoder', right: '--right-decoder' },
    flag: '--decoder',
    label: 'Decoder',
    help: 'Force a specific decoder for the inputs.',
    group: 'io',
    appliesTo: 'pair',
    pairStyle: 'separateFlags',
    type: { kind: 'string', placeholder: 'e.g. h264_cuvid' },
    order: 1
  },
  {
    id: 'hwaccel',
    flags: { both: '--hwaccel', left: '--left-hwaccel', right: '--right-hwaccel' },
    flag: '--hwaccel',
    label: 'HW accel',
    help: 'Hardware-accelerated decoding (e.g. cuda, videotoolbox, vaapi).',
    group: 'io',
    appliesTo: 'pair',
    pairStyle: 'separateFlags',
    type: { kind: 'string', placeholder: 'e.g. cuda' },
    order: 2
  },
  // Scopes
  {
    id: 'histogram-window',
    flag: '--histogram-window',
    label: 'Histogram window',
    help: 'Open always-on-top histogram scopes window.',
    group: 'scopes',
    appliesTo: 'global',
    type: { kind: 'bool' },
    order: 0
  },
  {
    id: 'vectorscope-window',
    flag: '--vectorscope-window',
    label: 'Vectorscope window',
    help: 'Open always-on-top vectorscope scopes window.',
    group: 'scopes',
    appliesTo: 'global',
    type: { kind: 'bool' },
    order: 1
  },
  // Advanced
  {
    id: 'verbose',
    flag: '--verbose',
    label: 'Verbose',
    help: 'Enable verbose output, including library versions and rendering details.',
    group: 'advanced',
    appliesTo: 'global',
    type: { kind: 'bool' },
    order: 0
  },
  {
    id: 'no-auto-filters',
    flag: '--no-auto-filters',
    label: 'No auto filters',
    help: 'Disable automatic filter insertion.',
    group: 'advanced',
    appliesTo: 'global',
    type: { kind: 'bool' },
    order: 1
  }
];
