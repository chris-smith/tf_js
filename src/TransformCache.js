const { Vector3, Quaternion } = require('three');

const timeUtils = require('./TimeUtils.js');

const { binarySearchIndex, binarySearchBounds, lowerBound } = require('./BinarySearch.js');
const Frame = require('./geometry/Frame.js');

class TransformCache {
  constructor(maxAgeS) {
    this._cache = [];

    this._maxAgeS = maxAgeS;
  }

  get length() {
    return this._cache.length;
  }

  get(index) {
    if (index < 0) {
      return this._cache[this.length + index];
    }
    // else
    return this._cache[index];
  }

  clear() {
    this._cache = [];
  }

  insert(newData) {
    const len = this.length;
    let bounds;
    let insertionIndex = null;
    let numToDelete = 0;
    const newStamp = newData.header.stamp;

    let distanceFromStart;
    let distanceFromEnd;
    let isWithinExistingBounds;

    if (len !== 0) {
      // if this entry is too old, don't add it
      if (timeUtils.distance(this.getLatestTimestamp(), newStamp) > this._maxAgeS) {
        console.log('too old');
        return false;
      }

      distanceFromStart = this._distanceFromStart(newStamp);
      distanceFromEnd = this._distanceFromEnd(newStamp);
      isWithinExistingBounds = distanceFromStart >= 0 && distanceFromEnd <= 0;

      // optimization - if we already know this new entry has a timestamp equal
      // to the first or last entry in the list, replace it rather than searching
      // for where to put it.
      if (distanceFromStart === 0) {
        insertionIndex = 0;
        // this._cache.splice(insertionIndex, 1, newData);
      }
      else if (distanceFromEnd === 0) {
        insertionIndex = len - 1;
        // console.log('is end: %j, %j', newStamp, this._getStamp(-1));
      }
      else if (isWithinExistingBounds) {
        // if the current time is within the existing bounds of the cache, search
        // for a matching timestamp. We'll replace the old entry if we find one.
        bounds = this._getBounds(newStamp);

        // there's an exact match for this timestamp if there is only 1 entry in bounds
        if (bounds.length === 1) {
          // console.log('exact match');
          insertionIndex = bounds[0];
        }
      }
    }

    // if we haven't determined an insertion point above, do so
    const replacing = (insertionIndex !== null);
    if (!replacing) {
      if (len === 0) {
        insertionIndex = 0;
      }
      else if (distanceFromStart < 0) {
        insertionIndex = 0;
      }
      else if (distanceFromEnd > 0) {
        insertionIndex = len
      }
      else {
        insertionIndex = bounds[0] + 1;
      }
    }
    else {
      numToDelete = 1;
    }

    // Optimization: check if the data we're inserting would cause the cache
    // to have identical pieces of data in a row. If it would, lets remove any old entries
    // since interpolating between them all will have no effect

    // If we're not replacing an existing entry (by time), check at the
    // insertion index for repeated data
    if (!replacing && this._checkRepeatedInsertion(insertionIndex, newData)) {
      // console.log('forward');
      numToDelete += 1;
    }
    // otherwise if we are replacing an existing entry (by time), check at one
    // after the current insertion index for repeated data
    else if (replacing && this._checkRepeatedInsertion(insertionIndex + 1, newData)) {
      // console.log('forward weird');
      numToDelete += 1;
    }

    // check if the data behind the insertion index is repeated
    if (this._checkRepeatedInsertion(insertionIndex - 1, newData)) {
      // console.log('back');
      numToDelete += 1;
      insertionIndex -= 1;
    }

    this._cache.splice(insertionIndex, numToDelete, newData);

    // remove old entries if there are any
    this._removeOldEntries();

    return true;
  }

  getLatestTimestamp() {
    if (this.length > 0) {
      return this._getStamp(-1);
    }
  }

  getEarliestTimestamp() {
    if (this.length > 0) {
      return this._getStamp(0);
    }
  }

  _distanceFromStart(stamp) {
    if (this.length > 0) {
      return timeUtils.distance(stamp, this._getStamp(0));
    }
  }

