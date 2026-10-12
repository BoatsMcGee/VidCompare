import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { expectNoAxeViolations } from '../test-a11y';

vi.mock('../ipc', () => ({
  ipc: {
    listProfiles: vi.fn(),
    installProfile: vi.fn(),
    saveSettings: vi.fn(),
  },
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
}));

import ProfileManager from './ProfileManager.svelte';
import { ipc } from '../ipc';
import { appState } from '../state/app.svelte';
import { resetAppState, makeProfile } from '../test-utils';

const listProfiles = vi.mocked(ipc.listProfiles);
const installProfile = vi.mocked(ipc.installProfile);
const saveSettings = vi.mocked(ipc.saveSettings);
const { readTextFile } = await import('@tauri-apps/plugin-fs');

const profileJson = JSON.stringify(makeProfile());

beforeEach(() => {
  resetAppState();
  appState.profile = makeProfile();
  listProfiles.mockReset();
  installProfile.mockReset();
  saveSettings.mockReset();
  saveSettings.mockResolvedValue(undefined);
  listProfiles.mockResolvedValue([]);
});

afterEach(cleanup);

describe('ProfileManager', () => {
  it('lists profiles on mount', async () => {
    listProfiles.mockResolvedValue([
      {
        id: 'video-compare-latest',
        path: 'C:\\profiles\\video-compare-latest.json',
        upstream_version: '20261004',
        min_app_version: '0.1.0',
        source: 'bundled',
      },
    ]);
    render(ProfileManager);
    await waitFor(() => expect(screen.getByText('video-compare-latest')).toBeTruthy());
    expect(screen.getByText(/upstream 20261004/)).toBeTruthy();
  });

  it('activates a profile and persists the choice', async () => {
    listProfiles.mockResolvedValue([
      {
        id: 'video-compare-latest',
        path: 'C:\\profiles\\video-compare-latest.json',
        upstream_version: '20261004',
        min_app_version: '0.1.0',
        source: 'bundled',
      },
    ]);
    appState.settings = {
      theme: 'system',
      custom_binary_path: null,
      custom_profile_path: null,
      active_profile: null,
      recent_folders: [],
      log_level: 'info',
      portable: false,
    };
    vi.mocked(readTextFile).mockResolvedValue(profileJson);
    render(ProfileManager);
    await waitFor(() => screen.getByRole('button', { name: 'Use' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Use' }));
    await waitFor(() => expect(appState.profileId).toBe('video-compare-latest'));
    expect(appState.settings?.active_profile).toBe('video-compare-latest');
    expect(saveSettings).toHaveBeenCalled();
  });

  it('shows an error when activation fails', async () => {
    listProfiles.mockResolvedValue([
      {
        id: 'broken',
        path: 'C:\\profiles\\broken.json',
        upstream_version: 'x',
        min_app_version: '0.1.0',
        source: 'downloaded',
      },
    ]);
    vi.mocked(readTextFile).mockRejectedValue(new Error('unreadable'));
    render(ProfileManager);
    await waitFor(() => screen.getByRole('button', { name: 'Use' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Use' }));
    await waitFor(() => expect(screen.getByText(/Failed to load profile/)).toBeTruthy());
  });

  it('has no accessibility violations', async () => {
    listProfiles.mockResolvedValue([]);
    const { container } = render(ProfileManager);
    await waitFor(() => expect(screen.getByText('Install from file…')).toBeTruthy());
    await expectNoAxeViolations(container);
  });
});
