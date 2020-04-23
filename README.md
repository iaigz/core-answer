
core-answer
===========

Answer Examples
---------------

### creating an answer for not-found resources

```js
const Answer = require('@iaigz/core-answer')

let answer = new Answer({
  handler: function (request, response) {
    response.writeHead(404, {
      'Connection': 'close',
      'Content-Type': 'text/plain'
    })
    response.end(`resource '${request.url}' not found`)
  }
})
```

### creating an answer for an specific url

```js
const Answer = require('@iaigz/core-answer')

let answer = new Answer({
  pattern: '/hello-world'
  handler: function (request, response) {
    response.writeHead(200, {
      'Connection': 'close',
      'Content-Type': 'text/plain'
    })
    response.end('Hello world')
  }
})
```
### creating an answer to handle multiple urls

```js
const Answer = require('@iaigz/core-answer')

let answer = new Answer({
  pattern: new Regexp('^/echo/.+'),
  handler: function (request, response) {
    response.writeHead(200, {
      'Connection': 'close',
      'Content-Type': 'text/plain'
    })
    response.end(request.url.slice('/echo/'.length))
  }
})
```
