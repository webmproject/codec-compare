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

import {State} from './state';
import {applyMappingToState, stateToMapping, trimDefaultStateMapping} from './state_hash';

/** Syncs the State with the URL arguments. */
export class UrlState {
  /**
   * The values of all possible state elements as if the user passed no URL
   * argument. In other words, any element matching its default value can be
   * omitted from the URL, shortening it, and the displayed page will be the
   * same.
   */
  private defaultValues = new URLSearchParams();

  /**
   * To be called once, after batch loading and initial processing,
   * but before result computation and graph rendering.
   */
  load(state: State) {
    // Gather all possible arguments and their default values.
    this.defaultValues = stateToMapping(state);
    // this.defaultValues will never change again.

    this.update(state);
  }

  /**
   * Modifies the state depending on the arguments explicitly set in the URL.
   */
  update(state: State) {
    let hash = window.location.hash;  // URL trailing part after #.
    if (hash.length > 3) {
      hash = hash.slice(1);  // Remove trailing #.
      applyMappingToState(new URLSearchParams(hash), state);
    }
  }

  /**
   * Stores the necessary state elements as URL arguments.
   * To be called every time something changed in the state.
   */
  save(state: State) {
    const allValues = stateToMapping(state);
    const nonDefaultValues =
        trimDefaultStateMapping(allValues, this.defaultValues);
    if (nonDefaultValues.size > 0) {
      // Save the state into the URL arguments (the trailing part after #).
      window.location.hash = nonDefaultValues.toString();
    } else {
      // Remove the trailing #. window.location.hash = '' leaves a trailing #
      // and window.location.href = [...] triggers a page refresh.
      history.replaceState(
          null, document.title, location.pathname + location.search);
    }
  }
}
