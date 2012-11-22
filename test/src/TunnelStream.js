var expect = require('chai').expect,
    TunnelStream = require('../../'),
    Checklist = require('checklist');
    
describe('TunnelStream', function() {
  it('should be readable and writable at both ends', function() {
    var tunnel = new TunnelStream();
    expect(tunnel.upstream.readable).to.equal(true);
    expect(tunnel.downstream.readable).to.equal(true);
    expect(tunnel.upstream.writable).to.equal(true);
    expect(tunnel.downstream.writable).to.equal(true);
  });

  it('should cause the other end of the TunnelStream to emit data and end events on calls to write and end', function(done) {
    var tunnel = new TunnelStream();
    var checklist = new Checklist(['hello, downstream', 'hello, upstream', 'goodbye, downstream', 'end upstream', 'end downstream'], done);
    tunnel.downstream.once('data', function(data) {
      expect(typeof data).to.not.equal('string');
      checklist.check(data.toString());
      tunnel.downstream.on('data', function(data) {
        checklist.check(data.toString());
      });
      tunnel.downstream.write('hello, upstream');
    });
    tunnel.downstream.on('end', function(data) {
      checklist.check('end downstream');
    });
    tunnel.upstream.once('data', function(data) {
      expect(typeof data).to.not.equal('string');
      checklist.check(data.toString());
      tunnel.upstream.end('goodbye, downstream');
    });
    tunnel.upstream.on('end', function(data) {
      checklist.check('end upstream');
    });
    tunnel.upstream.write('hello, downstream');
  });
  
  it('should support the setEncoding method', function(done) {
    var tunnel = new TunnelStream();
    var checklist = new Checklist(['hello, downstream', 'hello, upstream', 'goodbye, downstream', 'end upstream', 'end downstream'], done);
    tunnel.downstream.setEncoding('utf8');
    tunnel.upstream.setEncoding('utf8');
    tunnel.downstream.once('data', function(data) {
      checklist.check(data);
      tunnel.downstream.on('data', function(data) {
        checklist.check(data);
      });
      tunnel.downstream.write('hello, upstream');
    });
    tunnel.downstream.on('end', function(data) {
      checklist.check('end downstream');
    });
    tunnel.upstream.once('data', function(data) {
      checklist.check(data);
      tunnel.upstream.end('goodbye, downstream');
    });
    tunnel.upstream.on('end', function(data) {
      checklist.check('end upstream');
    });
    tunnel.upstream.write('hello, downstream');
  });

  it('should support pause and resume but emit a paused data event when data arrives', function(done) {
    var tunnel = new TunnelStream();
    var checklist = new Checklist([
      'pausedData',
      'hello, downstream',
      'pausedData',
      'hello, upstream',
      'resume',
      'data',
      'hello, upstream',
      'data',
      'hello, downstream'
    ], {
      ordered: true
    }, done);
    tunnel.downstream.setEncoding('utf8');
    tunnel.upstream.setEncoding('utf8');
    tunnel.downstream.pause();
    tunnel.upstream.pause();
    tunnel.downstream.on('pausedData', function(data) {
      checklist.check('pausedData');
      checklist.check(data);
    });
    tunnel.upstream.on('pausedData', function(data) {
      checklist.check('pausedData');
      checklist.check(data);
    });
    tunnel.upstream.write('hello, downstream');
    tunnel.downstream.write('hello, upstream');
    tunnel.downstream.on('data', function(data) {
      checklist.check('data');
      checklist.check(data);
    });
    tunnel.upstream.on('data', function(data) {
      checklist.check('data');
      checklist.check(data);
    });
    setTimeout(function() {
      checklist.check('resume');
      tunnel.upstream.resume();
      tunnel.downstream.resume();
    }, 0);
  });

  describe('#pause', function() {
    it('should buffer multiple events separately', function(done) {
      var tunnel = new TunnelStream();
      var checklist = new Checklist([
        'first data',
        'second data',
        'end'
      ], {
        ordered: true
      }, done);
      tunnel.downstream.setEncoding('utf8');
      tunnel.upstream.setEncoding('utf8');
      tunnel.downstream.on('data', function(data) {
        checklist.check(data);
      });
      tunnel.downstream.on('end', function(data) {
        checklist.check('end');
      });
      tunnel.downstream.pause();
      tunnel.upstream.write('first data');
      tunnel.upstream.end('second data');
      tunnel.downstream.resume();
    });
  });
  
  describe('#discardBufferedEvents', function() {
    it('should discard events buffered up to now while paused', function(done) {
      var tunnel = new TunnelStream();
      var checklist = new Checklist([
        'pausedData',
        'to be discarded',
        'data',
        'after discarded'
      ], {
        ordered: true
      }, done);
      tunnel.downstream.setEncoding('utf8');
      tunnel.upstream.setEncoding('utf8');
      tunnel.downstream.on('data', function(data) {
        checklist.check('data');
        checklist.check(data);
      });
      tunnel.downstream.on('pausedData', function(data) {
        checklist.check('pausedData');
        checklist.check(data);
        tunnel.downstream.discardBufferedEvents();
        tunnel.downstream.resume();
      });
      tunnel.downstream.pause();
      tunnel.upstream.write('to be discarded');
      tunnel.upstream.write('after discarded');
    });
  });
  
  it('should emit end events on both streams on end from one side', function(done) {
    var tunnel = new TunnelStream();
    var checklist = new Checklist(['end upstream', 'end downstream', 'This is a test'], done);
    tunnel.downstream.setEncoding('utf8');
    tunnel.upstream.setEncoding('utf8');
    tunnel.upstream.on('end', function() {
      checklist.check('end upstream');
    });
    tunnel.downstream.on('data', function(data) {
      checklist.check('This is a test');
    });
    tunnel.downstream.on('end', function() {
      checklist.check('end downstream');
    });
    tunnel.upstream.end('This is a test');
  });

  it('should optionally rewrite data events into specified message sizes', function(done) {
    var checklist = new Checklist([
      'This ',
      'is a ',
      'testT',
      'his i',
      's als',
      'o a t',
      'estok',
      ' that',
      ' is a',
      'll',
      'end downstream'
    ], done);
    var tunnel = new TunnelStream({
      messageSize: 5
    });
    tunnel.downstream.setEncoding('utf8');
    tunnel.downstream.on('data', function(data) {
      checklist.check(data);
    });
    tunnel.downstream.on('end', function() {
      checklist.check('end downstream');
    });
    tunnel.upstream.write('This is a test');
    tunnel.upstream.write('This is also a test');
    tunnel.upstream.end('ok that is all');
  });
});