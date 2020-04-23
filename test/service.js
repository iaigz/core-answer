
const assert = require('assert')

console.log('TEST node', require.resolve('../'))

const ServiceServer = require('../ServiceServer')
const ServiceClient = require('../ServiceClient')
const WebSocket = require('ws')

assert.strictEqual(typeof ServiceServer, 'function', 'Server should export a function')
assert.strictEqual(typeof ServiceClient, 'function', 'Client should export a function')

let server = null
let client = null

try {
  server = new ServiceServer()
} catch (error) {
  console.log('FAIL should be able to instantiate without arguments')
  throw error
}

const { EventEmitter } = require('events')
assert.ok(server instanceof EventEmitter, 'server should extend EventEmitter')
assert.ok(Object.isPrototypeOf.call(EventEmitter, server), 'server should inherit EventEmitter')
console.log('PASS server inheritance chain seems ok')

assert.strictEqual(typeof server.listen, 'function', 'server should implement #listen()')
assert.strictEqual(typeof server.close, 'function', 'server should implement #close()')
assert.strictEqual(typeof server.url, 'function', 'server should implement #url()')
assert.strictEqual(typeof server.send, 'function', 'server should implement #send()')

assert.strictEqual(server.listening, false, 'server should not be listening')
assert.throws(() => server.url(), /listening/, 'server#url() should throw when not listening')

console.log('PASS server interface implementation seems ok')

process.stdin.resume()
console.log('INFO asynchronous tests begin (stdin resumed)')

new Promise((resolve, reject) => {
  server
    .on('listening', address => {
      assert.strictEqual(server.listening, true, 'server should be listening')
      assert.ok(address, 'address should be something')
      assert.ok(address.address, 'address should contain .address')
      assert.ok(address.port, 'address should contain .port')
      const url = server.url()
      assert.ok(url, 'server.url() should return something')
      console.log('PASS server emits "listening" when it is listening')
      resolve(url)
    })
    .listen()
})
  .then(url => {
    client = new ServiceClient(url)
    assert.strictEqual(typeof client.connect, 'function', 'client should implement #connect()')
    assert.strictEqual(typeof client.disconnect, 'function', 'client should implement #disconnect()')
    assert.strictEqual(typeof client.send, 'function', 'client should implement #send()')
    assert.strictEqual(client.connected, false, 'client should not be connected')
    console.log('PASS client implementation seems ok')

    return new Promise((resolve, reject) => {
      const promise = client.connect()
      assert.ok(promise instanceof Promise, 'client#connect() should return a promise')
      promise.then(resolve).catch(reject)
    })
  })
// client => server communication (string)
  .then(() => new Promise((resolve, reject) => {
    server.once('ws:message', (msg, ws) => {
      assert.strictEqual(msg, 'foo', 'should receive foo')
      assert(ws instanceof WebSocket, 'should receive instanceof WebSocket')
      console.log('PASS client can communicate strings to server')
      resolve(ws)
    })
    client.send('foo')
  }))
// server => client communication (string)
  .then((ws) => new Promise((resolve, reject) => {
    client.once('ws:message', (msg) => {
      assert.strictEqual(msg, 'bar', 'should receive bar')
      console.log('PASS server can communicate strings to client')
      resolve()
    })
    server.send('bar', ws)
  }))
// client => server communication (object)
  .then(() => new Promise((resolve, reject) => {
    server.once('ws:message', (msg, ws) => {
      assert.strictEqual(typeof msg, 'object', 'should receive object')
      assert.deepStrictEqual(msg, { foo: 'bar', baz: [1, 2, 3] }, 'object should be as sent')
      assert(ws instanceof WebSocket, 'should receive instanceof WebSocket')
      console.log('PASS client can communicate objects to server')
      resolve(ws)
    })
    client.send({ foo: 'bar', baz: [1, 2, 3] })
  }))
// server => client communication (object)
  .then((ws) => new Promise((resolve, reject) => {
    client.once('ws:message', (msg) => {
      assert.strictEqual(typeof msg, 'object', 'should receive object')
      assert.deepStrictEqual(msg, { foo: 'bar', baz: [1, 2, 3] }, 'object should be as sent')
      console.log('PASS server can communicate objects to client')
      resolve()
    })
    server.send({ foo: 'bar', baz: [1, 2, 3] }, ws)
  }))
// client => server communication (event)
  .then(() => new Promise((resolve, reject) => {
    server.once('something:custom', (data, ws) => {
      assert.strictEqual(typeof data, 'object', 'should receive object')
      assert.deepStrictEqual(data.baz, [1, 2, 3], 'data should be as sent')
      assert(ws instanceof WebSocket, 'should receive instanceof WebSocket')
      console.log('PASS client can communicate events to server')
      resolve(ws)
    })
    client.send({ event: 'something:custom', baz: [1, 2, 3] })
  }))
// server => client communication (event)
  .then((ws) => new Promise((resolve, reject) => {
    client.once('other:custom:event', (data) => {
      assert.strictEqual(typeof data, 'object', 'should receive object')
      assert.deepStrictEqual(data.foo, [true, false, null], 'data should be as sent')
      console.log('PASS server can communicate events to client')
      resolve()
    })
    server.send({ event: 'other:custom:event', foo: [true, false, null] }, ws)
  }))
  .then(() => client.disconnect())
  .then(() => server.close())
  .catch(error => {
    console.error(error.stack)
    if (error.code === 'ERR_ASSERTION') {
      console.log('FAIL', `${error.actual} should be ${error.operator} ${error.expected}`)
    }
    console.log('FAIL', error.message)
  })
  .finally(() => {
    process.stdin.pause()
    console.log(`INFO ${require.resolve('../')} test end (stdin paused)`)
    console.log('INFO If everything went ok, node process should gracefully exit')
  })
/*
test('server', function( t ){
  var service = Object.create( server );
  service.on('request', function( req, res ){
    t.ok( req, 'expect an incoming message' );
    t.ok( res, 'expect an outgoing response stream' );
    res.on('finish', function(){
      t.pass( 'outgoing response finished' );
      service.close(function( err ){
        t.error( err, 'service should close without errors' );
        t.end();
      });
    }).end() // trigger response end
    this.close( t.end.bind(t) );
  }).on('listening', function(){
    t.pass( 'service is listening as expected' );
    console.log( this.address() );
    //t.fail( 'request should be mocked-up here' );
    // once listening, mock-up a fake request
  }).listen();
});

/* vim: set expandtab: */
/* vim: set filetype=javascript ts=2 shiftwidth=2: */
