tunnel-stream
=========

A test tunnel stream to simulate intermediate streams with different characteristics

## Features

- should be readable and writable at both ends
- should cause the other end of the TunnelStream to emit data and end events on calls to write and end
- should support pause and resume but emit a paused data event when data arrives
- #pause
  - should buffer multiple events separately
- #discardBufferedEvents
  - should discard events buffered up to now while paused
- should support the setEncoding method
- should emit end events on both streams on end from one side
- should optionally rewrite data events into specified message sizes

## Installation

```
npm install tunnel-stream
```

## API

A simple use case

```javascript
var TunnelStream = require('tunnel-stream');

var tunnel = new TunnelStream();

tunnel.downstream.setEncoding('utf8');
tunnel.upstream.setEncoding('utf8');

tunnel.downstream.on('data', function(data) {
  tunnel.downstream.write('hello, upstream');
});

tunnel.downstream.on('end', function(data) {
  // ended
});

tunnel.upstream.on('data', function(data) {
  tunnel.upstream.end('goodbye, downstream');
});

tunnel.upstream.on('end', function(data) {
  // ended
});

tunnel.upstream.write('hello, downstream');
```

To use pause and resume

```
var tunnel = new TunnelStream();

tunnel.downstream.setEncoding('utf8');

tunnel.downstream.on('data', function(data) {
  // should only receive the 'after discarded' message here
});

tunnel.downstream.on('pausedData', function(data) {
  // should receive the 'to be discarded' message here

  tunnel.downstream.discardBufferedEvents();
  tunnel.downstream.resume();
});

tunnel.downstream.pause();

tunnel.upstream.write('to be discarded');
tunnel.upstream.write('after discarded');
```

To set the message size

```
var tunnel = new TunnelStream({
  messageSize: 5
});

tunnel.downstream.setEncoding('utf8');
tunnel.downstream.on('data', function(data) {
  /* 
    should receieve the following messages

      'This '
      'is a '
      'testT'
      'his i'
      's als'
      'o a t'
      'estok'
      ' that'
      ' is a'
      'll'
  */
});
tunnel.downstream.on('end', function() {
  // finished
});

tunnel.upstream.write('This is a test');
tunnel.upstream.write('This is also a test');
tunnel.upstream.end('ok that is all'); // must end the connection to flush the last few bytes
```

## Roadmap

- Nothing yet

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using ``./grunt.sh`` or ``.\grunt.bat``.

## License
Copyright (c) 2012 Peter Halliday  
Licensed under the MIT license.