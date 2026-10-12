import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { expectNoAxeViolations } from '../test-a11y';

vi.mock('../ipc', () => ({
  ipc: {
    embedAvailable: vi.fn(),
    embedLaunch: vi.fn(),
    embedSetRect: vi.fn(),
    embedRelease: vi.fn(),
    kill: vi.fn(),
  },
}));

const listenHandlers: ((e: { payload: { id: string; code: number | null } }) => void)[] = [];
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn((_event: string, cb: (e: { payload: { id: string; code: number | null } }) => void) => {
    listenHandlers.push(cb);
    return Promise.resolve(() => undefined);
  }),
}));

import CompareView from './CompareView.svelte';
import { ipc } from '../ipc';
import { appState } from '../state/app.svelte';
import { resetAppState } from '../test-utils';

const embedLaunch = vi.mocked(ipc.embedLaunch);
const embedSetRect = vi.mocked(ipc.embedSetRect);
const embedRelease = vi.mocked(ipc.embedRelease);
const kill = vi.mocked(ipc.kill);

function selectFiles() {
  appState.leftFile = { path: 'C:\\clips\\a.mp4' };
  appState.rightFiles = [{ path: 'C:\\clips\\b.mp4' }];
}

beforeEach(() => {
  resetAppState();
  appState.view = 'compare';
  listenHandlers.length = 0;
  embedLaunch.mockReset();
  embedSetRect.mockReset();
  embedRelease.mockReset();
  embedLaunch.mockResolvedValue({
    id: 'embed-1',
    started_at: 1,
    pid: 4321,
    embedded: true,
    reason: null,
    aspect: 32 / 9,
  });
  embedSetRect.mockResolvedValue(undefined);
  embedRelease.mockResolvedValue(undefined);
  kill.mockReset();
  kill.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('CompareView page', () => {
  it('auto-starts the embed on mount when both files are selected', async () => {
    selectFiles();
    render(CompareView, { props: { binaryPath: 'C:\\bin\\video-compare.exe' } });
    await waitFor(() => expect(embedLaunch).toHaveBeenCalledTimes(1));
    const [binary, args, rect] = embedLaunch.mock.calls[0];
    expect(binary).toBe('C:\\bin\\video-compare.exe');
    expect(Array.isArray(args)).toBe(true);
    expect(typeof rect.width).toBe('number');
    await waitFor(() => screen.getByTestId('embed-active'));
  });

  it('does not launch and shows the hint when files are missing', async () => {
    render(CompareView);
    await waitFor(() => screen.getByText(/select both a left and a right file/i));
    expect(embedLaunch).not.toHaveBeenCalled();
  });

  it('shows the failure reason when capture fails', async () => {
    embedLaunch.mockResolvedValue({
      id: 'embed-1',
      started_at: 1,
      pid: 1,
      embedded: false,
      reason: 'no window found for pid 1',
      aspect: null,
    });
    selectFiles();
    render(CompareView);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toContain('no window found');
    expect(appState.view).toBe('compare');
  });

  it('shows an error when the launch command rejects', async () => {
    embedLaunch.mockRejectedValue(new Error('boom'));
    selectFiles();
    render(CompareView);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  });

  it('returns to setup when the Back button is clicked', async () => {
    selectFiles();
    render(CompareView);
    await fireEvent.click(screen.getByTestId('compare-back'));
    expect(appState.view).toBe('setup');
  });

  it('returns to setup on Escape', async () => {
    selectFiles();
    render(CompareView);
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(appState.view).toBe('setup');
  });

  it('returns to setup when the embedded process exits', async () => {
    selectFiles();
    render(CompareView);
    await waitFor(() => expect(embedLaunch).toHaveBeenCalled());
    await waitFor(() => expect(listenHandlers.length).toBeGreaterThan(0));
    listenHandlers.forEach((h) => h({ payload: { id: 'embed-1', code: 0 } }));
    await waitFor(() => expect(appState.view).toBe('setup'));
  });

  it('releases and kills the embed on unmount', async () => {
    selectFiles();
    const { unmount } = render(CompareView);
    await waitFor(() => expect(embedLaunch).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(embedRelease).toHaveBeenCalledWith('embed-1'));
    expect(kill).toHaveBeenCalledWith('embed-1');
  });

  it('kills the child when going Back', async () => {
    selectFiles();
    render(CompareView);
    await waitFor(() => expect(embedLaunch).toHaveBeenCalled());
    await fireEvent.click(screen.getByTestId('compare-back'));
    expect(appState.view).toBe('setup');
    await waitFor(() => expect(kill).toHaveBeenCalledWith('embed-1'));
  });

  it('re-forwards the surface rect when the page scrolls', async () => {
    selectFiles();
    render(CompareView, { props: { binaryPath: 'C:\\bin\\video-compare.exe' } });
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
    // 640x360 surface letterboxed to 32:9 → 640x180, vertically centered.
    expect(last?.[1]).toEqual({ x: 0, y: 40 + 90, width: 640, height: 180 });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(CompareView);
    await waitFor(() => screen.getByTestId('compare-back'));
    await expectNoAxeViolations(container);
  });
});
