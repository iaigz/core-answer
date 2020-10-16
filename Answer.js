const assert = require('assert')
const URL = require('url').URL
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
  parseURL: function (...args) { return this.parseUrl(...args) },
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
    const path = Array.isArray(request.route)
      ? request.route[request.route.length - 1]
      : this.parseUrl(request).pathname
    return this.pattern.test(path)
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

    const accepts = this.parseAccept(request.headers.accept)

    if (accepts.some(type => type.mime === '*/*')) return true

    if (typeof this.returns === 'string') {
      return accepts.some(type => type.mime === this.returns)
    } else {
      return this.returns.some(value => accepts.some(t => t.mime === value))
    }
  },
  // There isn't next function: answers aren't connect-like middleware
  handle: function (request, response) {
    if (this.returns !== null) {
      if (typeof this.returns === 'string') {
        response.setHeader('Content-Type', this.returns)
      } else {
        const acceptable = this.parseAccept(request.headers.accept)
        const returns = this.returns
          .filter(value => acceptable.some(t => t.mime === value))
        if (returns.length) {
          response.setHeader('Content-Type', returns.shift())
        } else {
          log.warn('Cannot determine response content-type', {
            url: request.url,
            this: `${this}`,
            'this.returns': this.returns,
            acceptable,
            returns
          })
        }
      }
    }
    if (this.accepts(request)) {
      try {
        return this._handle(request, response)
      } catch (err) {
        const { method, url } = request
        log.error('%s %s throws an error', method, url)
        log.error(err.stack)
        // Code 500 is "Internal Server Error"
        return this.forbid(request, response, 500, err)
      }
    }
    const error = new Error('asked to handle un-acceptable request')
    // Code 500 is "Internal Server Error"
    return this.forbid(request, response, 406, error)
    /*
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
    */
  },
  _handle: function (request, response) {
    // for future-proof, don't implement OK or client-error here
    return this.forbid(request, response, 501)
  },
  // forbid is 'what todo when request should not be handled'
  // default code is 501 - "Not implemented"
  forbid: function (request, response, code = 500, error = null) {
    assert.notStrictEqual(typeof STATUS_CODES[code], 'undefined')

    response.statusCode = code
    response.setHeader('Connection', 'close')

    const content = response.getHeader('Content-Type')

    switch (content) {
      case 'application/json':
        response.end(JSON.stringify(error || {}))
        break
      default:
        log.warn('unsupported default %s response', content)
        response.setHeader('Content-Type', 'text/plain')
        response.end(error ? error.message : STATUS_CODES[code])
        break
    }
  },
  redirect: function (response, location, code = 302) {
    response
      .writeHead(code, { Location: location, Connection: 'close' })
      .end()
  }
}

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
