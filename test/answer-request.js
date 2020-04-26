const assert = require('assert')
const tester = require('./0')

const Answer = require('..')
function answerOk (req, res) {
  res.statusCode = 200
  res.end('OK')
}

tester
  .initialize(__filename)
  .then(server => {
    const answer = new Answer(answerOk)
    server.once('request', answer.handler)
    return tester.request()
      .then(result => {
        const { response, data } = result
        assert.strictEqual(response.statusCode, 200)
        assert.strictEqual(data, 'OK')
        console.log('PASS', 'answer.handler handles a request properly')
        return server
      })
  })
  .then(server => {
    const answer = new Answer(answerOk)
    server.once('request', (req, res) => answer.handle(req, res))
    return tester.request()
      .then(result => {
        const { response, data } = result
        assert.strictEqual(response.statusCode, 200)
        assert.strictEqual(data, 'OK')
        console.log('PASS', 'answer.handle() handles a request properly')
        return server
      })
  })
  .then(server => {
    const answer = new Answer({ handler: answerOk })
    server.once('request', (req, res) => answer.handle(req, res))
    return tester.request()
      .then(result => {
        const { response, data } = result
        assert.strictEqual(response.statusCode, 200)
        assert.strictEqual(data, 'OK')
        console.log('PASS', 'answer.handle() works also via options object')
        return server
      })
  })
  .then(server => {
    const answer = new Answer(() => {
      throw new Error('throwed intentionally')
    })
    server.once('request', answer.handler)
    return tester.request()
      .then(result => {
        assert.strictEqual(result.response.statusCode, 500)
        console.log('PASS', 'answers with code 500 if error is thrown')
        return server
      })
  })
  .then(server => {
    console.log('TODO', 'properly timeouts when request is not answered')
    return server
  })
  .catch(tester.catcher)
  .finally(tester.teardown)

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
