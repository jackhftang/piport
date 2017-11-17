const Pipe = require('./Pipe');

/** Class representing a Port */
class Port {
  // default long living, even-like

  /**
   * @constructor
   * @param {?Object} option
   * @param {?Pipe} upstream
   */
  constructor(option = {}, upstream = null) {
    this.option = Object.assign({}, option);
    this._count = 0;
    this._nexts = new Map();
    this._upstream = upstream;
    this._disconnect = null;
    this._pipe = null;
  }

  _broadcast(v) {
    this.onBroadcast(v);
    for (let next of this._nexts.values()) next(v);
  }

  next(v) {
    this.onValueFromExternal(v);
    return this;
  }

  pipe() {
    return this._pipe || (this._pipe = new Pipe(next => {
        let id = this._count++;
        this.onConnection(id, next);
        return () => this.onDisconnection(id);
      }));
  }

  connect(action) {
    let pipe = this.pipe();
    return pipe.connect(action);
  }

  connectToUpstream() {
    if (!this._disconnect && this._upstream) {
      this._disconnect = this._upstream.connect(v => {
        this.onValueFromUpstream(v);
      });
    }
  }

  disconnectFromUpstream() {
    if (this._disconnect) {
      this._disconnect();
      this._disconnect = null;
    }
  }

  build(transform) {
    let pipe = transform(this.pipe());
    return new this.constructor(this.option, pipe);
  }

  onConnection(id, next) {
    this._nexts.set(id, next);
  }

  onDisconnection(id) {
    this._nexts.delete(id);
  }

  onValueFromExternal(v) {
    this._broadcast(v);
  }

  onValueFromUpstream(v) {
    this._broadcast(v);
  }

  onBroadcast() {

  }
}


module.exports = Port;