/** Class representing a pipe */
class Pipe {

  /**
   * Cleanup resource allocated on connection
   * @callback DisconnectFunction
   *
   */

  /**
   *
   * @callback NextFunction
   * @param value
   */

  /**
   *
   *
   * @callback ConnectFunction
   * @param {NextFunction} next
   * @return {DisconnectFunction} disconnect
   */

  /**
   *
   * @constructor
   * @param {!ConnectFunction} connect
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
 * @param {Function} func
 * @returns {Pipe}
 */
Pipe.create = function (func) {
  return new this(func);
};

Pipe.createScoped = function (func) {
  return new this(func());
};

Pipe.empty = function () {
  return new this(function () {
    return function () {
    };
  });
};

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

// if do not want to emit value on error, catch it in promise.
Pipe.fromPromise = function (promise, onError) {
  if (!onError) onError = function (err, next) {
    throw err;
  };
  return new this(function (next) {
    promise.then(x => next(x)).catch(err => onError(err, next));
    return function () {
      // release reference to variable
      promise = null;
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

Pipe.interval = function (duration, immediate = false) {
  return new this(function (next) {
    let n = 0;
    if (immediate) next(n++);
    let timer = setInterval(_ => next(n++), duration);
    return function () {
      if (timer) clearInterval(timer);
    }
  })
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

// when all updated emit all
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
            next(zip(...last));
            for (let i = 0; i < n; i++) updated[i] = false;
            updatedCount = n;
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

Pipe.prototype.drop = function (n) {
  return new this.constructor(next => this.connect(v => {
    if (n > 0) n -= 1;
    else next(v);
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

Pipe.prototype.merge = function (...args) {
  return this.constructor.merge(this, ...args);
};

Pipe.prototype.combine = function (...args) {
  return this.constructor.combine(this, ...args);
};

Pipe.prototype.zip = function (...args) {
  return this.constructor.combine(this, ...args);
}

// emit value, then block for duration
Pipe.prototype.debounce = function (duration) {
  return new this.constructor(next => {
    let timer = null;
    let disconnect = this.connect(v => {
      if (timer) return;
      timer = setTimeout(_ => {
        next(v);
        clearTimeout(timer);
        timer = null;
      }, duration)
    });
    return function () {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (disconnect) {
        disconnect();
        disconnect = null;
      }
    }
  })
};

// receive value, wait for duration, emit the last
Pipe.prototype.throttle = function (duration) {
  return new this.constructor(next => {
    let timer = null;
    let last;
    let disconnect = this.connect(v => {
      last = v;
      if (timer) return;
      timer = setTimeout(_ => {
        next(last);
        clearTimeout(timer);
        timer = null;
      }, duration)
    });
    return function () {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (disconnect) {
        disconnect();
        disconnect = null;
      }
    }
  })
};

Pipe.prototype.prependIterable = function (iterable) {
  return new this.constructor(next => {
    for (let x of iterable) next(x);
    return this.connect(v => next(v));
  });
};

Pipe.prototype.prepend = function (...args) {
  return this.prependIterable(args);
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

// Converts a higher-order pipe into a first-order, then connect to only the most recent one.
Pipe.prototype.switch = function () {
  return new this.constructor(next => {
    let last = null;

    function disconnect() {
      if (last) {
        last();
        last = null;
      }
    }

    return this.connect(pipe => {
      disconnect();
      last = pipe.connect(v => next(v));
      return disconnect
    })
  })
};

Pipe.prototype.switchMap = function (func) {
  return this.map(func).switch();
};

Pipe.prototype.switchObject = function (obj) {
  return this.filter(key => key in obj)
    .map(key => obj[key])
    .switch();
};

Pipe.prototype.flatten = function () {
  return new this.constructor(next => this.connect(iterable => {
    for (let x of iterable) next(x);
  }));
};

// Pipe.prototype.compose = function (pipeModifier) {
//   return pipeModifier(this);
// };

Pipe.prototype.pluck = function (key) {
  return this.map(obj => obj[key]);
};

Pipe.prototype.splitKeys = function (...keys) {
  return keys.map(key => {
    this.connect(obj => obj[key]);
  })
};

Pipe.prototype.toggle = function (pipe, init) {
  return new this.constructor(next => {
    let open = init;

    // check the open first
    let sub1 = pipe.connect(b => open = !!b);

    // let values flow
    let sub2 = this.connect(v => {
      if (open) next(v)
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

Pipe.prototype.toggleRecoverAll = function (pipe, init) {
  return new this.constructor(next => {
    let open = init;
    let buffer = [];

    let sub1 = pipe.connect(b => {
      b = !!b;
      if (!open && b) {
        // positive edge
        for (let x of buffer) next(x);
        buffer = [];
      }
      open = b;
    });

    let sub2 = this.connect(v => {
      if (open) next(v);
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

Pipe.prototype.toggleRecoverLast = function (pipe, init) {
  return new this.constructor(next => {
    let open = init;
    let hasLast = false;
    let last = null;

    let sub1 = pipe.connect(b => {
      b = !!b;
      if (!open && b) {
        // positive edge
        if (hasLast) next(last);
        hasLast = false;
        last = null;
      }
      open = b;
    });

    let sub2 = this.connect(v => {
      if (open) next(v);
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

module.exports = Pipe;