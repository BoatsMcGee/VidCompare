import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';

vi.mock('../ipc', () => ({
  ipc: { runInfoCommand: vi.fn() },
}));

import FindHelperDialog from './FindHelperDialog.svelte';
import { ipc } from '../ipc';
import { resetAppState } from '../test-utils';
import { expectNoAxeViolations } from '../test-a11y';

const runInfoCommand = vi.mocked(ipc.runInfoCommand);

beforeEach(() => {
  resetAppState();
  runInfoCommand.mockReset();
});
afterEach(cleanup);

describe('FindHelperDialog accessibility', () => {
  it('has no axe violations when opened for filters', async () => {
    const { container } = render(FindHelperDialog, {
      props: { kind: 'filters', onClose: () => {} },
    });
    await expectNoAxeViolations(container);
  });

  it('has no axe violations with a search result rendered', async () => {
    runInfoCommand.mockResolvedValue('scale\nhqdn3d');
    const { container } = render(FindHelperDialog, {
      props: { kind: 'decoders', onClose: () => {} },
    });
    await expectNoAxeViolations(container);
  });
});
