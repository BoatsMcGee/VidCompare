import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { expectNoAxeViolations } from '../test-a11y';

vi.mock('../ipc', () => ({
  ipc: {
    embedAvailable: vi.fn(),
    embedLaunch: vi.fn(),
    embedSetRect: vi.fn(),
    embedRelease: vi.fn(),
  },
}));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => undefined)),
}));

import CompareView from './CompareView.svelte';
import { ipc } from '../ipc';
import { appState } from '../state/app.svelte';
import { resetAppState } from '../test-utils';

const embedAvailable = vi.mocked(ipc.embedAvailable);
const embedLaunch = vi.mocked(ipc.embedLaunch);
const embedSetRect = vi.mocked(ipc.embedSetRect);
const embedRelease = vi.mocked(ipc.embedRelease);

beforeEach(() => {
  resetAppState();
  embedAvailable.mockReset();
  embedLaunch.mockReset();
  embedSetRect.mockReset();
  embedRelease.mockReset();
  embedAvailable.mockResolvedValue(true);
  embedLaunch.mockResolvedValue({
    id: 'embed-1',
    started_at: 1,
    pid: 4321,
    embedded: true,
    reason: null,
  });
  embedSetRect.mockResolvedValue(undefined);
  embedRelease.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('CompareView', () => {
  it('disables Compare until both files are selected', async () => {
    render(CompareView);
    await waitFor(() => screen.getByTestId('compare-launch'));
    expect((screen.getByTestId('compare-launch') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/select both a left and a right file/i)).toBeTruthy();
  });

  it('launches the embed with the selected files', async () => {
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    appState.rightFiles = [{ path: 'C:\\clips\\b.mp4' }];
    render(CompareView, { props: { binaryPath: 'C:\\bin\\video-compare.exe' } });
    await waitFor(() => screen.getByTestId('compare-launch'));
    await fireEvent.click(screen.getByTestId('compare-launch'));
    await waitFor(() => expect(embedLaunch).toHaveBeenCalledTimes(1));
    const [binary, args, rect] = embedLaunch.mock.calls[0];
    expect(binary).toBe('C:\\bin\\video-compare.exe');
    expect(Array.isArray(args)).toBe(true);
    expect(typeof rect.width).toBe('number');
  });

  it('shows the failure reason when capture fails', async () => {
    embedLaunch.mockResolvedValue({
      id: 'embed-1',
      started_at: 1,
      pid: 1,
      embedded: false,
      reason: 'no window found for pid 1',
    });
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    appState.rightFiles = [{ path: 'C:\\clips\\b.mp4' }];
    render(CompareView);
    await waitFor(() => screen.getByTestId('compare-launch'));
    await fireEvent.click(screen.getByTestId('compare-launch'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toContain('no window found');
  });

  it('shows an error when the launch command rejects', async () => {
    embedLaunch.mockRejectedValue(new Error('boom'));
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    appState.rightFiles = [{ path: 'C:\\clips\\b.mp4' }];
    render(CompareView);
    await waitFor(() => screen.getByTestId('compare-launch'));
    await fireEvent.click(screen.getByTestId('compare-launch'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  });

  it('renders the external-window button when onExternal is provided', async () => {
    const onExternal = vi.fn();
    render(CompareView, { props: { onExternal } });
    await waitFor(() => screen.getByTestId('open-external'));
    await fireEvent.click(screen.getByTestId('open-external'));
    expect(onExternal).toHaveBeenCalledTimes(1);
  });

  it('re-forwards the surface rect when the page scrolls', async () => {
    appState.leftFile = { path: 'C:\\clips\\a.mp4' };
    appState.rightFiles = [{ path: 'C:\\clips\\b.mp4' }];
    render(CompareView, { props: { binaryPath: 'C:\\bin\\video-compare.exe' } });
    await waitFor(() => screen.getByTestId('compare-launch'));
    await fireEvent.click(screen.getByTestId('compare-launch'));
    await waitFor(() => expect(embedSetRect).toHaveBeenCalled());

    // jsdom reports a zero rect, so stub the measurement to a scrollable one.
    const surface = screen.getByTestId('surface');
    let top = 100;
    vi.spyOn(surface, 'getBoundingClientRect').mockImplementation(
      () => ({ top, left: 0, width: 640, height: 360 }) as DOMRect,
    );

    const before = embedSetRect.mock.calls.length;
    top = 40;
    window.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(embedSetRect.mock.calls.length).toBeGreaterThan(before));
    const last = embedSetRect.mock.calls.at(-1);
    expect(last?.[1].y).toBe(40);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(CompareView);
    await waitFor(() => screen.getByTestId('compare-launch'));
    await expectNoAxeViolations(container);
  });
});

