import globals from 'globals'
import pluginJs from '@eslint/js'
// import tseslint from 'typescript-eslint'

export default [
  {
    languageOptions: { globals: globals.browser },
    // ignores: [
    //   'src/database/kysely/*',
    //   // './src/database/kysely/enums',
    // ],
    overrides: [
      {
        extends: [
          // "plugin:@typescript-eslint/recommended",
          'plugin:import/recommended',
          // "plugin:import/typescript",
        ],
        rules: {
          'no-unused-vars': 'warn',
          'no-undef': 'warn',
          'no-console': 'warn',
          'no-constant-condition': 'warn',
          'no-prototype-builtins': 'warn',
          'no-empty': 'warn',
          'prefer-const': 'error',
          '@typescript-eslint/no-unused-vars': 'warn',
          '@typescippt-eslint/no-explicit-any': 'warn',
        },
      },
    ],
  },
  pluginJs.configs.recommended,
  // ...tseslint.configs.recommended,
]