  _distanceFromEnd(stamp) {
    if (this.length > 0) {
      return timeUtils.distance(stamp, this._getStamp(-1));
    }
  }

  _getStamp(index) {
    return this._getData(index).header.stamp;
  }

  _getData(index) {
    if (index < 0) {
      return this._cache[this.length + index];
    }
    // else
    return this._cache[index];
  }

  _checkRepeatedInsertion(index, data) {
    if (index >= 0 && index < this.length) {
      const tmp = this._getData(index);
      return (tmp.header.frame_id === data.header.frame_id) && tmp.transform.equals(data.transform);
    }
    // else
    return false;
  }

  findClosestFrames(time) {
    const len = this.length;
    if (len === 0) {
      throw new Error('Unable to find closest transform with no history');
    }
    else if (timeUtils.isZero(time)) {
      return [ this._cache[len - 1] ];
    }
    else if (len === 1) {
      if (timeUtils.equal(time, this._cache[0].header.stamp)) {
        return [ this._cache[0] ];
      }
      else {
        throw new Error('Unable to interpolate with only one transform');
      }
    }
    // else
    const latestTime = this._cache[len - 1].header.stamp;
    const earliestTime = this._cache[0].header.stamp;

    const earliestDist = timeUtils.distance(time, earliestTime);
    const latestDist = timeUtils.distance(time, latestTime);

    if (latestDist === 0) {
      return [ this._cache[len - 1] ];
    }
    else if (earliestDist === 0) {
      return [ this._cache[0] ];
    }
    else if (latestDist > 0) {
      throw new Error('Unable to extrapolate into the future');
    }
    else if (earliestDist < 0) {
      throw new Error('Unable to extrapolate into the past');
    }

    const bounds = this._getBounds(time);
    switch (bounds.length) {
      case 1:
        return [ this._cache[ bounds[0] ] ];
      case 2:
        return [
          this._cache[ bounds[0] ],
          this._cache[ bounds[1] ]
        ];
      default:
        throw new Error('Unable to extract bounds for value');
    }
  }

  getClosest(time) {
    const frames = this.findClosestFrames(time);
    if (frames.length === 0) {
      return frames[0];
    }
  }

  interpolate(tfA, tfB, time) {
    const aTime = frameA.header.stamp;
    const bTime = frameB.header.stamp;
    if (timeUtils.equal(aTime, bTime)) {
      return frameB;
    }

    const interpDiff = timeUtils.distance(time, aTime);
    const totalDiff = timeUtils.distance(bTime, aTime);
    const ratio = interpDiff / totalDiff;

    const vec = new Vector3().lerpVectors(tfA.transform.translation, frameB.transform.translation, ratio);
    const quat = Quaternion.slerp(tfA.transform.rotation, frameB.transform.rotation, ratio);

    return {
      header: {
        seq: 0,
        stamp: tfA.header.stamp,
        frame_id: tfA.header.frame_id
      },
      child_frame_id: tfA.child_frame_id,
      transform: {
        translation: vec,
        rotation: quat
      }
    };
  }

  getMostRecent() {
    const len = this.length;
    if (len > 0) {
      return this._cache[this.length - 1];
    }
  }

  _removeOldEntries() {
    const len = this.length;
    if (len > 0) {
      const stamp = this.getLatestTimestamp();
      let i = 0;
      while (i < len && timeUtils.distance(stamp, this._cache[i].header.stamp) > this._maxAgeS) {
        ++i;
      }

      this._cache.splice(0, i);
    }
  }

  _getBounds(time) {
    return binarySearchBounds(this._cache, time, (a, b) => {
      return timeUtils.distance(a.header.stamp, b);
    });
  }

  _getLowerBound(time) {
    return lowerBound(this._cache, time, (a, b) => {
      return timeUtils.distance(a.header.stamp, b);
    });
  }

  _getEntryIndex(time) {
    const bounds = this._getBounds(time);
    if (bounds.length === 1) {
      return bounds[0];
    }
    // else
    return -1;
  }
};

module.exports = TransformCache;
