const assert = require('assert')

const Log = require('@iaigz/core-log')
const log = new Log()

log.level = log.INFO

const { METHODS, STATUS_CODES } = require('http')

// ApiAnswer pseudo-class
const parent = require('./Answer')
const constructor = module.exports = function ApiAnswer (opts) {
  assert(this instanceof ApiAnswer, 'use the new keyword')

  if (typeof opts === 'function') opts = { GET: opts }

  parent.call(this, opts)

  Object.defineProperties(this, {
    GET: { get: () => opts.GET || null, enumerable: true },
    PUT: { get: () => opts.PUT || null, enumerable: true },
    HEAD: { get: () => opts.HEAD || null, enumerable: true },
    POST: { get: () => opts.POST || null, enumerable: true },
    PATCH: { get: () => opts.PATCH || null, enumerable: true },
    DELETE: { get: () => opts.DELETE || null, enumerable: true }
  })

  return this
}

const prototype = constructor.prototype = Object.create(parent.prototype)
prototype.constructor = constructor

prototype.accepts = function (request) {
  return parent.prototype.accepts.call(this, request) &&
    typeof this[request.method] === 'function'
}

prototype.forbid = function (request, response) {
  if (typeof this[request.method] === 'function') {
    return parent.prototype.forbid(request, response)
  }
  // 405 status code is client error: Method Not Allowed
  response.writeHead(405, {
    Allow: METHODS.filter(m => typeof this[m] === 'function').join(', '),
    Connection: 'close',
    'Content-Type': 'text/plain'
  })
  response.end(STATUS_CODES[405])
}

prototype._handle = function (request, response) {
  const { method } = request
  assert(typeof this[method] === 'function', 'unexpected non-function')
  return this[method](request, response)
}

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
