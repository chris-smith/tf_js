function isZero(time) {
  if (time === 0) {
    return true;
  }
  else if (time.secs === 0 && time.nsecs === 0) {
    return true;
  }
  // else
  return false;
}

function toNumber(time) {
  toSec(time);
}

function toSec(time) {
  return time.secs + time.nsecs * 1e-9;
}

function distance(timeA, timeB) {
  const numA = toSec(timeA);
  const numB =  toSec(timeB);

  const diff = numA - numB;
  return diff;
}

function equal(a, b) {
  return a.secs === b.secs && a.nsecs === b.nsecs;
}

module.exports = {
  isZero,
  toSec,
  toNumber,
  distance,
  equal
};
