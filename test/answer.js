const assert = require('assert')

console.log('TEST node', __filename)

process.on('exit', code => { console.log('CODE', code) })

let Answer = null

try {
  Answer = require('..')
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
  function handler (request, response) {},
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
    // don't test for answer.pattern, it's a kind of internal usage property
    const fnIface = [
      'accepts', // determine whenever answer accepts request
      // TODO 'handles', // determine whenever answer should handle request
      'matches', // whenever answer accepts request.url
      'isAllowable', // whenever answer handles request.method
      'isAcceptable', // whenever answer returns headers.accept content-type
      'handler', 'handle' // return a bound handle or handle request
    ]
    fnIface.forEach(method => {
      assert.strictEqual(typeof answer[method], 'function',
        `missing #${method}() function property`
      )
    })
  } catch (err) {
    console.error(err.stack)
    console.log('FAIL Answer interface is not meet for', value)
    process.exit(1)
  }
  console.log('PASS Answer interface seems ok for', value)
})

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
