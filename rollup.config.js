import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
export default /** @type {import('rollup').RollupOptions} */ ({
  input: 'action.js',
  output: {
    file: 'action.cjs',
    format: 'cjs',
    banner: '/* eslint-disable *//* prettier-ignore */'
  },
  plugins: [nodeResolve(), commonjs(), json()]
})
