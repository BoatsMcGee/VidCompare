import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'src-tauri/target',
      'src-tauri/gen',
      'website/build',
      'website/.svelte-kit',
      // .svelte.ts modules use Svelte's compiler (runes); the TS parser
      // cannot handle them — svelte-check owns these files.
      '**/*.svelte.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  ...svelte.configs['flat/recommended'],
  ...svelte.configs['flat/prettier'].map((c) => ({ ...c, rules: {} })),
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.svelte'],
      },
    },
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['**/*.test.ts', 'src/lib/test-utils.ts', 'src/lib/test-setup.ts', 'src/lib/test-a11y.ts'],
    rules: {
      // Test fixtures intentionally construct partial objects and use `any`
      // in vi.mocked positions.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/unbound-method': 'off',
      // vi.mock factories and empty stub callbacks are idiomatic in tests.
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  {
    // Svelte 5 runes + the app's established patterns:
    // - `no-confusing-void-expression`: `onclick={() => (x = y)}` and
    //   `void promise` in $effect are idiomatic; 51 hits were all this shape.
    // - `no-unnecessary-condition`: option values are `unknown` by design
    //   (lenient profile parsing), so guards look "unnecessary" to the
    //   typechecker but are runtime-required.
    // - `no-base-to-string` / `restrict-template-expressions`: String(unknown)
    //   interpolation of profile-driven values is the documented pattern.
    // - `dot-notation` / `consistent-type-definitions`: interfaces are used
    //   for IPC contracts (serde camelCase mirror); keep both spellings.
    // - `no-non-null-assertion` / `non-nullable-type-assertion-style`:
    //   profile lookups (`appState.profile!`) are guarded by derived state.
    rules: {
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/array-type': 'off',
    },
  },
  {
    rules: {
      // Kept on: these catch real bugs (floating promises, dead code,
      // missing each-keys, empty functions in app code).
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
);
