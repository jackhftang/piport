const Port = require('./Port');

/**
 * Class representing an EventPort
 *
 * reference counted to connect/discount
 * @extends Port
 */
class EventPort extends Port {

  _onConnection(next) {
    this._connect(next);
    if (this.size === 1) {
      this.connectToUpstream();
    }
  }

  _onDisconnection(next) {
    this._disconnect(next);
    if (this.size === 0) {
      this.disconnectFromUpstream();
    }
  }
}

module.exports = EventPort;
