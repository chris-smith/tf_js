const Transform = require('./Transform.js');

class TransformStamped {
  constructor({header, child_frame_id, transform} = {}) {
    this.header = header || {
      seq: 0,
      stamp: {secs: 0, nsecs: 0},
      frame_id: ''
    };

    this.child_frame_id = child_frame_id || '';
    this.transform = transform || new Transform();
  }

  clone() {
    return new TransformStamped({
      header: JSON.parse(JSON.stringify(this.header)),
      child_frame_id: this.child_frame_id,
      transform: this.transform.clone()
    });
  }
}

module.exports = TransformStamped;
