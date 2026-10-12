import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/svelte';
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
import { resetAppState } from '../test-utils';

beforeEach(() => {
  resetAppState();
});

afterEach(cleanup);

describe('CompareView a11y', () => {
  it('empty surface has no axe violations', async () => {
    const { container } = render(CompareView);
    await waitFor(() => screen.getByTestId('compare-launch'));
    await expectNoAxeViolations(container);
  });

  it('failed-capture state has no axe violations', async () => {
    const { container } = render(CompareView, {
      props: { binaryPath: 'C:\\bin\\video-compare.exe' },
    });
    await waitFor(() => screen.getByTestId('compare-launch'));
    await expectNoAxeViolations(container);
  });
});


