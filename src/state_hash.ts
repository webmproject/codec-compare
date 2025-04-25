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

import {Batch, DISTORTION_METRIC_FIELD_IDS, Field, FieldId} from './entry';
import {FieldFilter} from './filter';
import {selectPlotMetrics} from './metric';
import {State} from './state';
import {applyBase16Bitmask, getBase16Bitmask} from './utils';

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

  // Batch visibility.
  values.set(
      'shown',
      getBase16Bitmask(
          state.batchSelections.length,
          (elementIndex: number) =>
              state.batchSelections[elementIndex].isDisplayed));

  // Each field filter is stored as "off" if disabled, and as its range or set
  // of filtered values if enabled.
  for (const batchSelection of state.batchSelections) {
    for (const fieldFilter of batchSelection.fieldFilters) {
      const batch = batchSelection.batch;
      const field = batch.fields[fieldFilter.fieldIndex];
      // There may be collisions if names contain the character '-' such as
      // "batch-a"-"field" and "batch"-"a-field" but this should never happen in
      // practice.
      const key = `${batch.name}-${fieldFilter.fieldFilter.key(field)}`;
      values.set(key, fieldFilter.fieldFilter.serialize(field));
    }
  }

  for (const commonField of state.commonFields) {
    const key = commonField.filter.key(commonField.field);
    values.set(key, commonField.filter.serialize(commonField.field));
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

  function strOrOff(v: number, min_inclusive: number, max_exclusive: number) {
    return (v >= min_inclusive && v < max_exclusive) ? String(v) : 'off';
  }

  // Global settings.
  values.set('x_scale', state.horizontalLogScale ? 'log' : 'lin');
  values.set('y_scale', state.verticalLogScale ? 'log' : 'lin');
  values.set('x_error', strOrOff(state.verticalQuantile, 0, 0.5));
  values.set('y_error', strOrOff(state.horizontalQuantile, 0, 0.5));
  values.set('each_point', state.showEachPoint ? 'show' : 'hide');
  values.set('multimatch', state.matchRepeatedly ? 'on' : 'off');
  values.set('metrics', state.showRelativeRatios ? 'rel' : 'abs');
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

  const visibilities = values.get('shown');
  if (visibilities) {
    applyBase16Bitmask(
        visibilities, state.batchSelections.length,
        (elementIndex: number, on: boolean) => {
          state.batchSelections[elementIndex].isDisplayed = on;
        });
  }

  for (const batchSelection of state.batchSelections) {
    for (const fieldFilter of batchSelection.fieldFilters) {
      const batch = batchSelection.batch;
      const field = batch.fields[fieldFilter.fieldIndex];
      const value =
          values.get(`${batch.name}-${fieldFilter.fieldFilter.key(field)}`);
      if (value === null) continue;
      fieldFilter.fieldFilter.unserialize(field, value);
    }
  }

  for (const commonField of state.commonFields) {
    const value = values.get(commonField.filter.key(commonField.field));
    if (value === null) continue;
    commonField.filter.unserialize(commonField.field, value);
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

  const horizontalScale = values.get('x_scale');
  if (horizontalScale) {
    if (horizontalScale === 'log') {
      state.horizontalLogScale = true;
    } else if (horizontalScale === 'lin') {
      state.horizontalLogScale = false;
    }
  }

  const verticalScale = values.get('y_scale');
  if (verticalScale) {
    if (verticalScale === 'log') {
      state.verticalLogScale = true;
    } else if (verticalScale === 'lin') {
      state.verticalLogScale = false;
    }
  }

  const horizontalQuantile = values.get('x_error');
  if (horizontalQuantile) {
    if (horizontalQuantile === 'off') {
      state.horizontalQuantile = 0.5;
    } else if (!isNaN(Number(horizontalQuantile))) {
      state.horizontalQuantile = Number(horizontalQuantile);
    }
  }

  const verticalQuantile = values.get('y_error');
  if (verticalQuantile) {
    if (verticalQuantile === 'off') {
      state.verticalQuantile = 0.5;
    } else if (!isNaN(Number(verticalQuantile))) {
      state.verticalQuantile = Number(verticalQuantile);
    }
  }

  const eachPoint = values.get('each_point');
  if (eachPoint) {
    if (eachPoint === 'show') {
      state.showEachPoint = true;
    } else if (eachPoint === 'hide') {
      state.showEachPoint = false;
    }
  }

  const multimatch = values.get('multimatch');
  if (multimatch) {
    if (multimatch === 'on') {
      state.matchRepeatedly = true;
    } else if (multimatch === 'off') {
      state.matchRepeatedly = false;
    }
  }

  const metrics = values.get('metrics');
  if (metrics) {
    if (metrics === 'rel') {
      state.showRelativeRatios = true;
    } else if (metrics === 'abs') {
      state.showRelativeRatios = false;
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

/** Returns the hash part of the URL to a Rate-Distortion curve plot. */
export function getRdModeHash(
    state: State, batch: Batch, reference: Batch, rowIndex: number|undefined,
    currentHash: string) {
  // No distortion means no Rate-Distortion curve.
  if (state.batchesAreLikelyLossless) return undefined;

  const hash =
      new URLSearchParams(currentHash.length > 3 ? currentHash.slice(1) : '');

  // Disable all matchers.
  for (const matcher of state.matchers) {
    if (!matcher.enabled) continue;
    const field = batch.fields[matcher.fieldIndices[batch.index]];
    if (field.id === FieldId.SOURCE_IMAGE_NAME) {
      // This one is mandatory and handled by the RD mode.
    } else {
      hash.set('matcher_' + field.name, 'off');
    }
  }

  // Find the Rate and Distortion metrics.
  let rateField: Field|undefined = undefined;
  let distortionField: Field|undefined = undefined;
  function findRdFields(
      field: Field, rateField: Field|undefined,
      distortionField: Field|undefined): [Field|undefined, Field|undefined] {
    if (!field.isNumber) return [rateField, distortionField];
    if (field.rangeStart === field.rangeEnd)
      return [rateField, distortionField];
    // Favor bits-per-pixel but still accept byte counts.
    if (field.id === FieldId.ENCODED_BITS_PER_PIXEL) {
      rateField = field;
    } else if (field.id === FieldId.ENCODED_SIZE && rateField === undefined) {
      rateField = field;
    }
    // Arbitrarily favor the first encountered distortion metric.
    if (distortionField === undefined &&
        DISTORTION_METRIC_FIELD_IDS.includes(field.id)) {
      distortionField = field;
    }
    return [rateField, distortionField];
  }
  // Pick the fields used as enabled matchers if possible.
  for (const matcher of state.matchers) {
    if (matcher.enabled) {
      [rateField, distortionField] = findRdFields(
          batch.fields[matcher.fieldIndices[batch.index]], rateField,
          distortionField);
    }
  }
  // Look into the fields used as enabled metrics if necessary.
  for (const metric of state.metrics) {
    if (metric.enabled) {
      [rateField, distortionField] = findRdFields(
          batch.fields[metric.fieldIndices[batch.index]], rateField,
          distortionField);
    }
  }
  // Use any relevant field as a last resort.
  for (const field of batch.fields) {
    [rateField, distortionField] =
        findRdFields(field, rateField, distortionField);
  }
  if (rateField === undefined || distortionField === undefined) {
    return undefined;
  }
  // Enable the Rate and Distortion metrics.
  hash.set('metric_' + rateField.name, 'on');
  hash.set('metric_' + distortionField.name, 'on');

  if (rowIndex === undefined) {
    // Only display the selected batch.
    if (state.batchSelections.length <= 1) {
      hash.delete('shown');
    } else {
      hash.set(
          'shown',
          getBase16Bitmask(
              state.batchSelections.length, (i: number) => i === batch.index));
    }
  } else {
    // Only display the selected batch and the reference, if any.
    if (state.batchSelections.length <= 2) {
      hash.delete('shown');
    } else {
      hash.set(
          'shown',
          getBase16Bitmask(
              state.batchSelections.length,
              (i: number) => i === batch.index || i === reference.index));
    }
  }
  // Use the default reference because it has no impact in RD mode.
  hash.delete('ref');

  if (rowIndex !== undefined) {
    // Only display the selected image.
    const source_image = state.commonFields.find(
        (common) => common.field.id === FieldId.SOURCE_IMAGE_NAME);
    if (source_image === undefined) {
      return undefined;
    }
    if (source_image.field.uniqueValuesArray.length < 2) {
      hash.delete(source_image.field.name);
    } else {
      const source_image_name =
          batch.rows[rowIndex][source_image.fieldIndices[batch.index]];
      hash.set(
          source_image.field.name,
          getBase16Bitmask(
              source_image.field.uniqueValuesArray.length,
              (elementIndex: number) =>
                  source_image.field.uniqueValuesArray[elementIndex] ===
                  batch
                      .rows[rowIndex][source_image.fieldIndices[batch.index]]));
    }
  }

  // Enable settings that toggle the Rate-Distortion curve mode.
  hash.set('each_point', 'show');
  hash.set('metrics', 'abs');
  hash.set('multimatch', 'on');

  return hash.toString();
}
