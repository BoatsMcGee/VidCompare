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

  it('copies the command to the clipboard', async () => {
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    appState.rightFiles = [{ path: 'C:\\clips\\b.mp4' }];
    render(CommandPreview);
    await fireEvent.click(screen.getByTitle('Copy command'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('a.mp4'));
  });

  it('has no accessibility violations', async () => {
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    appState.rightFiles = [{ path: 'C:\\clips\\b.mp4' }];
    const { container } = render(CommandPreview);
    await expectNoAxeViolations(container);
  });
});
