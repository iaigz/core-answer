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
    // TODO accepts: null,
    returns: null,
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
    pattern: { value: opts.pattern, enumerable: true },
    returns: { value: opts.returns, enumerable: true },
    handler: { value: this.handle.bind(this), enumerable: true }
  })

  return this
}

constructor.prototype = {
  constructor: constructor,
  toString: function () {
    return this.returns
      ? `[${this.constructor.name} ${this.pattern} => ${this.returns}]`
      : `[${this.constructor.name} ${this.pattern}]`
  },
  parseUrl: function (request) {
    let origin = `http://${request.headers.host}`
    if (request.socket.encrypted) {
      origin = `https://${request.headers.host}`
    }
    try {
      // see https://nodejs.org/api/http.html#http_message_url
      return new URL(request.url, origin)
    } catch (err) {
      const { method, url } = request
      log.error('%s %s throws an error when parsing url', method, url)
      log.error('origin:', origin)
      log.error('encrypted?', request.socket.encrypted)
      log.error('headers:', request.headers)
      throw err
    }
  },
  accepts: function (request) {
    // TODO does request.headers exist?
    if (!request.headers) {
      log.warn('cannot accept a request without headers')
      return false
    }
    return this.isAllowable(request) &&
      this.isAcceptable(request) &&
      this.matches(request)
  },
  matches: function (request) {
    const url = this.parseUrl(request)
    return this.pattern.test(url.pathname)
  },
  isAllowable: function (request) {
    // base Answer does't care about request methods
    return true
  },
  parseAccept: function (header) {
    return header
      .split(',')
      .map(val => {
        const parts = val.trim().split(';')
        return { mime: parts.shift(), param: parts }
        // TODO could use quality parameter to sort out types
      })
  },
  isAcceptable: function (request) {
    if (this.returns === null) return true
    if (!request.headers.accept) return false
    const types = this.parseAccept(request.headers.accept)
    if (typeof this.returns === 'string') {
      return types.some(t => t.mime === this.returns)
    } else {
      return this.returns.some(value => types.some(t => t.mime === value))
    }
  },
  // There isn't next function: answers aren't connect-like middleware
  handle: function (request, response) {
    if (this.accepts(request)) {
      if (this.returns !== null) {
        if (typeof this.returns === 'string') {
          response.setHeader('Content-Type', this.returns)
        } else {
          const acceptable = this.parseAccept(request.headers.accept)
          const returns = this.returns
            .filter(value => acceptable.some(t => t.mime === value))
          response.setHeader('Content-Type', returns.shift())
        }
      }
      try {
        return this._handle(request, response)
      } catch (err) {
        const { method, url } = request
        log.error('%s %s throws an error', method, url)
        log.error(err.stack)
      }
    } else {
      log.warn('asked to handle un-acceptable request')
      if (!request.headers) {
        // 400 is "Bad request"
        return this.forbid(request, response, 400)
      }
      if (this.pattern.test(request.url)) {
        if (!this.isAllowable(request)) {
          return this.forbid(request, response, 405)
        }
        if (!this.isAcceptable(request)) {
          return this.forbid(request, response, 406)
        }
      }
    }
    // Code 500 is "Internal Server Error"
    return this.forbid(request, response, 500)
  },
  _handle: function (request, response) {
    // for future-proof, don't implement OK or client-error here
    return this.forbid(request, response)
  },
  // forbid is 'what todo when request should not be handled'
  // default code is 501 - "Not implemented"
  forbid: function (request, response, code = 501) {
    assert.notStrictEqual(typeof STATUS_CODES[code], 'undefined')
    response.statusCode = code
    response.setHeader('Connection', 'close')
    switch (this.returns) {
      case 'application/json':
        response.setHeader('Content-type', this.returns)
        response.end(JSON.stringify(STATUS_CODES[code]))
        break
      case null:
        response.setHeader('Content-Type', 'text/plain')
        response.end(STATUS_CODES[code])
        break
      default:
        log.warn('unsupported default %s response', this.returns)
        response.setHeader('Content-type', this.returns)
        response.end()
        break
    }
  },
  redirect: function (response, location) {
    response.writeHead(302, { Location: location })
    response.end()
  }
}

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
