const { Vector3, Quaternion } = require('three');

class Transform {
  constructor(translation, rotation) {
    this.translation = translation || new Vector3();
    this.rotation = rotation || new Quaternion();
  }

  equals(otherTransform) {
    return this.translation.equals(otherTransform.translation)
      && this.rotation.equals(otherTransform.rotation);
  }

  setIdentity() {
    this.translation = new Vector3();
    this.rotation = new Quaternion();
  }

  translate(t) {
    this.translation.add(t.clone().applyQuaternion());
  }

  rotate(r) {
    this.rotation.multiplyQuaternions(this.rotation, r);
  }

  inverse() {
    const t = this.translation.clone().multiplyScalar(-1);
    const r = this.rotation.clone().inverse();
    return new Transform(t.applyQuaternion(r), r);
  }

  times(rhs) {
    if (rhs instanceof Transform) {
      const r = this.rotation.clone();
      const t = this.translation.clone();

      let result = new Transform(
        t.add(rhs.translation.clone().applyQuaternion(this.rotation)),
        r.multiply(rhs.rotation)
      );

      return result;
    }
  }

  clone() {
    return new Transform(this.translation.clone(), this.rotation.clone());
  }

}

module.exports = Transform;
