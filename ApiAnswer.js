const assert = require('assert')

const Log = require('@iaigz/core-log')
const log = new Log()

log.level = log.INFO

const { METHODS } = require('http')

// ApiAnswer pseudo-class
const parent = require('./Answer')
const constructor = module.exports = function ApiAnswer (opts) {
  assert(this instanceof ApiAnswer, 'use the new keyword')

  if (typeof opts === 'function') opts = { GET: opts }

  parent.call(this, opts)

  METHODS
    .filter(method => typeof opts[method] === 'function')
    .forEach(method => Object.defineProperty(this, method, {
      value: opts[method],
      enumerable: true
    }))

  return this
}

const prototype = constructor.prototype = Object.create(parent.prototype)
prototype.constructor = constructor

prototype.isAllowable = function (request) {
  return typeof this[request.method] === 'function'
}

prototype.forbid = function (request, response, code) {
  // 405 is "Method Not Allowed"
  if (code === 405) {
    response.setHeader('Allow',
      METHODS.filter(m => typeof this[m] === 'function').join(', ')
    )
  }
  return parent.prototype.forbid.call(this, request, response, code)
}

prototype._handle = function (request, response) {
  const { method } = request
  assert(typeof this[method] === 'function', 'unexpected non-function')
  return this[method](request, response)
}

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
