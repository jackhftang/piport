const Pipe = require('./Pipe');

class AsyncPipe extends Pipe {

}

AsyncPipe.interval = function (duration, immediate = false) {
  return new this(function (next) {
    let n = 0;
    if (immediate) next(n++);
    let timer = setInterval(_ => next(n++), duration);
    return function () {
      if (timer) clearInterval(timer);
    }
  })
};

// if do not want to emit value on error, catch it in promise.
AsyncPipe.fromPromise = function (promise, onError) {
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