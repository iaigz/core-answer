const assert = require('assert')
const tester = require('./0')

const Answer = require('..')
const ApiAnswer = require('../ApiAnswer')

const answerOk = (req, res) => {
  res.statusCode = 200
  res.end('OK')
}
const answerOkJSON = (req, res) => {
  res.statusCode = 200
  res.end(JSON.stringify('OK'))
}

// tipical Accept header sent by firefox
const FIREFOX = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'

function returnsTest (answer, expect = {}, types = []) {
  const { accept, status, mimetype } = expect
  const accText = accept ? 'accept' : 'not accept'
  const requests = types.map(type => {
    // falsy type value means "dont include an accept header"
    return type ? ['/', { headers: { accept: type } }] : ['/']
  })
  return tester.multiplex(
    answer.handler,
    (req, res) => {
      try {
        assert.strictEqual(answer.accepts(req), accept)
      } catch (err) {
        console.error(answer)
        console.error({
          pattern: answer.pattern,
          returns: answer.returns,
          acceptable: answer.isAcceptable(req),
          allowable: answer.isAllowable(req)
        })
        console.error(req.headers)
        console.log('FAIL %s should %s request', answer, accText)
        throw err
      }
      console.log('PASS %s %s %s', answer, accText, `${req.method} ${req.url}`)
    },
    requests,
    (response, data, request) => {
      try {
        assert.strictEqual(response.statusCode, status)
        console.log('PASS %s uses status code', answer, status)
      } catch (err) {
        console.error(answer)
        console.error('answer data', {
          pattern: answer.pattern,
          returns: answer.returns
        })
        console.error('response headers', response.headers)
        console.error('request headers', request.getHeaders())
        console.log('FAIL %s should use status code', answer, status)
        throw err
      }
      if (mimetype) {
        assert.strictEqual(response.headers['content-type'], mimetype)
        console.log('PASS %s uses content-type', answer, mimetype)
        switch (mimetype) {
          case 'application/json':
            try {
              JSON.parse(data)
              console.log('PASS %s answers valid json data', answer)
            } catch (err) {
              console.error('-- data below --')
              console.error(data)
              console.error('-- data above --')
              console.log('FAIL %s answers invalid json data', answer)
              throw err
            }
            break
          default:
            console.log('SKIP response data for mimetype "%s"', mimetype)
            break
        }
      } else {
        console.log('SKIP mimetype tests')
      }
    }
  )
}

const test = tester
  .initialize(__filename)
  //
  // POSITIVE ACCEPT CASES
  //
  // the common, normal, usecase
  .then(returnsTest(
    new Answer({ returns: 'text/plain', handler: answerOk }),
    { accept: true, status: 200, mimetype: 'text/plain' },
    ['text/plain']
  ))
  .then(returnsTest(
    new ApiAnswer({ returns: 'text/plain', GET: answerOk }),
    { accept: true, status: 200, mimetype: 'text/plain' },
    ['text/plain']
  ))
  // both simple and complex Accept header values, as sent by firefox
  .then(returnsTest(
    new ApiAnswer({ returns: 'text/html', GET: answerOk }),
    { accept: true, status: 200, mimetype: 'text/html' },
    ['text/html', FIREFOX]
  ))
  // same with application/json
  .then(returnsTest(
    new Answer({ returns: 'application/json', handler: answerOkJSON }),
    { accept: true, status: 200, mimetype: 'application/json' },
    ['application/json']
  ))
  .then(returnsTest(
    new ApiAnswer({ returns: 'application/json', GET: answerOkJSON }),
    { accept: true, status: 200, mimetype: 'application/json' },
    ['application/json']
  ))
  // it should still work without using the feature at all
  // even for requests with no accept header
  .then(returnsTest(
    new Answer({ handler: answerOk }),
    { accept: true, status: 200 },
    [null, 'text/plain', 'text/html', 'application/json', FIREFOX]
  ))
  .then(returnsTest(
    new ApiAnswer({ GET: answerOk }),
    { accept: true, status: 200 },
    [null, 'text/plain', 'text/html', 'application/json', FIREFOX]
  ))
  // It is possible to create an Answer without providing a handler
  // when content-type is acceptable it should use not-implemented
  .then(returnsTest(
    new Answer({ returns: 'application/json' }),
    { accept: true, status: 501, mimetype: 'application/json' },
    ['application/json']
  ))
  // ApiAnswer wouldn't accept this, treating as method-not allowed
  //
  // NEGATIVE ACCEPT CASES
  //
  // 406 not acceptable should be used when:
  // - not supporting Accept header mimetype
  // - Accept header is not specified
  .then(returnsTest(
    new Answer({ returns: 'application/json', handler: answerOk }),
    { accept: false, status: 406, mimetype: 'application/json' },
    [null, 'text/plain', 'text/html']
  ))
  .then(returnsTest(
    new ApiAnswer({ returns: 'application/json', GET: answerOk }),
    { accept: false, status: 406, mimetype: 'application/json' },
    [null, 'text/plain', 'text/html']
  ))
  //
  // NEGATIVE ACCEPT CASES (NO HANDLER)
  //
  // Answer should treat this as "not acceptable"
  .then(returnsTest(
    new Answer({ returns: 'application/json' }),
    { accept: false, status: 406, mimetype: 'application/json' },
    [null, 'text/plain', 'text/html']
  ))
  // Api answers should treat as "method not allowed"
  .then(returnsTest(
    new ApiAnswer({ returns: 'application/json' }),
    { accept: false, status: 405, mimetype: 'application/json' },
    [null, 'application/json', 'text/plain', 'text/html']
  ))

test
  .catch(tester.catcher)
  .finally(tester.teardown)

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
