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
// WITHOUT WARRANTIES OR CONDITIONS OF ANY TEventIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/** A list of all the events that can be triggered by the client. */
export enum EventType {
  // The user requests more details about a given batch (a set of data points).
  BATCH_INFO_REQUEST = 'BATCH_INFO_REQUEST',

  // The user requests more details about the filters applied to the rows of a
  // given batch or about the rows themselves.
  FILTERED_DATA_INFO_REQUEST = 'FILTERED_DATA_INFO_REQUEST',

  // The user requests the list of all matches between a given batch and the
  // batch reference.
  MATCHES_INFO_REQUEST = 'MATCHES_INFO_REQUEST',

  // The user requests more details about a given match (two data points from
  // two different batches paired according to the constraints set by the
  // matchers).
  MATCH_INFO_REQUEST = 'MATCH_INFO_REQUEST',

  // A filter was enabled, disabled or its boundaries/allowlist changed.
  FILTER_CHANGED = 'FILTER_CHANGED',

  // The filtered rows of a batch changed.
  FILTERED_DATA_CHANGED = 'FILTERED_DATA_CHANGED',

  // Another batch was assigned as the reference to match data points and
  // compute stats.
  REFERENCE_CHANGED = 'REFERENCE_CHANGED',

  // A matcher or metric was enabled, disabled or its tolerance changed.
  MATCHER_OR_METRIC_CHANGED = 'MATCHER_OR_METRIC_CHANGED',

  // The state changed and the UI needs to reflect them.
  MATCHED_DATA_POINTS_CHANGED = 'MATCHED_DATA_POINTS_CHANGED',
}

/**
 * Associate the custom event types above to the data structures below globally.
 * This allows typescript to deduce the CustomEvent specialization depending on
 * the event type, at dispatch and listen calls.
 */
declare global {
  interface WindowEventMap {
    BATCH_INFO_REQUEST: CustomEvent<BatchInfoRequestEventData>;
    FILTERED_DATA_INFO_REQUEST: CustomEvent<BatchInfoRequestEventData>;
    MATCHES_INFO_REQUEST: CustomEvent<BatchInfoRequestEventData>;
    MATCH_INFO_REQUEST: CustomEvent<MatchInfoRequestEventData>;
    FILTER_CHANGED: CustomEvent<FilterChanged>;
    FILTERED_DATA_CHANGED: CustomEvent<FilteredDataChanged>;
    REFERENCE_CHANGED: Event;
    MATCHER_OR_METRIC_CHANGED: Event;
    MATCHED_DATA_POINTS_CHANGED: Event;
  }
}

// Structured custom event data

interface BatchInfoRequestEventData {
  batchIndex: number;
}

interface MatchInfoRequestEventData {
  batchIndex: number;
  matchIndex: number;
}

interface FilterChanged {
  batchIndex: number;
}

interface FilteredDataChanged {
  batchIndex: number;
}

// Helper functions

type EventDataTypeFromCustomEventType<C> =
    C extends CustomEvent<infer T>? T : never;

/**
 * Instantiates an Event and dispatches it.
 * If data is provided, instantiates a typed CustomEvent instead, assigns its
 * data as CustomEvent.detail and dispatches it.
 */
export function dispatch<TEvent extends keyof WindowEventMap>(
    eventType: TEvent,
    data?: EventDataTypeFromCustomEventType<WindowEventMap[TEvent]>) {
  if (data === undefined) {
    window.dispatchEvent(new Event(eventType));
  } else {
    window.dispatchEvent(
        new CustomEvent<
            EventDataTypeFromCustomEventType<WindowEventMap[TEvent]>>(
            eventType, {
              detail: data,
            }));
  }
}

/**
 * Same as window.addEventListener(). Available for consistency with
 * Dispatch(). To be called in connectedCallback() of LitElements.
 * Call window.removeEventListener() before removing the listener object from
 * the DOM.
 */
export function listen<TEvent extends keyof WindowEventMap>(
    eventType: TEvent,
    listener: (this: Window, ev: WindowEventMap[TEvent]) => void,
    options?: boolean|AddEventListenerOptions) {
  window.addEventListener(eventType, listener, options);
}
