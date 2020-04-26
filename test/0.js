const http = require('http')

const server = http.createServer()
const SRV_PORT = 3456
const SRV_HOST = 'localhost'

let timeout = null

exports.initialize = (filename) => new Promise((resolve, reject) => {
  console.log('TEST node', filename)
  process.on('exit', code => { console.log('CODE', code) })

  process.stdin.resume()
  console.log(`INFO ${filename} asynchronous tests begin (stdin resumed)`)

  server
    .on('error', reject)
    .on('listening', () => {
      console.log('INFO test server is listening at port', SRV_PORT)
      resolve(server)
      timeout = setTimeout(() => {
        console.log('FAIL timed out after 10 seconds')
        process.exit(124)
      }, 10000)
    })
    .on('close', () => {
      clearTimeout(timeout)
      console.log(`INFO ${filename} test server has closed`)
    })
    .listen(SRV_PORT)
})

exports.catcher = (error) => {
  if (error.code === 'ERR_ASSERTION') {
    console.error(error.stack)
    console.log('FAIL',
      `${error.actual} should be ${error.operator} to ${error.expected}`
    )
  } else {
    console.error(error)
    console.log('FAIL', error.message)
  }
  process.exitCode = 1
}

exports.teardown = () => {
  process.stdin.pause()
  console.log(`INFO ${__filename} teardown (stdin paused)`)

  console.log('INFO closing test server')
  server.close()

  console.log('INFO If everything went ok, node process should gracefully exit')
  // calling process.exit() is a bad practice
}

exports.listener = (listen, ...request) => new Promise((resolve, reject) => {
  const _listen = (req, res) => {
    try {
      listen(req, res)
    } catch (error) {
      reject(error)
      res.end() // end the response or we will hang node process
    }
  }
  server.on('request', _listen)
  exports
    .request(...request)
    .catch(reject)
    .finally(() => { server.removeListener('request', _listen) })
    .then(resolve)
  return server
})

exports.sequence = (iterable, fn) => new Promise((resolve, reject) => {
  iterable = iterable.slice(0)
})

exports.request = (url = '', opts = {}) => new Promise((resolve, reject) => {
  if (typeof url !== 'string') {
    opts = url
    url = ''
  }
  console.log('INFO request %j %s', opts, `http://${SRV_HOST}${url}`)
  http.request(`http://${SRV_HOST}${url}`, {
    port: SRV_PORT,
    ...opts
  })
    .on('error', reject)
    .on('response', response => {
      let data = ''
      response
        .on('data', (chunk) => { data += chunk })
        .on('end', () => resolve({ response: response, data: data }))
    })
    .end() // actually, end() request is "send request"
})

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
