const Pipe = require('../pipe/Pipe');
const AsyncPipe = require('../pipe/AsyncPipe');
const PortInterface = require('./PortInterface');

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
    this._upstream = upstream;
    this._disconnectUpstream = null;
    this._pipe = null;
    this._asyncPipe = null;
    this._interface = null;
    this._nexts = new Set();
    // todo: support disconnect?
    // this._disconnects = null
  }

  ///////////////////////////////////////////////////////////
  // public methods for external

  // suggested name: sync, build, link, port, create, clone, pipe, spawn
  /**
   *
   * @param transform
   * @returns {Port}
   */
  pipe(transform) {
    let pipe = this._getSyncPipe();
    if (typeof transform === 'function') pipe = transform(pipe);
    return new this.constructor(this.option, pipe);
  }

  /**
   *
   * @param transform
   * @returns {Port}
   */
  pipeAsync(transform) {
    let pipe = this._getAsyncPipe();
    if (typeof transform === 'function') pipe = transform(pipe);
    return new this.constructor(this.option, pipe);
  }

  map(f) {
    return this.pipe(h => h.map(f));
  }

  mapAsync(f) {
    return this.pipeAsync(h => h.map(f));
  }

  mapIterable(f) {
    return this.pipe(h => h.mapIterable(f));
  }

  mapIterableAsync(f) {
    return this.pipeAsync(h => h.mapIterable(f));
  }

  connect(next) {
    return this._getSyncPipe().connect(next);
  }

  /**
   * Connect in current stack frame and
   * resolve the next valve right in current or another stack frame
   * and then disconnect in yet another stack frame.
   *
   * Many values may be missed duration the time between `Promise.resolve` and `disconnect`.
   * Therefore consecutive calls like the following may not get consecutive values.
   * ```
   * // v1 and v2 may not be consecutive values
   * let v1 = await port.promise()
   * let v2 = await port.promise()
   * ```
   *
   * @returns {Promise}
   */
  connectPromise() {
    let disconnect;
    return new Promise(function (resolve, reject) {
      let cnt = 0;
      try {
        disconnect = this._getSyncPipe().connect(function (v) {
          if (cnt++) return;
          resolve(v);
        });
      } catch (ex) {
        reject(ex);
      }
    }).then(
      v => {
        if (typeof disconnect === 'function') disconnect();
        return v;
      },
      err => {
        if (typeof disconnect === 'function') disconnect();
        throw err;
      }
    );
  }

  ///////////////////////////////////////////////////////////
  // public methods for internal

  get size() {
    return this._nexts.size;
  }

  interface() {
    let self = this;
    return this._interface || (this._interface = new PortInterface((this)));
  }

  next(v) {
    this._onValueFromExternal(v);
    return this;
  }

  connectToUpstream() {
    if (!this._disconnectUpstream && this._upstream) {
      this._disconnectUpstream = this._upstream.connect(v => {
        this._onValueFromUpstream(v);
      });
    }
  }

  disconnectFromUpstream() {
    if (this._disconnectUpstream) {
      this._disconnectUpstream();
      this._disconnectUpstream = null;
    }
  }

  ///////////////////////////////////////////////////////////
  // private methods

  _getSyncPipe() {
    return this._pipe || (this._pipe = new Pipe(next => {
      // let id = this._count++;
      this._onConnection(next);
      return () => this._onDisconnection(next);
    }));
  }

  _getAsyncPipe() {
    return this._asyncPipe || (this._asyncPipe = new AsyncPipe(next => {
      // cross platform, efficient Promise trick to run on new stack
      this._onConnection(v => Promise.resolve(v).then(next));
      return () => this._onDisconnection(next);
    }))
  }

  _onConnection(next) {
    this._connect(next);
  }

  _onDisconnection(next) {
    this._disconnect(next);
  }

  _onValueFromExternal(v) {
    this._broadcast(v);
  }

  _onValueFromUpstream(v) {
    this._broadcast(v);
  }

  _onBroadcast() {

  }

  _connect(next) {
    this._nexts.add(next);
  }

  _disconnect(next) {
    this._nexts.delete(next);
  }

  _broadcast(v) {
    this._onBroadcast(v);
    for (let next of this._nexts) next(v);
  }
}


module.exports = Port;