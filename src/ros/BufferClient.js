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

const BufferClientInterface = require('../interfaces/BufferClientInterface.js');

let rosnodejs = null;
let LookupTransformGoal = null;
let TF2Error = null;

class BufferClient extends BufferClientInterface {
  constructor(namespace, checkFrequency = 10, timeoutPaddingMs = 2000) {
    super(checkFrequency, timeoutPaddingMs);

    this._client = new rosnodejs.SimpleActionClient({
      nh: rosnodejs.nh,
      type: 'tf2_msgs/LookupTransform',
      actionServer: namespace
    });

  }

  lookupTransform(targetFrame, sourceFrame, time, timeout) {
    if (!timeout) {
      timeout = { secs: 0, nsecs: 0 };
    }

    const goal = new LookupTransformGoal({
      target_frame: targetFrame,
      source_frame: sourceFrame,
      source_time: time,
      timeout: timeout,
      advanced: false
    });

    return this._sendGoal(goal);
  }

  lookupTransformWithFixedFrame(targetFrame, targetTime, sourceFrame, sourceTime,
                                fixedFrame, timeout) {
    if (!timeout) {
      timeout = { secs: 0, nsecs: 0 };
    }

    const goal = new LookupTransformGoal({
      target_frame: targetFrame,
      source_frame: sourceFrame,
      source_time: time,
      timeout: timeout,
      target_time: targetTime,
      fixed_frame, fixedFrame,
      advanced: true
    });

    return this._sendGoal(goal);
  }

  canTransform(targetFrame, sourceFrame, time, timeout) {
    return this.lookupTransform(targetFrame, sourceFrame, time, timeout)
    .then(() => { return true })
    .catch(() => { return false });
  }

  canTransformWithFixedFrame(targetFrame, targetTime, sourceFrame, sourceTime,
                             fixedFrame, timeout) {
    return this.lookupTransform(targetFrame, targetTime, sourceFrame, sourceTime,
                                fixedFrame, timeout)
    .then(() => { return true })
    .catch(() => { return false });
  }

  waitForServer(timeout) {
    return this._client.waitForServer(timeout);
  }

  _sendGoal(goal) {
    let timedOut = false;
    let timeoutResolve = null;
    let timer = null;

    return new Promise((resolve, reject) => {
      this._client.sendGoal(goal);

      this._waitForGoalCompleteOrTimeout(goal, () => timedOut)
      .then((result) => {
        clearTimeout(timer);

        switch(result.error.error) {
          case TF2Error.Constants.NO_ERROR:
            return result.transform;
          case TF2Error.Constants.LOOKUP_ERROR:
            throw new Error(`LookupException! ${result.error.error_string}`);
          case TF2Error.Constants.CONNECTIVITY_ERROR:
            throw new Error(`ConnectivityException! ${result.error.error_string}`);
          case TF2Error.Constants.EXTRAPOLATION_ERROR:
            throw new Error(`ExtrapolationException! ${result.error.error_string}`);
          case TF2Error.Constants.INVALID_ARGUMENT_ERROR:
            throw new Error(`InvalidArgumentException! ${result.error.error_string}`);
          case TF2Error.Constants.TIMEOUT_ERROR:
            throw new Error(`TimeoutException! ${result.error.error_string}`);
          default:
            throw new Error(result.error.error_string);
        }
      })
      .then(resolve, reject);

      // FIXME: use ROS time in case of sim
      const timeout = rosnodejs.Time.rosTimeToDate(goal.timeout).getTime() + this._timeoutPaddingMs;
      timer = setTimeout(function() {
        timedOut = true;
      }, timeout);
    });
  }

  _isClientDone() {
    const simpleState = this._client.getState();

    return simpleState !== 'PENDING' &&
          simpleState !== 'ACTIVE';
  }

  _waitForGoalCompleteOrTimeout(goal, isTimedOutFunc) {
    if (!rosnodejs.ok()) {
      return Promise.reject(new Error('ROS shutdown while waiting for LookupTransform goal to complete!'))
    }
    else if (this._isClientDone()) {
      return Promise.resolve(this._client.getResult());
    }
    else if (isTimedOutFunc()) {
      return Promise.reject(new Error('The LookupTransform goal sent to the BufferServer did not come back in the specified time. Something is likely wrong with the server.'));
    }
    // else
    return new Promise((resolve) => {
      setTimeout(resolve, this._goalCheckTimeMs);
    })
    .then(() => {
      return this._waitForGoalCompleteOrTimeout(goal, isTimedOutFunc);
    });
  }
}

module.exports = function(ros, ...rest) {
  if (rosnodejs === null) {
    rosnodejs = ros;
    LookupTransformGoal = ros.require('tf2_msgs').msg.LookupTransformGoal;
    TF2Error = ros.require('tf2_msgs').msg.TF2Error;
  }

  if (new.target) {
    return new BufferClient(...rest);
  }
  else {
    return BufferClient;
  }
};
