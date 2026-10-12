import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoAxeViolations } from '../test-a11y';

vi.mock('../ipc', () => ({
  ipc: { saveSettings: vi.fn() },
}));

import CommandPreview from './CommandPreview.svelte';
import { ipc } from '../ipc';
import { appState } from '../state/app.svelte';
import { resetAppState, makeProfile } from '../test-utils';

const saveSettings = vi.mocked(ipc.saveSettings);

beforeEach(() => {
  resetAppState();
  appState.profile = makeProfile();
  saveSettings.mockReset();
  saveSettings.mockResolvedValue(undefined);
  // jsdom does not implement the async clipboard API.
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
});

afterEach(cleanup);

describe('CommandPreview', () => {
  it('renders the built command line', () => {
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    appState.rightFiles = [{ path: 'C:\\clips\\b.mp4' }];
    render(CommandPreview);
    const box = screen.getByLabelText('video-compare command') as HTMLTextAreaElement;
    expect(box.value).toMatch(/video-compare .*a\.mp4.*b\.mp4/);
  });

  it('disables launch without a left file', () => {
    render(CommandPreview);
    const launch = screen.getByRole('button', { name: /Launch/ });
    expect((launch as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables launch with files selected', () => {
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    appState.rightFiles = [{ path: 'C:\\clips\\b.mp4' }];
    render(CommandPreview);
    const launch = screen.getByRole('button', { name: /Launch/ });
    expect((launch as HTMLButtonElement).disabled).toBe(false);
  });

  it('invokes onLaunch when the launch button is clicked', async () => {
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    appState.rightFiles = [{ path: 'C:\\clips\\b.mp4' }];
    const onLaunch = vi.fn();
    render(CommandPreview, { props: { onLaunch } });
    await fireEvent.click(screen.getByRole('button', { name: /Launch/ }));
    expect(onLaunch).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    appState.rightFiles = [{ path: 'C:\\clips\\b.mp4' }];
    const { container } = render(CommandPreview);
    await expectNoAxeViolations(container);
  });
});
