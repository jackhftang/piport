const Port = require('./Port');
const Buffer = require('../struct/Buffer');


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
  constructor(option = {}, pipe = null) {
    super(option, pipe);
    this.option = Object.assign({historySize: 1}, this.option);
    this.buffer = new Buffer(this.option.historySize);

    // immediately connect to upstream
    this.connectToUpstream();
  }

  forEach(next) {
    this.buffer.forEach(next);
  }

  _onConnection(next) {
    this._connect(next);
    // send out history immediately
    this.forEach(next);
  }

  _onBroadcast(v) {
    this.buffer.add(v);
  }

}

module.exports = ValuePort;