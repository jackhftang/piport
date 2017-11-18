let {Pipe, Port} = require('../index');
let assert = require('assert');

describe('Pipe', function () {

  it('connect and next', function(){

    let port = new Port();
    let out = [];
    port.connect(function(v){
      out.push(v);
    });
    port.next(1).next(2).next(3);
    assert.deepEqual(out, [1,2,3]);

  });

  it('connectToUpstream', function(){

    let port = new Port(null, Pipe.from([1,2,3]));
    let out = [];
    port.connect(function(v){
      out.push(v);
    });
    assert.deepEqual(out, []);
    port.connectToUpstream();
    assert.deepEqual(out, [1,2,3]);

  })


});