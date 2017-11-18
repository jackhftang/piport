class Buffer {

  constructor(size) {
    this.ix = 0;   // position of eldest element in memory
    this.size = size;
    this.buffer = [];
  }

  get isFull() {
    return this.size === this.buffer.length;
  }

  get first() {
    // return undefined if no element
    return this.buffer[this.ix];
  }

  get last() {
    // return undefined if no element
    let {ix, buffer} = this;
    return buffer[(ix + buffer.length - 1) % buffer.length];
  }

  add(v) {
    let {buffer, ix, size} = this;
    if (buffer.length < size) {
      buffer.push(v);
    }
    else if (ix < size) {
      buffer[ix] = v;
      ix += 1;
      if (ix >= size) ix -= size;
      this.ix = ix;
    }
  }

  forEach(callback) {
    let {buffer, ix, size} = this;
    for (let i = ix; i < buffer.length; i++) {
      callback(buffer[i % size]);
    }
  }
}

module.exports = Buffer;