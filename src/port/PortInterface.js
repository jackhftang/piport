class PortInterface {

  constructor(port) {
    this._port = port;
  }

  get size() {
    return this._port.size;
  }

  map(f) {
    return this._port.pipe(h => h.map(f));
  }

  mapAsync(f) {
    return this._port.pipeAsync(h => h.map(f));
  }

  mapIterable(f) {
    return this._port.pipe(h => h.mapIterable(f));
  }

  mapIterableAsync(f) {
    return this._port.pipeAsync(h => h.mapIterable(f));
  }

  connect(next) {
    return this._port.connect(next);
  }

  connectPromise() {
    return this._port.connectPromise();
  }
}