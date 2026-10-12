import type { OptionProfile, OptionSpec } from './profile';

/**
 * State for a single option value.
 * - For global/left/right/both options: `value` is the single value.
 * - For pair options: `linked` controls whether both sides share `value`,
 *   or use independent `leftValue`/`rightValue`.
 */
export interface OptionValue {
  value?: unknown;
  linked?: boolean;
  leftValue?: unknown;
  rightValue?: unknown;
}

export interface InputFile {
  path: string;
  /** Per-video overrides serialized as `::key=value::key2=value2` */
  overrides?: Record<string, string>;
  /** Use `__` placeholder (same file as left) */
  sameAsLeft?: boolean;
}

export interface BuildState {
  left: InputFile | null;
  rights: InputFile[];
  options: Record<string, OptionValue>;
}

/** Build the argv array for video-compare from the current state + profile. */
export function buildArgs(state: BuildState, profile: OptionProfile): string[] {
  const args: string[] = [];

  for (const opt of profile.options) {
    const ov = state.options[opt.id];
    if (!ov) continue;

    const emitted = emitOption(opt, ov);
    if (emitted) args.push(...emitted);
  }

  // Positional inputs: left, then rights
  if (state.left) {
    args.push(state.left.path);
  }
  for (const r of state.rights) {
    if (r.sameAsLeft) {
      args.push('__');
    } else {
      let p = r.path;
      if (r.overrides && Object.keys(r.overrides).length > 0) {
        const parts = Object.entries(r.overrides).map(([k, v]) => `${k}=${v}`);
        p = `${p}::${parts.join('::')}`;
      }
      args.push(p);
    }
  }

  return args;
}

function emitOption(opt: OptionSpec, ov: OptionValue): string[] | null {
  const flag = opt.flag ?? opt.flags?.both;
  const hasSideFlag =
    opt.appliesTo === 'left' ? !!opt.flags?.left : opt.appliesTo === 'right' ? !!opt.flags?.right : false;
  if (!flag && !hasSideFlag && opt.appliesTo !== 'pair') return null;

  switch (opt.appliesTo) {
    case 'global':
    case 'both': {
      const v = ov.value;
      if (v === undefined || v === null || v === '' || v === false) return null;
      if (opt.type.kind === 'bool') return v ? [flag!] : null;
      return [flag!, String(v)];
    }
    case 'left': {
      const v = ov.value ?? ov.leftValue;
      if (v === undefined || v === null || v === '' || v === false) return null;
      const f = opt.flags?.left ?? opt.flag;
      if (!f) return null;
      if (opt.type.kind === 'bool') return v ? [f] : null;
      return [f, String(v)];
    }
    case 'right': {
      const v = ov.value ?? ov.rightValue;
      if (v === undefined || v === null || v === '' || v === false) return null;
      const f = opt.flags?.right ?? opt.flag;
      if (!f) return null;
      if (opt.type.kind === 'bool') return v ? [f] : null;
      return [f, String(v)];
    }
    case 'pair': {
      const linked = ov.linked !== false; // default linked
      if (linked) {
        const v = ov.value;
        if (v === undefined || v === null || v === '' || v === false) return null;
        const f = opt.flags?.both ?? opt.flag;
        if (!f) return null;
        if (opt.type.kind === 'bool') return v ? [f] : null;
        return [f, String(v)];
      }
      // Unlinked: emit left and right separately
      const out: string[] = [];
      const lv = ov.leftValue;
      const rv = ov.rightValue;
      if (opt.pairStyle === 'colon') {
        const l = lv !== undefined && lv !== null && lv !== '' ? String(lv) : '';
        const r = rv !== undefined && rv !== null && rv !== '' ? String(rv) : '';
        if (l || r) {
          const f = opt.flags?.both ?? opt.flag;
          if (f) out.push(f, `${l}:${r}`);
        }
      } else {
        if (lv !== undefined && lv !== null && lv !== '' && lv !== false) {
          const f = opt.flags?.left;
          if (f) {
            if (opt.type.kind === 'bool') { if (lv) out.push(f); }
            else out.push(f, String(lv));
          }
        }
        if (rv !== undefined && rv !== null && rv !== '' && rv !== false) {
          const f = opt.flags?.right;
          if (f) {
            if (opt.type.kind === 'bool') { if (rv) out.push(f); }
            else out.push(f, String(rv));
          }
        }
      }
      return out.length > 0 ? out : null;
    }
  }
}

/** Shell-escape a single argument for display purposes. */
export function shellEscape(arg: string): string {
  if (/^[a-zA-Z0-9_\-./:=+]+$/.test(arg)) return arg;
  return `"${arg.replace(/(["\\$`!])/g, '\\$1')}"`;
}

/** Format argv as a copy-pasteable shell command string. */
export function formatCommand(args: string[], binary = 'video-compare'): string {
  return [binary, ...args].map(shellEscape).join(' ');
}
