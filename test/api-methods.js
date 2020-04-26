const assert = require('assert')
const tester = require('./0')

const Answer = require('../ApiAnswer')

const answerOk = (req, res) => {
  res.statusCode = 200
  res.end('OK')
}

function methodsTest (answer, expect = {}, methods = [], url = '/') {
  return server => {
    const { accept, status } = expect
    methods = methods.slice(0)
    return new Promise((resolve, reject) => {
      console.log(`DESC answer as ${answer}`)
      console.log('DESC methods as', methods)
      const _listen = (req, res) => {
        res.on('finish', () => {
          try {
            assert.strictEqual(res.statusCode, status)
            console.log(`PASS answer uses status code ${status}`)
          } catch (err) {
            console.log(`FAIL answer should use status ${status}`)
            return reject(err)
          }
          if (methods.length) {
            tester.request(url, { method: methods.shift() })
          } else {
            server.removeListener('request', _listen)
            resolve(server)
          }
        })
        const acc = accept ? 'accept' : 'not accept'
        try {
          assert.strictEqual(answer.accepts(req), accept)
          console.log(`PASS answer does ${acc} ${req.method} ${req.url}`)
        } catch (err) {
          console.log(`FAIL answer should ${acc} ${req.method} ${req.url}`)
          reject(err)
        }
        answer.handle(req, res)
      }
      server.on('request', _listen)
      tester.request(url, { method: methods.shift() })
      return server
    })
  }
}

const METHODS_ALL = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

tester
  .initialize(__filename)
  // POSITIVE ACCEPT CASES
  .then(methodsTest(
    new Answer({
      pattern: '/all',
      GET: answerOk,
      POST: answerOk,
      PUT: answerOk,
      PATCH: answerOk,
      DELETE: answerOk
    }),
    { accept: true, status: 200 }, METHODS_ALL, '/all'
  ))
  .then(methodsTest(
    new Answer({
      pattern: '/no-delete',
      GET: answerOk,
      POST: answerOk,
      PUT: answerOk,
      PATCH: answerOk
    }),
    { accept: true, status: 200 }, METHODS_ALL.slice(0, -1), '/no-delete'
  ))
  .then(methodsTest(
    new Answer({
      pattern: '/get/post/put',
      GET: answerOk,
      POST: answerOk,
      PUT: answerOk
    }),
    { accept: true, status: 200 }, METHODS_ALL.slice(0, -2), '/get/post/put'
  ))
  .then(methodsTest(
    new Answer({ pattern: '/get/post', GET: answerOk, POST: answerOk }),
    { accept: true, status: 200 }, METHODS_ALL.slice(0, -3), '/get/post'
  ))
  .then(methodsTest(
    new Answer({ pattern: '/only-get', GET: answerOk }),
    { accept: true, status: 200 }, METHODS_ALL.slice(0, -4), '/only-get'
  ))
  // NEGATIVE ACCEPT CASES
  .then(methodsTest(
    new Answer({
      pattern: '/no-delete',
      GET: answerOk,
      POST: answerOk,
      PUT: answerOk,
      PATCH: answerOk
    }),
    { accept: false, status: 405 }, ['DELETE'], '/no-delete'
  ))
  .then(methodsTest(
    new Answer({
      pattern: '/get/post/put',
      GET: answerOk,
      POST: answerOk,
      PUT: answerOk
    }),
    { accept: false, status: 405 }, ['PATCH', 'DELETE'], '/get/post/put'
  ))
  .then(methodsTest(
    new Answer({ pattern: '/get/post', GET: answerOk, POST: answerOk }),
    { accept: false, status: 405 }, METHODS_ALL.slice(-3), '/get/post'
  ))
  .then(methodsTest(
    new Answer({ pattern: '/only-get', GET: answerOk }),
    { accept: false, status: 405 }, METHODS_ALL.slice(-4), '/only-get'
  ))
  // NEGATIVE (NO HANDLER DEFINED)
  // ApiAnswer must interpret method-not-allowed when url matches
  .then(methodsTest(
    new Answer(/.*/), { accept: false, status: 405 }, METHODS_ALL
  ))
  .then(methodsTest(
    new Answer('/noop'), { accept: false, status: 405 }, METHODS_ALL, '/noop'
  ))
  // ApiAnswer must interpret this as server error when url does not match
  .then(methodsTest(
    new Answer('/noop'), { accept: false, status: 500 }, METHODS_ALL, '/other'
  ))
  // TEARDOWN
  .catch(tester.catcher)
  .finally(tester.teardown)

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
