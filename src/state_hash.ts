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

import {selectPlotMetrics} from './metric';
import {State} from './state';

/**
 * Traverses the whole state and returns the mapping from any possible element
 * name to its current value.
 */
export function stateToMapping(state: State) {
  const values = new URLSearchParams();
  const reference =
      state.batchSelections[state.referenceBatchSelectionIndex].batch;

  // Note that it could be just the index instead of the full name, but it is
  // easier to read in a URL this way.
  values.set('ref', reference.name);

  // Each field fitler is stored as "off" if disabled, and as its range or set
  // of filtered values if enabled.
  for (const batchSelection of state.batchSelections) {
    for (const [fieldIndex, fieldFilter] of batchSelection.fieldFilters
             .entries()) {
      const batch = batchSelection.batch;
      const field = batch.fields[fieldIndex];
      // There may be collisions if names contain the character '-' such as
      // "batch-a"-"field" and "batch"-"a-field" but this should never happen in
      // practice.
      const key = `${batch.name}-${field.name}`;

      if (!fieldFilter.enabled) {
        values.set(key, 'off');
        continue;
      }

      if (field.isNumber) {
        values.set(key, `${fieldFilter.rangeStart}..${fieldFilter.rangeEnd}`);
      } else {
        // Serialize the bitset of filtered values as a hexadecimal string.
        // Listing the set of actual values verbatim would take too many
        // characters.
        let hexValue = '';
        let incompleteHexDigit = 0;
        let i = 0;
        for (const possibleFieldValue of field.uniqueValuesArray) {
          if (fieldFilter.uniqueValues.has(possibleFieldValue)) {
            incompleteHexDigit |= 1 << i;
          }
          ++i;
          if (i === 4) {
            hexValue += incompleteHexDigit.toString(16);
            incompleteHexDigit = 0;
            i = 0;
          }
        }
        if (i !== 0) {
          hexValue += incompleteHexDigit.toString(16);
        }

        values.set(key, hexValue);
      }
    }
  }

  // Each matcher is stored as "off" if disabled, and as "on" or its tolerance
  // if enabled.
  for (const matcher of state.matchers) {
    const field = state.batches[0].fields[matcher.fieldIndices[0]];
    values.set(
        'matcher_' + field.name,
        !matcher.enabled    ? 'off' :
            !field.isNumber ? 'on' :
                              String(matcher.tolerance));
  }

  // Each metric is stored as "on"/"off" depending on its enabled field value.
  for (const metric of state.metrics) {
    const field = state.batches[0].fields[metric.fieldIndices[0]];
    values.set('metric_' + field.name, metric.enabled ? 'on' : 'off');
  }

  // The default plot axis are relative to the enabled metrics. Use "default" as
  // a placeholder to signal that.
  const [defaultPlotMetricHorizontal, defaultPlotMetricVertical] =
      selectPlotMetrics(state.batches[0], state.metrics);
  if (state.plotMetricVertical !== undefined) {
    if (state.plotMetricVertical === defaultPlotMetricVertical) {
      values.set('ploty', 'default');
    } else {
      const field =
          state.batches[0].fields[state.plotMetricVertical.fieldIndices[0]];
      values.set('ploty', field.name);
    }
  }
  if (state.plotMetricHorizontal !== undefined) {
    if (state.plotMetricHorizontal === defaultPlotMetricHorizontal) {
      values.set('plotx', 'default');
    } else {
      const field =
          state.batches[0].fields[state.plotMetricHorizontal.fieldIndices[0]];
      values.set('plotx', field.name);
    }
  }

  // Global settings.
  values.set('each_match', state.showEachMatch ? 'show' : 'hide');
  values.set('mean', state.useGeometricMean ? 'geo' : 'arith');
  return values;
}

/**
 * Modifies the state according to the element values.
 * Ignores any unused element or invalid value.
 */
