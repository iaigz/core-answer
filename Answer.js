const assert = require('assert')
const { STATUS_CODES } = require('http')

const Log = require('@iaigz/core-log')
const log = new Log()

log.level = log.INFO

// EXPOSED OBJ
const constructor = module.exports = function Answer (opts) {
  assert(this instanceof Answer, 'use the new keyword')

  assert(typeof opts !== 'undefined', 'must specify parameters')

  if (opts instanceof RegExp || typeof opts === 'string') {
    opts = { pattern: opts }
  }
  if (typeof opts === 'function') opts = { handler: opts }

  opts = {
    pattern: /.*/, // defaults to any posible url pattern
    ...opts
  }

  if (typeof opts.pattern === 'string') {
    opts.pattern = new RegExp(`^${opts.pattern}$`)
  }
  if (typeof opts.handler === 'function') {
    this._handle = opts.handler
  }

  assert(opts.pattern instanceof RegExp, 'unexpected non-RegExp')
  assert(typeof this._handle === 'function', 'unexpected non-function')

  Object.defineProperties(this, {
    pattern: { get: () => opts.pattern, enumerable: true },
    handler: { get: () => this.handle.bind(this), enumerable: true }
  })

  return this
}

constructor.prototype = {
  constructor: constructor,
  accepts: function (request) {
    let origin = `http://${request.headers.host}`
    let url = null
    if (request.socket.encrypted) {
      origin = `https://${request.headers.host}`
    }
    try {
      // see https://nodejs.org/api/http.html#http_message_url
      url = new URL(request.url, origin)
    } catch (err) {
      const { method, url } = request
      log.error('%s %s throws an error when parsing url', method, url)
      log.error('origin:', origin)
      log.error('encrypted?', request.socket.encrypted)
      log.error(request.headers)
      throw err
    }
    return this.pattern.test(url.pathname)
  },
  // There isn't next function: answers aren't connect-like middleware
  handle: function (request, response) {
    if (!request.headers) {
      log.warn('received a request without headers')
      // 400 is "Bad request"
      return this.forbid(request, response, 400)
    }
    if (this.accepts(request)) {
      try {
        return this._handle(request, response)
      } catch (err) {
        const { method, url } = request
        log.error('%s %s throws an error', method, url)
        log.error(err.stack)
      }
    } else {
      log.warn('asked to handle un-accepted request')
    }
    return this.forbid(request, response, 500)
  },
  // forbid is 'what todo when request should not be handled'
  // default code is 501 - "Not implemented"
  forbid: function (request, response, code = 501) {
    assert.notStrictEqual(typeof STATUS_CODES[code], 'undefined')
    response.writeHead(code, {
      Connection: 'close',
      'Content-Type': 'text/plain'
    })
    response.end(STATUS_CODES[code])
  },
  _handle: function (request, response) {
    // for future-proof, don't implement OK or client-error here
    return this.forbid(request, response)
  }
}

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
