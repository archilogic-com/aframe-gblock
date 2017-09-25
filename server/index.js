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
app.get('/get-gltf-url*', function (req, res, next) {

  var url = req.query.url

  // CORS
  res.set('Access-Control-Allow-Origin', "*")
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')

  // check params
  if (!(req.query.url && req.query.url.substring(0,30) === 'https://vr.google.com/objects/')) {
    res.status(400).send({ message: 'param "url" must start with "https://vr.google.com/objects/"' })
    return
  }

  // remove trailing slash
  if (url[url.length-1] === '/') url = url.substring(0, url.length-1)
  // get id from url
  var id = url.split('/').pop()

  request({
    method: 'GET',
    url: url
  }, function (error, response, body) {

    var path = 'https:\\/\\/vr\\.google\\.com\\/downloads\\/'

    var isRemixable = body.indexOf('Not remixable') === -1
    //var objUrl = new RegExp(`(${path}${id}\\/[-_a-zA-Z0-9_-]*\\/${id}_obj\\.zip)`).exec(body)
    var gltfUrl = new RegExp(`(${path}${id}\\/[-_a-zA-Z0-9]*\\/model\\.gltf)`).exec(body)

    if (!isRemixable) {
      res.status(405).send({ message: 'Model is not remixable' })

    } else if (gltfUrl) {
      res.send({ gltfUrl: gltfUrl[0] })

    } else {
      res.status(404).send({ message: 'Model not found' })
    }
  })

})

// start server
app.listen(process.env.PORT || 3003, function onServerStarted () {
  console.log('Server started')
})
