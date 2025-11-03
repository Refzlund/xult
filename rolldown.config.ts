import { defineConfig } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

export default defineConfig({
	input: './src/index.ts',
	plugins: [dts({ tsgo: true })],	
	output: [{
		dir: 'dist',
		format: 'esm',
		banner: '// @ts-nocheck\n/* oxlint-disable */\n/* eslint-disable */',
	}]
})