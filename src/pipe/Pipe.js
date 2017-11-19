const Buffer = require('../struct/Buffer');

/** Class representing a pipe */
class Pipe {

  /**
   *
   * @constructor
   * @param {!Function} connect
   */
  constructor(connect) {
    if (typeof connect !== 'function') {
      throw new Error('A connect function is required');
    }
    this._connect = connect;
  }

  /**
   * Recursively call to the nearest port and register
   * @param {function} next
   * @returns {function} disconnect
   */
  connect(next) {
    let disconnect = this._connect(next);
    if (typeof disconnect !== 'function') {
      throw new Error('A disconnect function is not returned ' + this._connect.toString());
    }
    return disconnect;
  }

}


/**
 *
 * @param {Function} producer
 * @returns {Pipe}
 */
Pipe.create = function (producer) {
  return new this(producer);
};

// Pipe.createScoped = function (func) {
//   return new this(func());
// };

/**
 *
 * @returns {Pipe}
 */
Pipe.empty = function () {
  return new this(function () {
    return function () {
    };
  });
};

/**
 *
 * @param args
 * @returns {Pipe}
 */
Pipe.of = function (...args) {
  return new this(function (next) {
    for (let arg of args) next(arg);
    return function () {
      args = null;
    }
  });
};

Pipe.from = function (iterable) {
  return new this(function (next) {
    for (let x of iterable) next(x);
    return function () {
      // release reference to variable
      iterable = null;
    }
  })
};

Pipe.range = function (start, end, step = 1) {
  return new this(function (next) {
    for (let i = start; i < end; i += step) next(i);
    return function () {
    };
  });
};

// whenever one update emit that one
Pipe.merge = function (...pipes) {
  return new this(function (next) {
    let disconnects = [];
    for (let pipe of pipes) {
      disconnects.push(pipe.connect(v => next(v)));
    }
    return function () {
      while (disconnects.length) disconnects.pop()();
    }
  })
};

// after each pipe has emitted once, emit all whenever one update
Pipe.combine = function (...pipes) {
  let combine = (...args) => args;
  if (typeof pipes[pipes.length - 1] === 'function') combine = pipes.pop();
  return new this(function (next) {
    let n = pipes.length;
    let updated = [];
    let updatedCount = n;
    let last = new Array(n);
    let disconnects = [];
    for (let i = 0; i < n; i++) {
      let pipe = pipes[i];
      updated.push(false);
      disconnects.push(pipe.connect(v => {
        last[i] = v;
        if (!updated[i]) {
          updated[i] = true;
          updatedCount -= 1;
        }
        if (updatedCount === 0) {
          next(combine(...last));
        }
      }));
    }
    return function () {
      while (disconnects.length) disconnects.pop()();
    }
  })
};


/**
 * When all updated emit all
 *
 * @param pipes
 * @returns {Pipe}
 */
Pipe.zip = function (...pipes) {
  let zip = (...args) => args;
  if (typeof pipes[pipes.length - 1] === 'function') zip = pipes.pop();
  return new this(function (next) {
    let n = pipes.length;
    let updatedCount = n;
    let updated = new Array(n);
    let last = new Array(n);
    let disconnects = new Array(n);

    for (let i = 0; i < n; i++) {
      let pipe = pipes[i];
      updated[i] = false;
      disconnects[i] = pipe.connect(v => {
        last[i] = v;
        if (!updated[i]) {
          updated[i] = true;
          updatedCount -= 1;
          if (updatedCount === 0) {
            // clean up before calling next, because it may re-entrant
            for (let i = 0; i < n; i++) updated[i] = false;
            updatedCount = n;

            next(zip(...last));
          }
        }
      });
    }
    return function () {
      while (disconnects.length) disconnects.pop()();
    }
  })
};

///////////////////////////////////////////////////////////

Pipe.prototype.do = function (action) {
  return new this.constructor(next => this.connect(x => {
    action(x);
    next(x);
  }));
};

Pipe.prototype.constant = function (x) {
  return new this.constructor(next => this.connect(_ => next(x)));
};

Pipe.prototype.repeat = function (n) {
  return new this.constructor(next => this.connect(v => {
    for (let i = 0; i < n; i++) next(v);
  }))
};

Pipe.prototype.take = function (n) {
  return new this.constructor(next => this.connect(v => {
    if (n > 0) {
      n -= 1;
      next(v);
    }
  }));
};

Pipe.prototype.drop = function (n = 1) {
  return new this.constructor(next => this.connect(v => {
    if (n > 0) n -= 1;
    else next(v);
  }));
};

/**
 *
 * @param n
 * @returns {Pipe}
 */
Pipe.prototype.delay = function (n = 1) {
  let buffer = new Buffer(n);
  return new this.constructor(next => this.connect(v => {
    let isFull = buffer.isFull;
    let n = buffer.first;
    buffer.add(v);
    // always cleanup before call next for re-entrant
    if (isFull) next(n);
  }));
};

Pipe.prototype.filter = function (predicate) {
  return new this.constructor(next => this.connect(v => {
    if (predicate(v)) next(v);
  }));
};

Pipe.prototype.distinct = function (prev) {
  return this.filter(x => {
    let b = x !== prev;
    prev = x;
    return b;
  })
};

Pipe.prototype.takeWhile = function (predicate) {
  let pass = true;
  return new this.constructor(next => this.connect(v => {
    if (pass = pass && predicate(v)) next(v);
  }));
};

