import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

// https://rollupjs.org/#javascript-api
export default {
	input: 'src/gblock.js',
	indent: '\t',
	sourcemap: true,
	plugins: [
		glsl(),
		commonjs(),
		resolve()
	],
	watch: {
		include: 'src/**'
	},
	output: [
		{
			format: 'iife',
			banner: '// https://github.com/tomas-polach/aframe-gblock',
			name: 'gblock', // and global object name in browser environment
			globals: {
				THREE: 'THREE',
				AFRAME: 'AFRAME'
			},
			file: 'dist/gblock.js'
		}
	]
}

// plugins

// inspired by https://github.com/mrdoob/three.js/blob/86424d9b318f617254eb857b31be07502ea27ce9/rollup.config.js
function glsl () {
	return {
		transform(code, id) {
			if (/\.glsl$/.test(id) === false) return
			// remove comments and fix new line chars
			code = code
				.replace(/[ \t]*\/\/.*\n/g, '') // remove //
				.replace(/[ \t]*\/\*[\s\S]*?\*\//g, '') // remove /* */
				.replace(/\n{2,}/g, '\n') // # \n+ to \n
			// convert to base64
			code = 'data:text/plain;base64,' + new Buffer(code).toString('base64')
			// add module wrapper
			code = 'export default ' + JSON.stringify(code) + ';'
			return {
				code: code,
				map: {mappings: ''}
			}
		}
	}
}