let assert = require('assert');
let {Pipe} = require('../index');
let p = console.log.bind(console);

// function testAsync(inSeq, outSeq, transform, init) {
//
//   let done = init(next);
//
//   option = Object.assign({nDisconnectCalled: 1}, option);
//   let nDisconnectCalled = 0;
//   let ix = 0;
//   let src = new Pipe(function (next) {
//
//     let run = () => process.nextTick(function () {
//       if (ix < inSeq.length){
//         next(inSeq[ix++]);
//         run();
//       }
//       else finish();
//     });
//     run();
//
//     return function () {
//       nDisconnectCalled += 1;
//     }
//   });
//   let pipe = transform(src);
//
//   let all = [];
//   let disconnect = pipe.connect(v => all.push(v));
//
//   let finish = function () {
//     assert.deepEqual(all, outSeq);
//
//     disconnect();
//     assert.equal(nDisconnectCalled, option.nDisconnectCalled);
//
//     done();
//   }
// }

function testOneByOne(inSeq, outSeq, transform, callback) {

}

function test(inSeq, outSeq, transform, option) {
  option = Object.assign({nDisconnectCalled: 1}, option);
  let nDisconnectCalled = 0;
  let src = new Pipe(function (next) {
    for (let x of inSeq) next(x);
    return function () {
      nDisconnectCalled += 1;
    }
  });
  let pipe = transform(src);

  let all = [];
  let disconnect = pipe.connect(v => all.push(v));

  assert.deepEqual(all, outSeq);

  disconnect();
  assert.equal(nDisconnectCalled, option.nDisconnectCalled);
}

describe('Pipe', function () {

  describe('class methods', function () {

    describe('range', function () {

      it('test 1', function () {
        let pipe = Pipe.range(0, 10);
        let n = 0;
        pipe.connect(v => {
          assert(v === n++);
        })();
        assert(n === 10);
      })

    });

    describe('create', function () {
      it.skip('', function () {

      })
    });

    describe('createScoped', function () {
      it.skip('', function () {

      })
    });

    describe('empty', function () {
      it.skip('', function () {

      })
    });

    describe('of', function () {
      it.skip('', function () {

      })
    });

    describe('from', function () {
      it.skip('', function () {

      })
    });

    describe('fromPromise', function () {
      it.skip('', function () {

      })
    });

    describe('interval', function () {
      it.skip('', function () {

      })
    });

    describe('merge', function () {
      it.skip('', function () {

      })
    });

    describe('combine', function () {
      it.skip('', function () {

      })
    });

    describe('zip', function () {
      it.skip('', function () {

      })
    });


  });

  describe('instance methods', function () {

    describe('do', function () {

      it('side effect', function () {
        let n = 1;
        test([1, 2, 3, 4, 5], [1, 2, 3, 4, 5], function (pipe) {
          return pipe.do(v => assert(v === n++))
        });
        assert(n === 6);
      })

    });


    describe('constant', function () {

      it('constant 0', function () {
        test([1, 2, 3, 4, 5], [0, 0, 0, 0, 0], function (pipe) {
          return pipe.constant(0);
        })
      })
    });

    describe('repeat', function () {

      it('2 times', function () {
        test([1, 2, 3], [1, 1, 2, 2, 3, 3], pipe => pipe.repeat(2))
      })

    });

    describe('take', function () {

      it('take 3 out of 5', function () {
        test([1, 2, 3, 4, 5], [1, 2, 3], pipe => pipe.take(3))
      })

    });

    describe('drop', function () {
      it('drop 3 out of 5', function () {
        test([1, 2, 3, 4, 5], [4, 5], pipe => pipe.drop(3))
      })
    });

    describe('delay', function(){

      it('delay 1', function(){
        test([1,2,3,4,5], [1,2,3,4], pipe => pipe.delay())
      });

      it('delay 2', function(){
        test([1,2,3,4,5], [1,2,3], pipe => pipe.delay(2))
      });

      it('delay 3', function(){
        test([1,2,3,4,5], [1,2], pipe => pipe.delay(3))
      })
    });

    describe('filter', function () {
      it('odd', function () {
        test([1, 2, 3, 4, 5], [1, 3, 5], pipe => pipe.filter(x => x % 2 === 1))
      })
    });

    describe('map', function () {

      it('[1,2,3] -> [2,4,6]', function () {
        test([1, 2, 3], [2, 4, 6], function (pipe) {
          return pipe.map(x => 2 * x);
        });
      })
    });

    describe('merge', function () {

      it('merge [1,2,3] with itself', function () {
        test([1, 2, 3], [1, 2, 3, 1, 2, 3], function (pipe) {
          return pipe.merge(pipe);
        }, {nDisconnectCalled: 2})
      });

      it('merge [1,2,3] with [4,5,6]', function () {
        test([1, 2, 3], [1, 2, 3, 4, 5, 6], function (pipe) {
          return pipe.merge(Pipe.from([4, 5, 6]))
        })
      })
    });

    describe('combine', function () {

      it('combine [1,2,3] and [4,5,6] with a+b', function () {

        test([1, 2, 3], [7, 8, 9], function (pipe) {
          return pipe.combine(Pipe.from([4, 5, 6]), (a, b) => a + b);
        })

      })

    });

    describe('zip', function () {

      it('combine [1,2,3] and [4,5,6] with a+b', function () {
        test([1, 2, 3], [7], function (pipe) {
          return pipe.zip(Pipe.from([4, 5, 6]), (a, b) => a + b);
        });
      })

    });

    describe('prepend', function () {

      it('append [1,2,3] with [4,5,6]', function () {
        test([1, 2, 3], [4, 5, 6, 1, 2, 3], function (pipe) {
          return pipe.prepend(4, 5, 6);
        })
      })

    });

    describe('scan', function () {

      it('sum over [1,2,3] with init = 10', function () {
        test([1, 2, 3], [10, 11, 13, 16], function (pipe) {
          return pipe.scan((acc, x) => acc + x, 10)
        });
      })

    });

    describe('distinct', function () {

      it('[1,1,2,1,2,2] -> []', function () {
        test([1, 1, 2, 1, 2, 2], [1, 2, 1, 2], pipe => pipe.distinct());
      })

    });
    describe('debounce', function () {
      it.skip('', function () {

      })
    });

    describe('throttle', function () {
      it.skip('', function () {

      })
    });

    describe('switch', function () {

      it.skip('', function () {

      })

    });

    describe('switchMap', function () {

      it.skip('', function () {

      })

    });
    describe('switchObject', function () {

      it.skip('', function () {

      })

    });
    describe('flatten', function () {

      it.skip('', function () {

      })

    });
    describe('pluck', function () {

      it.skip('', function () {

      })

    });
    describe('plucks', function () {

      it.skip('', function () {

      })

    });
    describe('block', function () {

      it.skip('', function () {

      })

    });
    describe('blockBufferAll', function () {

      it.skip('', function () {

      })

    });
    describe('blockBufferLast', function () {

      it.skip('', function () {

      })

    });

  });


});