const Port = require('./Port');

/**
 * Port with limited connections
 *
 * @extends Port
 */
class SingletonPort extends Port {

  // refcnt
  constructor(option = {}, pipe = null) {
    super(option, pipe);
    this.option = Object.assign({connectionSize: 1}, this.option);

  }

  _onConnection(next) {
    let limit = this.option.connectionSize;
    if (this.size < limit) {
      this._connect(next);
      if (this.size === 1) {
        this.connectToUpstream();
      }
    }
    else throw new Error('Exceed number of connection limit: ' + limit);
  }

  _onDisconnection(next) {
    this._disconnect(next);
    if (this.size === 0) {
      this.disconnectFromUpstream();
    }
  }

}

module.exports = SingletonPort;