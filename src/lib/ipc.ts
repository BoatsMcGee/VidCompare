import { invoke } from '@tauri-apps/api/core';

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  mtime: number | null;
  ext: string;
  is_video: boolean;
}

export interface BinaryInfo {
  path: string;
  source: string;
  version: string;
}

export interface LaunchHandle {
  id: string;
  started_at: number;
}

/** Physical-pixel rect relative to the window client area (top-left origin). */
export interface MpvRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EmbedLaunchResult {
  id: string;
  started_at: number;
  pid: number;
  embedded: boolean;
  reason: string | null;
  /** Client-area aspect ratio (w/h) of the captured window, when known. */
  aspect: number | null;
}

export interface PathInfo {
  is_dir: boolean;
}

export interface Settings {
  theme: string;
  custom_binary_path: string | null;
  custom_profile_path: string | null;
  active_profile: string | null;
  recent_folders: string[];
  log_level: string;
  portable: boolean;
}

export interface ProfileMeta {
  id: string;
  path: string;
  upstream_version: string;
  min_app_version: string;
  source: string;
}

export const ipc = {
  listMediaFiles: (dir: string, includeAll: boolean) =>
    invoke<FileEntry[]>('list_media_files', { dir, includeAll }),
  resolveBinary: (customPath?: string) =>
    invoke<BinaryInfo>('resolve_binary', { customPath: customPath ?? null }),
  runInfoCommand: (kind: string, term: string) =>
    invoke<string>('run_info_command', { kind, term }),
  launch: (binary: string, args: string[]) =>
    invoke<LaunchHandle>('launch', { binary, args }),
  kill: (id: string) => invoke<void>('kill', { id }),
  embedLaunch: (binary: string, args: string[], rect: MpvRect) =>
    invoke<EmbedLaunchResult>('embed_launch', { binary, args, rect }),
  embedSetRect: (id: string, rect: MpvRect, visible: boolean) =>
    invoke<void>('embed_set_rect', { id, rect, visible }),
  embedRelease: (id: string) => invoke<void>('embed_release', { id }),
  embedAvailable: () => invoke<boolean>('embed_available'),
  loadSettings: () => invoke<Settings>('load_settings'),
  saveSettings: (settings: Settings) => invoke<void>('save_settings', { settings }),
  appInfo: () => invoke<{ version: string; portable: boolean; os: string; arch: string }>('app_info'),
  listProfiles: () => invoke<ProfileMeta[]>('list_profiles'),
  installProfile: (pathOrUrl: string) => invoke<ProfileMeta>('install_profile', { pathOrUrl }),
  setActiveProfile: (id: string) => invoke<void>('set_active_profile', { id }),
  fetchProfilesIndex: () => invoke<{ profiles: unknown[] }>('fetch_profiles_index'),
  describePath: (path: string) => invoke<PathInfo>('describe_path', { path }),
};
