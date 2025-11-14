import { defineConfig } from 'eslint-define-config';

const eslintConfig = defineConfig({
  ignorePatterns: [
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'dist/**',
    'node_modules/**',
  ],
  root: true,
  extends: [
    'next/core-web-vitals',
    'next/typescript',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
  },
});

export default eslintConfig;
