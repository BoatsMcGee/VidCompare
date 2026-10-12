import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { expectNoAxeViolations } from '../test-a11y';

const writeText = vi.fn();

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

import LogPanel from './LogPanel.svelte';
import { appState, type LaunchSession } from '../state/app.svelte';
import { resetAppState } from '../test-utils';

function makeSession(overrides: Partial<LaunchSession> = {}): LaunchSession {
  return {
    id: 's1',
    binary: 'C:\\vc\\video-compare.exe',
    args: ['--mode', 'split'],
    startedAt: 1,
    exitCode: null,
    lines: [
      { stream: 'stdout', text: 'line 1' },
      { stream: 'stderr', text: 'err 1' },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  resetAppState();
  // jsdom does not implement the async clipboard API.
  Object.assign(navigator, { clipboard: { writeText } });
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('LogPanel', () => {
  it('renders the active session lines with stderr styling', () => {
    appState.sessions = [makeSession()];
    appState.activeSessionId = 's1';
    render(LogPanel);

    expect(screen.getByText('line 1')).toBeTruthy();
    const err = screen.getByText('err 1');
    expect(err.className).toContain('stderr');
  });

  it('shows the empty state when no session is active', () => {
    appState.sessions = [];
    appState.activeSessionId = null;
    render(LogPanel);
    expect(
      screen.getByText('video-compare output appears here after you launch it.'),
    ).toBeTruthy();
  });

  it('switches sessions via tabs', async () => {
    appState.sessions = [
      makeSession({ id: 's1', lines: [{ stream: 'stdout', text: 'from s1' }] }),
      makeSession({ id: 's2', lines: [{ stream: 'stdout', text: 'from s2' }] }),
    ];
    appState.activeSessionId = 's1';
    render(LogPanel);

    await fireEvent.click(screen.getByRole('button', { name: /s2/ }));
    expect(appState.activeSessionId).toBe('s2');
    expect(screen.getByText('from s2')).toBeTruthy();
  });

  it('marks exited sessions with their exit code', () => {
    appState.sessions = [makeSession({ exitCode: 3 })];
    appState.activeSessionId = 's1';
    render(LogPanel);
    expect(screen.getByText(/s1 \(3\)/)).toBeTruthy();
  });

  it('has no accessibility violations', async () => {
    appState.sessions = [makeSession()];
    appState.activeSessionId = 's1';
    const { container } = render(LogPanel);
    await expectNoAxeViolations(container);
  });
});
