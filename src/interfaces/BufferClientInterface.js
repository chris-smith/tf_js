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

 class BufferClientInterface {
   constructor(checkFrequency = 10, timeoutPaddingMs = 2000) {
     this._goalCheckTimeMs = 1000 / checkFrequency;
     this._timeoutPaddingMs = timeoutPaddingMs;
   }

   lookupTransform(targetFrame, sourceFrame, time, timeout) {
     throw new Error('Not Implemented by Base Class!');
   }

   lookupTransformWithFixedFrame(targetFrame, targetTime, sourceFrame, sourceTime,
                                 fixedFrame, timeout) {
     throw new Error('Not Implemented by Base Class!');
   }

   canTransform(targetFrame, sourceFrame, time, timeout) {
     throw new Error('Not Implemented by Base Class!');
   }

   canTransformWithFixedFrame(targetFrame, targetTime, sourceFrame, sourceTime,
                              fixedFrame, timeout) {
     throw new Error('Not Implemented by Base Class!');
   }

   transform(frameToTransform, targetFrame, timeout) {
     const sourceFrameId = this._getFrameId(frameToTransform);
     const sourceTime = this._getFrameTimestamp(frameToTransform);

     return this.lookupTransform(targetFrame, sourceFrameId, sourceTime, timeout)
     .then((result) => {
       return doTransform(frameToTransform, result);
     });
   }

   transformWithFixedFrame(frameToTransform, targetFrame, targetTime, fixedFrame, timeout) {
     const sourceFrameId = this._getFrameId(frameToTransform);
     const sourceTime = this._getFrameTimestamp(frameToTransform);

     return this.lookupTransformWithFixedFrame(targetFrame, targetTime,
       sourceFrameId, sourceTime, fixedFrame, timeout
     ).then((result) => {
       return doTransform(frameToTransform, result);
     });
   }

   _getFrameId(transform) {

   }

   _getFrameTimestamp(transform) {

   }

   waitForServer(timeout) {
     throw new Error('Not Implemented by Base Class!');
   }

   _processGoal(goal) {

   }

   _processResult(result) {

   }
 }

module.exports = BufferClientInterface;
