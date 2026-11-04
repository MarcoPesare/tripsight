import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['src/data/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node
    },
    rules: {
      // "_" segnala un argomento richiesto dalla firma ma non usato (es. middleware Express).
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }]
    }
  }
];
