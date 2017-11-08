// TODO: Replace this with an official API once available
// This API only fetches the official glTF URL of a google block model from google blocks website.
// The glTF itself is not being proxied and gets fetched from https://vr.google.com/downloads/* directly.
// https://github.com/archilogic-com/aframe-gblock/issues/1

const request = require('request')
const google = require('googleapis')
const customsearch = google.customsearch('v1')

// configs

var SEARCH_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 3
var SEARCH_COUNTER_MAX = 5000 // max daily requests to google API
var GOOGLE_API_KEY = process.env.GOOGLE_CLOUD_API_KEY
var GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID // custom search engine (CSE) ID
// Get your CSE ID from: https://cse.google.com/cse/all
// - include the following pages in your CSE configs: >> "Basics" >> "Sites to search"
// https://vr.google.com/objects/*
// - exclude the following pages in your CSE configs: >> "Basics" >> "Sites to search" >> "Advanced" >> "Sites to exclude"
// https://vr.google.com/objects/user*
// https://vr.google.com/objects/category*
// https://vr.google.com/objects/*/sources*
// https://vr.google.com/objects/*/remixes*

// shared

var gblockCache = {}
var searchCache = {}
var searchCounter = 0
var searchCounterDay = getDayTimestamp()

// main

exports.search = function searchGoogleBlocksSite(req, res) {

  var query = req.query.query
  var limit = Number.isInteger(parseInt(req.query.limit)) ? parseInt(req.query.limit) : 10
  var offset = Number.isInteger(parseInt(req.query.offset)) ? parseInt(req.query.offset) : 1

  // check params
  if (offset < 1 || offset > (101 - limit)) {
    // limitation by google apis. https://productforums.google.com/forum/#!topic/customsearch/iafqT6dl2VM;context-place=topicsearchin/customsearch/category$3Atroubleshooting-and-bugs%7Csort:relevance%7Cspell:false
    res.status(400).send({ message: 'param "offset" must be a value between 1 and (101 - limit)' })
    return
  }
  if (limit < 1 || limit > 10) {
    // limitation by google apis. https://productforums.google.com/forum/#!topic/customsearch/iafqT6dl2VM;context-place=topicsearchin/customsearch/category$3Atroubleshooting-and-bugs%7Csort:relevance%7Cspell:false
    res.status(400).send({ message: 'param "limit" must be between 0 and 10' })
    return
  }

  // get from cache if available and not too old
  var cacheKey = offset + '-' + limit + '-' + query
  if (searchCache[cacheKey]) {
    var timeDelta = Date.now() - searchCache[cacheKey].timestamp
    if (timeDelta < SEARCH_CACHE_MAX_AGE) {
      res.status(200).send(searchCache[cacheKey])
      return
    }
  }

  // stop API if daily limit has been reached
  var currentDay = getDayTimestamp()
  if (searchCounter > SEARCH_COUNTER_MAX && currentDay === searchCounterDay) {
    res.status(400).send('API quota exceed. Pls Try again tomorrow.')
    return
  }

  customsearch.cse.list({
    // params infos:
    // https://developers.google.com/apis-explorer/?hl=en_GB#p/customsearch/v1/search.cse.list
    // https://github.com/google/google-api-nodejs-client/blob/master/apis/customsearch/v1.ts
    // https://developers.google.com/custom-search/docs/xml_results
    auth: GOOGLE_API_KEY,
    cx: GOOGLE_CSE_ID,
    q: query,
    start: offset,
    num: limit // limit amount of search results
    //sort: '?'
  }, function onSearchResult(error, result) {

    if (error) {
      res.status(400).send(error)
      return
    }

    if (currentDay === searchCounterDay) {
      // update counter
      searchCounter++
      console.log('google search count: '+searchCounter)
    } else {
      // reset counter
      searchCounter = 0
      searchCounterDay = currentDay
      console.log('counter has been reset to day '+currentDay)
    }

    var searchResults = {
      searchTime: result.searchInformation.searchTime,
      totalResults: result.searchInformation.totalResults, // .formattedTotalResults
      items: result.items ? result.items.map(parseItem) : [],
      timestamp: Date.now()
    }

    searchCache[cacheKey] = searchResults

    res.status(200).send(searchResults)

  })

}

exports.getGltfUrl = function getGltfUrlFromGoogleBlocksSite (req, res) {

  var url = req.query.url

  // check params
  if (!req.query.url || req.query.url === '') {
    res.status(400).send({ message: 'Please provide "url" query param in URL: i.e. "https://vr.google.com/objects/?url="' })
    return
  }
  if (
    req.query.url.substring(0,30) !== 'https://vr.google.com/objects/'
    && req.query.url.substring(0,29) !== 'https://poly.google.com/view/'
  ) {
    res.status(400).send({ message: 'param "url" must start with "https://vr.google.com/objects/" or "https://poly.google.com/view/"' })
    return
  }

  // remove trailing slash
  if (url[url.length-1] === '/') url = url.substring(0, url.length-1)
  // get id from url
  var id = url.split('/').pop()

  // get result from cache if possible
  if (gblockCache[id]) {
    res.send(gblockCache[id])
    return
  }

  request({
    method: 'GET',
    url: url
  }, function (error, response, body) {

    var path = 'https:\\/\\/vr\\.google\\.com\\/downloads\\/'

    var isRemixable = body.indexOf('Not remixable') === -1
    var objUrl =  new RegExp(`(${path}${id}\\/[-_a-zA-Z0-9]*\\/${id}_obj\\.zip)`).exec(body)
    var gltfUrl = new RegExp(`(${path}${id}\\/[-_a-zA-Z0-9]*\\/[-_a-zA-Z0-9%]*\\.gltf)`).exec(body)
    
    if (!isRemixable) {
      res.status(405).send({ message: 'Model is not remixable' })

    } else if (gltfUrl) {
      var result = {
        gltfUrl: gltfUrl[0],
        objUrl: objUrl ? objUrl[0] : undefined,
        timestamp: Date.now()
      }
      gblockCache[id] = result
      res.send(result)

    } else {
      res.status(404).send({ message: 'Model not found' })
    }
  })

}

// helpers

function getDayTimestamp() {
  return Math.floor(Date.now() / (1000 * 60 * 60 * 24))
}

function parseItem(rawItem){

  var item = {}

  item.url = rawItem.link // see also: .formattedUrl .htmlFormattedUrl

  if (rawItem.pagemap && rawItem.pagemap) {
    var pagemap = rawItem.pagemap

    if (pagemap.metatags && pagemap.metatags[0]) {
      var metatags = pagemap.metatags[0]
      // title
      item.title = metatags['og:title'] // (nice title) alternative: item.title (html page title)
      // model author
      item.author = metatags['og:description']
      // images
      item.image = metatags['og:image']
    }

    //item.smallImage = pagemap.cse_thumbnail && pagemap.cse_thumbnail[0] ? pagemap.cse_thumbnail[0].src : null
    //item.largeImage = pagemap.cse_image && pagemap.cse_image[0] ? pagemap.cse_image[0].src : null

  }

  return item

}
