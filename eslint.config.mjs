// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier/flat'

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    eslintConfigPrettier,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-shadow': 'error',
        },
    },
    {
        ignores: ['dist'],
    }
)
