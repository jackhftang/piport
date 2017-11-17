const Port = require('./Port');

/**
 * Class representing an EventPort
 *
 * reference counted to connect/discount
 * @extends Port
 */
class EventPort extends Port {

  onConnection(id, next) {
    this._nexts.set(id, next);
    if (this._nexts.size === 1) {
      this.connectToUpstream();
    }
  }

  onDisconnection(id) {
    this._nexts.delete(id);
    if (this._nexts.size === 0) {
      this.disconnectFromUpstream();
    }
  }
}

module.exports = EventPort;
