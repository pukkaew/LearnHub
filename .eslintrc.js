module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es2021: true,
        node: true,
        jest: true
    },
    extends: [
        'eslint:recommended'
    ],
    parserOptions: {
        ecmaVersion: 12
    },
    rules: {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'no-unused-vars': ['warn'],
        'no-console': 'off',
        'no-empty': 'warn',
        'no-extra-semi': 'error',
        'no-func-assign': 'error',
        'no-unreachable': 'error',
        'curly': 'error',
        'dot-notation': 'error',
        'eqeqeq': 'error',
        'no-empty-function': 'warn',
        'no-multi-spaces': 'error',
        'no-multiple-empty-lines': ['error', { 'max': 2 }],
        'space-before-blocks': 'error',
        'space-in-parens': ['error', 'never'],
        'space-infix-ops': 'error',
        'comma-spacing': ['error', { 'before': false, 'after': true }],
        'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
        'no-trailing-spaces': 'error'
    }
};