import { describe, it, expect } from 'vitest';
import { buildArgs, formatCommand, shellEscape } from './args';
import { parseProfile } from './profile';
import type { OptionProfile } from './profile';

const minimalProfile: OptionProfile = {
  profileVersion: 1,
  minAppVersion: '0.1.0',
  upstream: { version: '2025-01-01' },
  groups: [{ id: 'quick', label: 'Quick', order: 0 }],
  options: [
    {
      id: 'mode',
      flag: '--mode',
      label: 'Mode',
      help: 'Display mode',
      group: 'quick',
      appliesTo: 'global',
      type: { kind: 'enum', values: [{ value: 'split', label: 'Split' }] },
    },
    {
      id: 'decoder',
      label: 'Decoder',
      help: 'Decoder',
      group: 'quick',
      appliesTo: 'pair',
      pairStyle: 'separateFlags',
      flags: { both: '--decoder', left: '--left-decoder', right: '--right-decoder' },
      type: { kind: 'string' },
    },
    {
      id: 'color-space',
      label: 'Color space',
      help: 'Color space',
      group: 'quick',
      appliesTo: 'pair',
      pairStyle: 'colon',
      flags: { both: '--color-space' },
      type: { kind: 'string' },
    },
    {
      id: 'fullscreen',
      flag: '--fullscreen',
      label: 'Fullscreen',
      help: 'Fullscreen',
      group: 'quick',
      appliesTo: 'global',
      type: { kind: 'bool' },
    },
  ],
};

describe('buildArgs', () => {
  it('emits global options', () => {
    const args = buildArgs(
      {
        left: { path: 'left.mp4' },
        rights: [{ path: 'right.mp4' }],
        options: { mode: { value: 'vstack' } },
      },
      minimalProfile,
    );
    expect(args).toContain('--mode');
    expect(args).toContain('vstack');
    expect(args).toContain('left.mp4');
    expect(args).toContain('right.mp4');
  });

  it('emits bool options only when true', () => {
    const args = buildArgs(
      {
        left: { path: 'l.mp4' },
        rights: [{ path: 'r.mp4' }],
        options: { fullscreen: { value: true } },
      },
      minimalProfile,
    );
    expect(args).toContain('--fullscreen');
  });

  it('emits linked pair option as combined flag', () => {
    const args = buildArgs(
      {
        left: { path: 'l.mp4' },
        rights: [{ path: 'r.mp4' }],
        options: { decoder: { value: 'h264_cuvid', linked: true } },
      },
      minimalProfile,
    );
    expect(args).toContain('--decoder');
    expect(args).toContain('h264_cuvid');
    expect(args).not.toContain('--left-decoder');
  });

  it('emits unlinked pair option as separate flags', () => {
    const args = buildArgs(
      {
        left: { path: 'l.mp4' },
        rights: [{ path: 'r.mp4' }],
        options: { decoder: { linked: false, leftValue: 'h264_cuvid', rightValue: 'libdav1d' } },
      },
      minimalProfile,
    );
    expect(args).toContain('--left-decoder');
    expect(args).toContain('h264_cuvid');
    expect(args).toContain('--right-decoder');
    expect(args).toContain('libdav1d');
  });

  it('emits colon-style pair option', () => {
    const args = buildArgs(
      {
        left: { path: 'l.mp4' },
        rights: [{ path: 'r.mp4' }],
        options: { 'color-space': { linked: false, leftValue: 'bt2020nc', rightValue: 'bt709' } },
      },
      minimalProfile,
    );
    expect(args).toContain('--color-space');
    expect(args).toContain('bt2020nc:bt709');
  });

  it('emits __ placeholder for sameAsLeft', () => {
    const args = buildArgs(
      {
        left: { path: 'l.mp4' },
        rights: [{ path: 'r.mp4', sameAsLeft: true }],
        options: {},
      },
      minimalProfile,
    );
    expect(args).toContain('__');
  });

  it('emits per-video overrides', () => {
    const args = buildArgs(
      {
        left: { path: 'l.mp4' },
        rights: [{ path: 'r.mp4', overrides: { filters: 'yadif', hwaccel: 'cuda' } }],
        options: {},
      },
      minimalProfile,
    );
    expect(args).toContain('r.mp4::filters=yadif::hwaccel=cuda');
  });
});

describe('shellEscape', () => {
  it('leaves simple args unchanged', () => {
    expect(shellEscape('--mode')).toBe('--mode');
    expect(shellEscape('vstack')).toBe('vstack');
  });

  it('quotes args with spaces', () => {
    expect(shellEscape('hello world')).toBe('"hello world"');
  });
});

describe('formatCommand', () => {
  it('formats a full command', () => {
    const cmd = formatCommand(['--mode', 'vstack', 'left.mp4', 'right.mp4']);
    expect(cmd).toBe('video-compare --mode vstack left.mp4 right.mp4');
  });
});

