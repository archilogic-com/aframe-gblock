var express = require('express')
var corsMiddleware = require('cors')
var methods = require('./api-methods.js')

// setup
var app = express()

// CORS
app.use(corsMiddleware({
  credentials: true,
  origin: function (origin, callback) {
    callback(null, origin)
  }
}))

// API
app.get('/api/search*', methods.search)
app.get('/api/get-gltf-url*', methods.getGltfUrl)

// static
app.use(express.static('docs'))
app.use(express.static('dist'))

// start server
app.listen(process.env.PORT || 3005, function onServerStarted () {
  console.log('Server started')
})
