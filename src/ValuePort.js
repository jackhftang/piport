const Port = require('./Port');

/**
 * Class representing a ValuePort
 *
 * long living, connect on start, replay size of 1
 * when historySize = 0, basically live living only
 *
 * @extends Port
 */
class ValuePort extends Port {

  /**
   *
   *
   * @param {?{historySize: number}} option
   * @param {?Pipe} pipe
   */
  constructor(option = {}, pipe) {
    super(option, pipe);
    this.option = Object.assign({historySize: 1}, this.option);
    this.size = this.option.historySize;
    this.ix = 0;   // position of eldest element in memory
    this.history = [];
  }

  onStart() {
    this.connectToUpstream();
  }

  onConnection(id, next) {
    this._nexts.set(id, next);

    // send out history immediately
    let {history, ix, size} = this;
    for (let i = ix; i < history.length; i++) {
      next(history[i % size]);
    }
  }

  onBroadcast(v) {
    let {history, ix, size} = this;
    if (history.length < size) {
      history.push(v);
    }
    else if (ix < size) {
      history[ix] = v;
      ix += 1;
      if (ix >= size) ix -= size;
      this.ix = ix;
    }
  }

  build(transform) {
    let pipe = transform(this.pipe());
    return new this.constructor(this.option, pipe);
  }
}

module.exports = ValuePort;