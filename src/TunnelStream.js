var Stream = require('stream'),
    util = require('util');

function Tunnel(options) {
  options = options || {};

  function EndPoint(otherEnd) {
    var self = this,
        paused = false,
        events = [],
        encoding,
        messageBuffer = new Buffer(0);

    if (otherEnd) {
      otherEnd.pair(self);
    }

    self.writable = true;
    self.readable = true;

    self.pair = function(endPoint) {
      otherEnd = endPoint;
    };

    self.pause = function() {
      paused = true;
    };

    self.emitEvent = function(name, data) {
      self.emit(name, data ? (self.encoding ? data.toString(self.encoding) : data) : data);        
    };

    self.resume = function(discardEvents) {
      paused = false;
      while (events.length > 0) {
        var event = events.shift();
        self.emitEvent(event.name, event.data);        
      }
    };
    
    self.discardBufferedEvents = function() {
      events = [];
    };

    self.emitOrBuffer = function(name, data) {
      if (paused) {
        events.push({
          name: name,
          data: data
        });
        if (name === 'data') {
          self.emitEvent('pausedData', data);
        }
      } else {
        self.emitEvent(name, data);
      }      
    };

    self.write = function(data, encoding) {
      if (typeof data === 'string') {
        data = new Buffer(data, encoding);
      }
      if (options.messageSize) {
        messageBuffer = Buffer.concat([messageBuffer, data], messageBuffer.length + data.length);
        while (messageBuffer.length >= options.messageSize) {
          otherEnd.emitOrBuffer('data', messageBuffer.slice(0, 5));
          messageBuffer = messageBuffer.slice(5);
        }
      } else {
        otherEnd.emitOrBuffer('data', data);  
      }
    };

    self.end = function(data, encoding) {
      if (data) {
        self.write(data, encoding);
      }
      self.flush();
      otherEnd.emitOrBuffer('end');
      self.emitOrBuffer('end');
    };
    
    self.setEncoding = function(encoding) {
      self.encoding = encoding || 'utf8';
    };

    self.flush = function() {
      if (messageBuffer.length) {
        otherEnd.emitOrBuffer('data', messageBuffer);
        messageBuffer = new Buffer(0);
      }
    };
  }
  util.inherits(EndPoint, Stream);
  
  this.upstream = new EndPoint();
  this.downstream = new EndPoint(this.upstream);
}

module.exports = Tunnel;