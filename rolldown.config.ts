import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'
import nodePolyfills from '@rolldown/plugin-node-polyfills'

export default defineConfig({
	input: './src/index.ts',
	plugins: [
		nodePolyfills(),
		dts({ tsgo: true })
	],	
	output: [{
		dir: 'dist',
		format: 'esm',
		banner: '// @ts-nocheck\n/* oxlint-disable */\n/* eslint-disable */',
	}]
})