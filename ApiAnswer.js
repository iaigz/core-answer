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

  METHODS.forEach(method => Object.defineProperty(this, method, {
    get: () => opts[method] || null,
    enumerable: true
  }))

  return this
}

const prototype = constructor.prototype = Object.create(parent.prototype)
prototype.constructor = constructor

prototype.toString = function () {
  return `[${this.constructor.name} ` +
  METHODS.filter(m => typeof this[m] === 'function').join('/') +
  ` ${this.pattern}]`
}

prototype.accepts = function (request) {
  return parent.prototype.accepts.call(this, request) &&
    typeof this[request.method] === 'function'
}

prototype.forbid = function (request, response) {
  if (parent.prototype.accepts.call(this, request)) {
    // 405 status code is client error: Method Not Allowed
    response.writeHead(405, {
      Allow: METHODS.filter(m => typeof this[m] === 'function').join(', '),
      Connection: 'close',
      'Content-Type': 'text/plain'
    })
    response.end(STATUS_CODES[405])
  } else {
    return parent.prototype.forbid.call(this, request, response, 500)
  }
}

prototype._handle = function (request, response) {
  const { method } = request
  assert(typeof this[method] === 'function', 'unexpected non-function')
  return this[method](request, response)
}

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