export function applyMappingToState(values: URLSearchParams, state: State) {
  const ref = values.get('ref');
  if (ref) {
    for (const batchSelection of state.batchSelections) {
      if (batchSelection.batch.name === ref) {
        state.referenceBatchSelectionIndex = batchSelection.batch.index;
        break;
      }
    }
  }

  for (const batchSelection of state.batchSelections) {
    for (const [fieldIndex, fieldFilter] of batchSelection.fieldFilters
             .entries()) {
      const batch = batchSelection.batch;
      const field = batch.fields[fieldIndex];
      const value = values.get(`${batch.name}-${field.name}`);
      if (value === null) continue;

      if (value === 'off') {
        fieldFilter.enabled = false;
        continue;
      }
      fieldFilter.enabled = true;

      if (field.isNumber) {
        const range = value.split('..');
        if (range.length !== 2) continue;

        const rangeStart = Number(range[0]);
        const rangeEnd = Number(range[1]);
        if (!isFinite(rangeStart) || !isFinite(rangeEnd)) continue;
        if (rangeStart > rangeEnd) continue;

        fieldFilter.rangeStart =
            Math.min(Math.max(field.rangeStart, rangeStart), field.rangeEnd);
        fieldFilter.rangeEnd =
            Math.min(Math.max(field.rangeStart, rangeEnd), field.rangeEnd);
      } else {
        if (value.length !== Math.ceil(field.uniqueValuesArray.length / 4)) {
          continue;
        }

        // Deserialize the hexadecimal string to a bitset of filtered values.
        for (const [i, possibleFieldValue] of field.uniqueValuesArray
                 .entries()) {
          const hexCharIndex = Math.floor(i / 4);

          // "Code must not use parseInt except for non-base-10" but base-16 is
          // not recognized by the linter.
          // tslint:disable-next-line:ban
          const hexChar = parseInt(value[hexCharIndex], 16);
          if (!isFinite(hexChar)) continue;

          if ((hexChar & (1 << (i % 4))) === 0) {
            fieldFilter.uniqueValues.delete(possibleFieldValue);
          } else {
            fieldFilter.uniqueValues.add(possibleFieldValue);
          }
        }
      }
    }
  }

  for (const matcher of state.matchers) {
    const field = state.batches[0].fields[matcher.fieldIndices[0]];
    const value = values.get('matcher_' + field.name);
    if (!value) continue;

    if (value === 'off') {
      matcher.enabled = false;
    } else if (value === 'on') {
      matcher.enabled = true;
    } else {
      const numericValue = Number(value);
      if (isNaN(numericValue)) continue;
      if (numericValue < 0 || numericValue >= 1) continue;

      matcher.enabled = true;
      matcher.tolerance = numericValue;
    }
  }

  const plotx = values.get('plotx');
  const ploty = values.get('ploty');
  for (const metric of state.metrics) {
    const field = state.batches[0].fields[metric.fieldIndices[0]];
    const value = values.get('metric_' + field.name);
    if (value) {
      if (value === 'off') {
        metric.enabled = false;
      } else if (value === 'on') {
        metric.enabled = true;
      }
    }

    if (plotx === field.name) {
      state.plotMetricHorizontal = metric;
    }
    if (ploty === field.name) {
      state.plotMetricVertical = metric;
    }
  }

  const eachMatch = values.get('each_match');
  if (eachMatch) {
    if (eachMatch === 'show') {
      state.showEachMatch = true;
    } else if (eachMatch === 'hide') {
      state.showEachMatch = false;
    }
  }

  const mean = values.get('mean');
  if (mean) {
    if (mean === 'geo') {
      state.useGeometricMean = true;
    } else if (mean === 'arith') {
      state.useGeometricMean = false;
    }
  }
}

/**
 * Convenience function that returns the subset of allValues whose keys exist in
 * the defaultValues but whose values differ from the defaultValues.
 */
export function trimDefaultStateMapping(
    allValues: URLSearchParams, defaultValues: URLSearchParams) {
  const values = new URLSearchParams();
  for (const [key, value] of allValues.entries()) {
    const defaultValue = defaultValues.get(key);
    if (defaultValue !== undefined && value !== defaultValue) {
      values.set(key, value);
    }
  }
  return values;
}
