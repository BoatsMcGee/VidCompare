import type { DemoOption } from './mock-data';

export interface OptionValue {
  value?: unknown;
  linked?: boolean;
  leftValue?: unknown;
  rightValue?: unknown;
}

/**
 * Mirror of the app's src/lib/options/args.ts serialization for the demo's
 * option subset: global / left / right / pair (separateFlags and colon).
 */
export function buildArgs(
  options: DemoOption[],
  values: Record<string, OptionValue>,
  leftPath: string,
  rightPath: string
): string[] {
  const args: string[] = [];

  for (const opt of options) {
    const ov = values[opt.id];
    if (!ov) continue;
    const emitted = emitOption(opt, ov);
    if (emitted) args.push(...emitted);
  }

  args.push(leftPath, rightPath);
  return args;
}

function emitOption(opt: DemoOption, ov: OptionValue): string[] | null {
  const flag = opt.flag ?? opt.flags?.both;

  switch (opt.appliesTo) {
    case 'global': {
      const v = ov.value;
      if (v === undefined || v === null || v === '' || v === false) return null;
      if (!flag) return null;
      if (opt.type.kind === 'bool') return v ? [flag] : null;
      return [flag, String(v)];
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
      const linked = ov.linked !== false;
      if (linked) {
        const v = ov.value;
        if (v === undefined || v === null || v === '' || v === false) return null;
        const f = opt.flags?.both ?? opt.flag;
        if (!f) return null;
        if (opt.type.kind === 'bool') return v ? [f] : null;
        return [f, String(v)];
      }
      const out: string[] = [];
      const lv = ov.leftValue;
      const rv = ov.rightValue;
      if (opt.pairStyle === 'colon') {
        const l = lv !== undefined && lv !== null && lv !== '' ? String(lv) : '';
        const r = rv !== undefined && rv !== null && rv !== '' ? String(rv) : '';
        const f = opt.flags?.both ?? opt.flag;
        if ((l || r) && f) out.push(f, `${l}:${r}`);
      } else {
        if (lv !== undefined && lv !== null && lv !== '' && lv !== false) {
          const f = opt.flags?.left;
          if (f) {
            if (opt.type.kind === 'bool') {
              if (lv) out.push(f);
            } else {
              out.push(f, String(lv));
            }
          }
        }
        if (rv !== undefined && rv !== null && rv !== '' && rv !== false) {
          const f = opt.flags?.right;
          if (f) {
            if (opt.type.kind === 'bool') {
              if (rv) out.push(f);
            } else {
              out.push(f, String(rv));
            }
          }
        }
      }
      return out.length > 0 ? out : null;
    }
  }
}

/** Shell-escape a single argument for display purposes (same rules as the app). */
export function shellEscape(arg: string): string {
  if (/^[a-zA-Z0-9_\-./:=+]+$/.test(arg)) return arg;
  return `"${arg.replace(/(["\\$`!])/g, '\\$1')}"`;
}

/** Format argv as a copy-pasteable shell command string. */
export function formatCommand(args: string[], binary = 'video-compare'): string {
  return [binary, ...args].map(shellEscape).join(' ');
}
