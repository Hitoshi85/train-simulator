const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  {
    files: ['game.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'script', globals: globals.browser },
    rules: { 'no-unused-vars': ['error', { args: 'none' }] },
  },
  {
    files: ['eslint.config.js', 'playwright.config.js', 'tests/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
  },
];
