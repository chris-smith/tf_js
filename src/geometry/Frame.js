const Transform = require('./Transform.js');

class Frame {
  constructor(id, options={}) {
    this.id = id;

    this.parent = options.parent || null;

    this.children = options.children || new Set();

    this.transform = options.transform || new Transform();

    this.time = options.time || {secs: 0, nsecs: 0};
  }
}

module.exports = Frame;
