const assert = require('assert')
const tester = require('./0')

const Answer = require('..')

const answerOk = (req, res) => {
  res.statusCode = 200
  res.end('OK')
}

const dumbNoop = new Answer('/exact/pattern')
const dumbExact = new Answer({
  pattern: '/exact/pattern',
  handler: answerOk
})

const acceptsTest = (answer, expect = {}, ...request) => (server) => {
  return tester.listener(
    (request, response) => {
      assert.strictEqual(answer.accepts(request), expect.accepts)
      console.log(
        `PASS ${answer} %s url ${request.url}`,
        expect.accepts ? 'accepts' : 'does not accept'
      )
      answer.handle(request, response)
    },
    ...request
  ).then(result => {
    assert.strictEqual(result.response.statusCode, expect.code)
    console.log('PASS', `${answer} uses status ${expect.code} for ${request}`)
    return server
  })
}

tester
  .initialize(__filename)
  // It is possible to create an Answer without provinding a handler
  .then(server => {
    server.once('request', dumbNoop.handler)
    return tester.request('/exact/pattern')
      .then(result => {
        assert.strictEqual(result.response.statusCode, 501)
        console.log('PASS', 'answers with code 501 if no handler is provided')
        console.log('NOTE', '- should this actually be an error?')
        console.log('NOTE', '- seems useful for abstracting endpoints')
        console.log('NOTE', '- seems useful when extending Answer')
        return server
      })
  })
  // NEGATIVE ACCEPT CASES
  .then(acceptsTest(dumbExact, { accepts: false, code: 500 }, '/'))
  .then(acceptsTest(dumbExact, { accepts: false, code: 500 }, '/exact'))
  .then(
    acceptsTest(
      dumbExact,
      { accepts: false, code: 500 },
      '/exact/pattern/more'
    )
  )
  // POSITIVE ACCEPT CASES
  .then(
    acceptsTest(
      dumbExact,
      { accepts: true, code: 200, data: 'OK' },
      '/exact/pattern'
    )
  )
  .then(
    acceptsTest(
      dumbExact,
      { accepts: true, code: 200, data: 'OK' },
      '/exact/pattern?parameter=value'
    )
  )
  .catch(tester.catcher)
  .finally(tester.teardown)

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
