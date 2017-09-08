var express = require('express')
var request = require('request')
var corsMiddleware = require('cors')

// setup
var app = express()

app.use(corsMiddleware({
  credentials: true,
  origin: function (origin, callback) {
    callback(null, origin)
  }
}))

// routing
app.get('/get-gltf-url/*', function (req, res, next) {

  var id = req.params[0]
  var url = 'https://vr.google.com/objects/' + id

  request({
    method: 'GET',
    url: url
  }, function (error, response, body) {

    var path = 'https:\\/\\/vr\\.google\\.com\\/downloads\\/'

    var isRemixable = body.indexOf('Not remixable') === -1
    var gltfUrl = new RegExp(`(${path}${id}\\/[-_a-zA-Z0-9]*\\/model\\.gltf)`).exec(body)

    if (!isRemixable) {
      res.status(405).send('Model is not remixable')
    } else if (gltfUrl) {
      res.send(gltfUrl[0])
    } else {
      res.status(404).send('Model not found')
    }
  })

})

// start server
app.listen(process.env.PORT || 3003, function onServerStarted () {
  console.log('Server started')
})
