// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {Batch} from './entry';
import {State} from './state';

function belongsToGroup(state: State, batch: Batch, group: number[]) {
  // group is a set of indices of batches.
  for (const otherIndex of group) {
    const other = state.batches[otherIndex];
    if (batch.codec !== other.codec || batch.version !== other.version) {
      return false;
    }
  }
  return true;
}

/**
 * Creates groups of batches that share the same properties (codec, version
 * etc.) but differ by effort.
 * @param state The struct containing the batches to group.
 */
export function createGroups(state: State) {
  for (const batch of state.batches) {
    let foundGroup = false;
    for (const group of state.groups) {
      if (belongsToGroup(state, batch, group)) {
        group.push(batch.index);
        foundGroup = true;
      }
    }
    if (foundGroup) continue;

    state.groups.push([batch.index]);
  }
}
