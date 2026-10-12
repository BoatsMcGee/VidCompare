import { z } from 'zod';

/**
 * Option Profile — external, versioned UI configuration for VidCompare.
 *
 * The entire options UI is driven by this document. Profiles can be swapped
 * without rebuilding the app, published as release artifacts, and matched to
 * any upstream video-compare version.
 */

export const PROFILE_VERSION = 1;

const enumValue = z.object({
  value: z.string(),
  label: z.string(),
});

const optionType = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('bool') }),
  z.object({ kind: z.literal('string'), placeholder: z.string().optional() }),
  z.object({ kind: z.literal('text'), placeholder: z.string().optional() }),
  z.object({
    kind: z.literal('number'),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    unit: z.string().optional(),
  }),
  z.object({ kind: z.literal('enum'), values: z.array(enumValue), default: z.string().optional() }),
  z.object({ kind: z.literal('enum-multi'), values: z.array(enumValue) }),
  z.object({ kind: z.literal('path'), mode: z.enum(['open', 'save', 'dir']).optional() }),
  z.object({ kind: z.literal('size') }),
  z.object({ kind: z.literal('time-offset') }),
  z.object({ kind: z.literal('color') }),
  z.object({ kind: z.literal('key-value-list') }),
  z.object({ kind: z.literal('filter-chain') }),
  z.object({ kind: z.literal('string-list') }),
  z.object({ kind: z.literal('raw'), pattern: z.string().optional() }),
]);

export type OptionType = z.infer<typeof optionType>;

const optionSpec = z.object({
  id: z.string(),
  flag: z.string().optional(),
  short: z.string().optional(),
  label: z.string(),
  help: z.string(),
  group: z.string(),
  order: z.number().optional(),
  appliesTo: z.enum(['global', 'left', 'right', 'both', 'pair']).default('global'),
  pairStyle: z.enum(['separateFlags', 'colon']).optional(),
  flags: z
    .object({
      both: z.string().optional(),
      left: z.string().optional(),
      right: z.string().optional(),
    })
    .optional(),
  type: optionType,
  default: z.unknown().optional(),
  advanced: z.boolean().optional(),
  perVideo: z.boolean().optional(),
  requires: z.object({ appFeature: z.string() }).optional(),
});

export type OptionSpec = z.infer<typeof optionSpec>;

const groupSpec = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number(),
});

export type GroupSpec = z.infer<typeof groupSpec>;

export const optionProfileSchema = z.object({
  profileVersion: z.number(),
  minAppVersion: z.string(),
  maxAppVersion: z.string().nullable().optional(),
  upstream: z.object({
    version: z.string(),
    sourceUrl: z.string().optional(),
  }),
  meta: z
    .object({
      generatedFrom: z.string().optional(),
      generatedAt: z.string().optional(),
    })
    .optional(),
  inputs: z
    .object({
      multiRight: z.boolean().optional(),
      sameFilePlaceholder: z.string().nullable().optional(),
      perVideoOverrideSyntax: z.string().nullable().optional(),
      maxRightVideos: z.number().optional(),
    })
    .optional(),
  groups: z.array(groupSpec),
  options: z.array(optionSpec),
});

export type OptionProfile = z.infer<typeof optionProfileSchema>;

/** Lenient parse: unknown fields are stripped, unknown type.kind falls back to raw. */
export function parseProfile(json: unknown): OptionProfile {
  const result = optionProfileSchema.safeParse(json);
  if (result.success) return result.data;

  // Lenient fallback: try to salvage by coercing unknown kinds to raw
  if (typeof json === 'object' && json !== null && 'options' in json) {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.options)) {
      const coerced = {
        ...obj,
        options: obj.options.map((o: unknown) => {
          if (typeof o === 'object' && o !== null && 'type' in o) {
            const opt = o as Record<string, unknown>;
            const t = opt.type as Record<string, unknown> | undefined;
            if (t && typeof t.kind === 'string') {
              const known = [
                'bool', 'string', 'text', 'number', 'enum', 'enum-multi',
                'path', 'size', 'time-offset', 'color', 'key-value-list',
                'filter-chain', 'string-list', 'raw',
              ];
              if (!known.includes(t.kind)) {
                return { ...opt, type: { kind: 'raw' } };
              }
            }
          }
          return o;
        }),
      };
      const retry = optionProfileSchema.safeParse(coerced);
      if (retry.success) return retry.data;
    }
  }
  throw new Error(`Invalid option profile: ${result.error.message}`);
}

/** Check if a profile is compatible with the running app version. */
export function isProfileCompatible(profile: OptionProfile, appVersion: string): boolean {
  if (profile.profileVersion > PROFILE_VERSION) return false;
  if (compareVersions(appVersion, profile.minAppVersion) < 0) return false;
  if (profile.maxAppVersion && compareVersions(appVersion, profile.maxAppVersion) > 0) return false;
  return true;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}
