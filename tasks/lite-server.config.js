// https://github.com/johnpapa/lite-server
// https://browsersync.io/docs/options/
module.exports = {
	port: 3000,
	startPath: '/',
	files: ['index.html','dist'],
	serveStatic: ['./'], // uses index.html in directories
	server: {
		directory: true,
		// this is required to get directory listings (?bug?)
		middleware: { 1: null }
	},
	scrollRestoreTechnique: 'cookie'
}