import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { expectNoAxeViolations } from '../test-a11y';

vi.mock('../ipc', () => ({
  ipc: {
    saveSettings: vi.fn(),
  },
}));

import ThemeToggle from './ThemeToggle.svelte';
import { ipc } from '../ipc';
import { appState } from '../state/app.svelte';
import { resetAppState } from '../test-utils';

const saveSettings = vi.mocked(ipc.saveSettings);

beforeEach(() => {
  resetAppState();
  saveSettings.mockReset();
  saveSettings.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('ThemeToggle', () => {
  it('cycles system → light → dark → system', async () => {
    render(ThemeToggle);
    const btn = screen.getByRole('button');
    expect(btn.title).toBe('Theme: system');

    await fireEvent.click(btn);
    expect(appState.theme).toBe('light');
    await fireEvent.click(btn);
    expect(appState.theme).toBe('dark');
    await fireEvent.click(btn);
    expect(appState.theme).toBe('system');
  });

  it('persists the theme when settings are loaded', async () => {
    appState.settings = {
      theme: 'system',
      custom_binary_path: null,
      custom_profile_path: null,
      active_profile: null,
      recent_folders: [],
      log_level: 'info',
      portable: false,
    };
    render(ThemeToggle);
    await fireEvent.click(screen.getByRole('button'));
    expect(appState.settings?.theme).toBe('light');
    await waitFor(() => expect(saveSettings).toHaveBeenCalledTimes(1));
  });

  it('has no accessibility violations', async () => {
    const { container } = render(ThemeToggle);
    await expectNoAxeViolations(container);
  });
});