describe('parseProfile', () => {
  it('parses a valid profile', () => {
    const profile = parseProfile(minimalProfile);
    expect(profile.profileVersion).toBe(1);
    expect(profile.options).toHaveLength(4);
  });

  it('coerces unknown type.kind to raw', () => {
    const bad = {
      ...minimalProfile,
      options: [
        {
          id: 'x',
          label: 'X',
          help: 'X',
          group: 'quick',
          appliesTo: 'global',
          type: { kind: 'future-widget' },
        },
      ],
    };
    const profile = parseProfile(bad);
    expect(profile.options[0].type.kind).toBe('raw');
  });

  it('throws on a profile that is not an object', () => {
    expect(() => parseProfile('nope')).toThrow(/Invalid option profile/);
    expect(() => parseProfile(null)).toThrow(/Invalid option profile/);
  });

  it('throws when options is not an array', () => {
    const bad = { ...minimalProfile, options: 'not-an-array' };
    expect(() => parseProfile(bad)).toThrow(/Invalid option profile/);
  });

  it('keeps known kinds untouched during lenient coercion', () => {
    const profile = parseProfile(minimalProfile);
    expect(profile.options[0].type.kind).toBe('enum');
  });
});

describe('emitOption edge cases', () => {
  it('skips options with no flag unless pair', () => {
    const profile: OptionProfile = {
      ...minimalProfile,
      options: [
        {
          id: 'nolabel',
          label: 'No flag',
          help: 'x',
          group: 'quick',
          appliesTo: 'global',
          type: { kind: 'string' },
        },
      ],
    };
    const args = buildArgs(
      { left: { path: 'l.mp4' }, rights: [], options: { nolabel: { value: 'v' } } },
      profile,
    );
    expect(args).toEqual(['l.mp4']);
  });

  it('skips left/right values that are empty or false', () => {
    const profile: OptionProfile = {
      ...minimalProfile,
      options: [
        {
          id: 'lf',
          flags: { left: '--left-f' },
          label: 'L',
          help: 'x',
          group: 'quick',
          appliesTo: 'left',
          type: { kind: 'string' },
        },
        {
          id: 'rf',
          flags: { right: '--right-f' },
          label: 'R',
          help: 'x',
          group: 'quick',
          appliesTo: 'right',
          type: { kind: 'string' },
        },
      ],
    };
    const args = buildArgs(
      {
        left: { path: 'l.mp4' },
        rights: [],
        options: { lf: { leftValue: '' }, rf: { rightValue: false } },
      },
      profile,
    );
    expect(args).toEqual(['l.mp4']);
  });

  it('emits bool left/right flags only when truthy', () => {
    const profile: OptionProfile = {
      ...minimalProfile,
      options: [
        {
          id: 'lb',
          flags: { left: '--left-b' },
          label: 'LB',
          help: 'x',
          group: 'quick',
          appliesTo: 'left',
          type: { kind: 'bool' },
        },
        {
          id: 'rb',
          flags: { right: '--right-b' },
          label: 'RB',
          help: 'x',
          group: 'quick',
          appliesTo: 'right',
          type: { kind: 'bool' },
        },
      ],
    };
    const args = buildArgs(
      {
        left: { path: 'l.mp4' },
        rights: [],
        options: { lb: { leftValue: true }, rb: { rightValue: true } },
      },
      profile,
    );
    expect(args).toEqual(['--left-b', '--right-b', 'l.mp4']);
  });

  it('skips pair values when linked but empty', () => {
    const args = buildArgs(
      {
        left: { path: 'l.mp4' },
        rights: [],
        options: { decoder: { value: '', linked: true } },
      },
      minimalProfile,
    );
    expect(args).toEqual(['l.mp4']);
  });

  it('skips unlinked pair sides lacking flags', () => {
    const profile: OptionProfile = {
      ...minimalProfile,
      options: [
        {
          id: 'noflags',
          label: 'No flags',
          help: 'x',
          group: 'quick',
          appliesTo: 'pair',
          pairStyle: 'separateFlags',
          type: { kind: 'string' },
        },
      ],
    };
    const args = buildArgs(
      {
        left: { path: 'l.mp4' },
        rights: [],
        options: { noflags: { linked: false, leftValue: 'a', rightValue: 'b' } },
      },
      profile,
    );
    expect(args).toEqual(['l.mp4']);
  });

  it('skips colon pair when both sides empty', () => {
    const args = buildArgs(
      {
        left: { path: 'l.mp4' },
        rights: [],
        options: { 'color-space': { linked: false, leftValue: '', rightValue: '' } },
      },
      minimalProfile,
    );
    expect(args).toEqual(['l.mp4']);
  });

  it('emits only the non-empty side of a colon pair', () => {
    const args = buildArgs(
      {
        left: { path: 'l.mp4' },
        rights: [],
        options: { 'color-space': { linked: false, leftValue: 'bt709', rightValue: '' } },
      },
      minimalProfile,
    );
    expect(args).toContain('--color-space');
    expect(args).toContain('bt709:');
  });
});