Pipe.prototype.dropWhile = function (predicate) {
  let pass = false;
  return new this.constructor(next => this.connect(v => {
    if (pass = pass || predicate(v)) next(v);
  }));
};

Pipe.prototype.map = function (func) {
  return new this.constructor(next => this.connect(v => next(func(v))));
};

Pipe.prototype.mapFlatten = function (func) {
  return this.map(func).flatten();
};

Pipe.prototype.mapSwitch = function (func) {
  return this.map(func).switch();
};

Pipe.prototype.merge = function (...args) {
  return this.constructor.merge(this, ...args);
};

Pipe.prototype.combine = function (...args) {
  return this.constructor.combine(this, ...args);
};

Pipe.prototype.combineObject = function (obj) {
  let keys = Object.keys(obj);
  let values = keys.map(k => obj[k]);
  return this.constructor
    .combine(...values)
    .map(values => {
      let res = {};
      for (let i = 0; i < keys.length; i++) {
        res[keys[i]] = values[i];
      }
      return res;
    })
};

Pipe.prototype.zip = function (...args) {
  return this.constructor.zip(this, ...args);
};

/**
 * From an object of pipes to a pipe of a objects
 * @param {Object} obj
 * @returns {Pipe}
 */
Pipe.prototype.zipObject = function (obj) {
  let keys = Object.keys(obj);
  let values = keys.map(k => obj[k]);
  return this.constructor
    .zip(...values)
    .map(values => {
      let res = {};
      for (let i = 0; i < keys.length; i++) {
        res[keys[i]] = values[i];
      }
      return res;
    })
};

Pipe.prototype.prependAll = function (iterable) {
  return new this.constructor(next => {
    for (let x of iterable) next(x);
    return this.connect(v => next(v));
  });
};

Pipe.prototype.prepend = function (...args) {
  return this.prependAll(args);
};

// emit initial value
Pipe.prototype.scan = function (reduce, acc) {
  return new this.constructor(next => {
    next(acc);
    return this.connect(v => {
      acc = reduce(acc, v);
      next(acc);
    })
  })
};

/**
 * Whenever receive an iterable, immediate send all them one by one.
 * @returns {Pipe}
 */
Pipe.prototype.flatten = function () {
  return new this.constructor(next => this.connect(iterable => {
    for (let x of iterable) next(x);
  }));
};

/**
 * Expect pipe from upstream. Whenever receive a new pipe, disconnect the last and then connect to the new onw.
 * @returns {Pipe}
 */
Pipe.prototype.switch = function () {
  return new this.constructor(next => {
    let last = null;

    function disconnectLast() {
      if (last) {
        last();
        last = null;
      }
    }

    let disconnect = this.connect(pipe => {
      disconnectLast();
      last = pipe.connect(v => next(v));
    });

    return function () {
      disconnectLast();
      if (disconnect) {
        disconnect();
        disconnect = null;
      }
    }
  })
};


/**
 * Expect a string from upstream.
 * mapSwitch obj[key], if key is not in obj, switch an empty pipe
 * @param obj
 */
Pipe.prototype.switchObject = function (obj) {
  return this.mapSwitch(key => {
    if (key in obj) return obj[key];
    return this.constructor.empty();
  })
};




/**
 *
 * @param {String} key
 * @returns {Pipe}
 */
Pipe.prototype.pluck = function (key) {
  return this.map(obj => obj[key]);
};

/**
 * Unlike pluck, plucks return an array of pipe
 * @param {...String} keys
 * @returns {Array}
 */
Pipe.prototype.plucks = function (...keys) {
  return keys.map(key => {
    this.connect(obj => obj[key]);
  })
};


Pipe.prototype.block = function (pipe, init) {
  return new this.constructor(next => {
    let close = !!init;

    // check the open first
    let sub1 = pipe.connect(b => close = !!b);

    // let values flow
    let sub2 = this.connect(v => {
      if (close) return;
      next(v)
    });

    return function () {
      if (sub1) {
        sub1();
        sub1 = null;
      }
      if (sub2) {
        sub2();
        sub2 = null;
      }
    }
  })
};

Pipe.prototype.blockBufferAll = function (pipe, init) {
  return new this.constructor(next => {
    let close = !!init;
    let buffer = [];

    let sub1 = pipe.connect(b => {
      b = !!b;
      if (close && !b) {
        // positive edge
        for (let x of buffer) next(x);
        buffer = [];
      }
      close = b;
    });

    let sub2 = this.connect(v => {
      if (close) next(v);
      else buffer.push(v);
    });

    return function () {
      if (sub1) {
        sub1();
        sub1 = null;
      }
      if (sub2) {
        sub2();
        sub2 = null;
      }
    }
  });
};

Pipe.prototype.blockBufferLast = function (pipe, init) {
  return new this.constructor(next => {
    let close = !!init;
    let hasLast = false;
    let last = null;

    let sub1 = pipe.connect(b => {
      b = !!b;
      if (close && !b) {
        // positive edge
        if (hasLast) next(last);
        hasLast = false;
        last = null;
      }
      close = b;
    });

    let sub2 = this.connect(v => {
      if (close) next(v);
      else {
        hasLast = true;
        last = v;
      }
    });

    return function () {
      if (sub1) {
        sub1();
        sub1 = null;
      }
      if (sub2) {
        sub2();
        sub2 = null;
      }
    }
  });
};

// Pipe.prototype.compose = function (pipeModifier) {
//   return pipeModifier(this);
// };

module.exports = Pipe;