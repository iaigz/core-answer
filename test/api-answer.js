const assert = require('assert')

console.log('TEST node', __filename)

process.on('exit', code => { console.log('CODE', code) })

let Answer = null

try {
  Answer = require('../ApiAnswer')
  console.log('PASS module can be required without errors')
} catch (err) {
  console.error(err.stack)
  console.log('FAIL module should be able to be required without errors')
  process.exit(1)
}

let answer = null

try {
  answer = new Answer()
  throw new Error('fail')
} catch (err) {
  if (err.message === 'fail') {
    console.log('FAIL instances should not be able to be created without args')
    process.exit(1)
  }
  console.log('PASS instances are not able to be created without parameters')
}

[
  function gethandler (request, response) {},
  '/some/string/as/pattern',
  /^(.*|some-regexp)/,
  {}
].forEach(value => {
  try {
    answer = new Answer(value)
    console.log('PASS instance can be created with %s', value)
  } catch (err) {
    console.error(err.stack)
    console.log('FAIL instances should be able to be created with %s', value)
    process.exit(1)
  }
  if (answer instanceof Answer) {
    console.log('PASS inheritance chain seems ok for', value)
  } else {
    console.log('FAIL inheritance chain broken for', value)
    process.exit(1)
  }
  try {
    assert.notStrictEqual(typeof answer.pattern, 'undefined', 'missing pattern')
    assert.strictEqual(typeof answer.accepts, 'function', 'missing accepts()')
    assert.strictEqual(typeof answer.handler, 'function', 'missing handler()')
    assert.strictEqual(typeof answer.handle, 'function', 'missing accepts()')
  } catch (err) {
    console.error(err.stack)
    console.log('FAIL Answer interface is not meet for', value)
    process.exit(1)
  }
  console.log('PASS Answer interface seems ok for', value)
})

try {
  // constructing without method handlers leads to non-acceptable always
  answer = new Answer('/something')

  ;['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach(method => {
    assert.strictEqual(answer.accepts({
      url: '/something', method: method
    }), false)
  })
} catch (err) {
  console.error(err.stack)
  console.log('FAIL unexpected behaviour for "accepts method" feature')
  process.exit(1)
}
console.log('PASS "accepts method" feature behaviour seems ok')

process.stdin.resume()
console.log('INFO asynchronous tests begin (stdin resumed)')

const http = require('http')
const server = http.createServer()
const SRV_PORT = 3456

new Promise((resolve, reject) => {
  server
    .on('error', reject)
    .on('listening', () => {
      console.log('INFO test server is listening at port', SRV_PORT)
      resolve()
    })
    .listen(SRV_PORT)
})
  .then(() => new Promise((resolve, reject) => {
    const answer = new Answer(function (req, res) {
      res.statusCode = 200
      res.end('OK')
    })
    server.once('request', answer.handler)
    http
      .request({ hostname: 'localhost', port: SRV_PORT })
      .on('error', reject)
      .on('response', response => {
        let data = ''
        response
          .on('data', (chunk) => { data += chunk })
          .on('end', () => {
            try {
              assert.strictEqual(response.statusCode, 200)
              assert.strictEqual(data, 'OK')
              resolve()
            } catch (err) {
              reject(err)
            }
          })
      })
      .end()
  }))
  .catch(error => {
    console.error(error.stack)
    if (error.code === 'ERR_ASSERTION') {
      console.log('FAIL', `${error.actual} should be ${error.operator} ${error.expected}`)
    }
    console.log('FAIL', error.message)
    process.exitCode = 1
  })
  .finally(() => {
    console.log('INFO closing test server')
    server.close()
    process.stdin.pause()
    console.log(`INFO ${require.resolve('../')} test end (stdin paused)`)
    console.log('INFO If everything went ok, node process should gracefully exit')
  })

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
