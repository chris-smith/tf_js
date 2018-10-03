/*
 *    Copyright 2018 Rethink Robotics
 *
 *    Copyright 2018 Chris Smith
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

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

// we don't need the real distance, we just need a proxy for greater, less
function distance(timeA, timeB) {
  const secs = timeA.secs - timeB.secs;

  if (secs === 0) {
    return Math.sign(timeA.nsecs - timeB.nsecs);
  }
  // else
  return Math.sign(secs);
}

function equal(a, b) {
  return a.secs === b.secs && a.nsecs === b.nsecs;
}

function expired(timeA, timeB, maxAgeS) {
  const expireTime = { secs: timeB.secs + maxAgeS, nsecs: timeB.nsecs };

  return distance(timeA, expireTime) > 0;
}

module.exports = {
  isZero,
  toSec,
  toNumber,
  distance,
  equal,
  expired
};
