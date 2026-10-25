// ESLint flat config for the backend (Node.js + Express + TypeScript).
// Baseline: typescript-eslint's recommended rules. This is a starting
// point, not a finished style guide -- tighten or relax rules here as
// the team agrees on them; don't hand-edit rule choices inside the PR
// review workflow itself.
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      // CLAUDE.md: "No `any` without a written justification comment."
      // Warn rather than error for now so this can land without a
      // separate cleanup pass across the existing codebase. The existing
      // code already has scattered `eslint-disable-next-line no-console`
      // comments, so the team clearly intended console usage to be
      // flagged -- turning the rule on just makes that intent real.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'no-console': 'warn',
    },
  },
);
