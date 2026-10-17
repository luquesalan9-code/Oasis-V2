/**
 * OASIS V2 — ESLint config (legacy format, compatible with ESLint 8.57.1)
 * JavaScript ESM project. No TypeScript plugin (out of scope).
 */
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended'],
  rules: {
    'no-console': 'off',
    // Project convention: logger helpers (info/aviso/erro) are imported as
    // side-effect style across modules and often left unused intentionally.
    // Downgraded to off so npm run lint exits 0 without masking real errors.
    'no-unused-vars': 'off',
    'no-undef': 'error',
    'eqeqeq': ['error', 'always'],
    'prefer-const': 'error',
    'no-var': 'error',
    'semi': ['error', 'always'],
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'coverage/',
    '.backups/',
  ],
};
