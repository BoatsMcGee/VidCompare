import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { ipc, type Settings } from './ipc';

const invokeMock = vi.mocked(invoke);

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(undefined as never);
});

describe('ipc', () => {
  it('listMediaFiles invokes list_media_files with dir and includeAll', async () => {
    invokeMock.mockResolvedValue([] as never);
    await ipc.listMediaFiles('C:\\clips', true);
    expect(invokeMock).toHaveBeenCalledWith('list_media_files', { dir: 'C:\\clips', includeAll: true });
  });

  it('resolveBinary passes customPath through (default null)', async () => {
    await ipc.resolveBinary();
    expect(invokeMock).toHaveBeenCalledWith('resolve_binary', { customPath: null });
    invokeMock.mockClear();
    await ipc.resolveBinary('D:\\bin\\vc.exe');
    expect(invokeMock).toHaveBeenCalledWith('resolve_binary', { customPath: 'D:\\bin\\vc.exe' });
  });

  it('runInfoCommand forwards kind and term', async () => {
    invokeMock.mockResolvedValue('out' as never);
    await expect(ipc.runInfoCommand('filters', 'scale')).resolves.toBe('out');
    expect(invokeMock).toHaveBeenCalledWith('run_info_command', { kind: 'filters', term: 'scale' });
  });

  it('launch / kill use the expected commands', async () => {
    invokeMock.mockResolvedValue({ id: 's1', started_at: 1 } as never);
    await ipc.launch('/bin/vc', ['--mode', 'split']);
    expect(invokeMock).toHaveBeenCalledWith('launch', { binary: '/bin/vc', args: ['--mode', 'split'] });
    invokeMock.mockClear();
    await ipc.kill('s1');
    expect(invokeMock).toHaveBeenCalledWith('kill', { id: 's1' });
  });

  it('settings round-trip commands', async () => {
    const settings: Settings = {
      theme: 'dark',
      custom_binary_path: null,
      custom_profile_path: null,
      active_profile: null,
      recent_folders: [],
      log_level: 'info',
      portable: false,
    };
    invokeMock.mockResolvedValue(settings as never);
    await expect(ipc.loadSettings()).resolves.toEqual(settings);
    invokeMock.mockClear();
    await ipc.saveSettings(settings);
    expect(invokeMock).toHaveBeenCalledWith('save_settings', { settings });
  });

  it('profile and info commands', async () => {
    await ipc.appInfo();
    expect(invokeMock).toHaveBeenCalledWith('app_info');
    invokeMock.mockClear();
    await ipc.listProfiles();
    expect(invokeMock).toHaveBeenCalledWith('list_profiles');
    invokeMock.mockClear();
    await ipc.installProfile('/tmp/p.json');
    expect(invokeMock).toHaveBeenCalledWith('install_profile', { pathOrUrl: '/tmp/p.json' });
    invokeMock.mockClear();
    await ipc.setActiveProfile('video-compare-latest');
    expect(invokeMock).toHaveBeenCalledWith('set_active_profile', { id: 'video-compare-latest' });
    invokeMock.mockClear();
    await ipc.fetchProfilesIndex();
    expect(invokeMock).toHaveBeenCalledWith('fetch_profiles_index');
  });

  it('propagates rejections from invoke', async () => {
    invokeMock.mockRejectedValue(new Error('boom'));
    await expect(ipc.listMediaFiles('/x', false)).rejects.toThrow('boom');
  });

  it('embed commands use the expected IPC surface', async () => {
    invokeMock.mockResolvedValue(true as never);
    await expect(ipc.embedAvailable()).resolves.toBe(true);
    expect(invokeMock).toHaveBeenCalledWith('embed_available');
    invokeMock.mockClear();

    const rect = { x: 0, y: 0, width: 640, height: 360 };
    invokeMock.mockResolvedValue({
      id: 'e1',
      started_at: 1,
      pid: 100,
      embedded: true,
      reason: null,
    } as never);
    await expect(ipc.embedLaunch('vc.exe', ['-l', 'a.mp4'], rect)).resolves.toEqual({
      id: 'e1',
      started_at: 1,
      pid: 100,
      embedded: true,
      reason: null,
    });
    expect(invokeMock).toHaveBeenCalledWith('embed_launch', {
      binary: 'vc.exe',
      args: ['-l', 'a.mp4'],
      rect,
    });
    invokeMock.mockClear();

    invokeMock.mockResolvedValue(undefined as never);
    await ipc.embedSetRect('e1', rect, true);
    expect(invokeMock).toHaveBeenCalledWith('embed_set_rect', {
      id: 'e1',
      rect,
      visible: true,
    });
    invokeMock.mockClear();
    await ipc.embedRelease('e1');
    expect(invokeMock).toHaveBeenCalledWith('embed_release', { id: 'e1' });
    invokeMock.mockClear();

    invokeMock.mockResolvedValue({ is_dir: true } as never);
    await expect(ipc.describePath('C:\\clips')).resolves.toEqual({ is_dir: true });
    expect(invokeMock).toHaveBeenCalledWith('describe_path', { path: 'C:\\clips' });
  });
});
