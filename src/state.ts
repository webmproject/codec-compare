// Copyright 2022 Google LLC
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

import {createGroups} from './batch_groups';
import {BatchSelection} from './batch_selection';
import {setColors} from './color_setter';
import {CommonField, createCommonFields} from './common_field';
import {Batch, DISTORTION_METRIC_FIELD_IDS, Field, FieldId} from './entry';
import {dispatch, EventType, listen} from './events';
import {enableDefaultFilters} from './filter';
import {createMatchers, enableDefaultMatchers, FieldMatcher, getDataPointsSymmetric} from './matcher';
import {computeHistogram, computeStats, createMetrics, enableDefaultMetrics, FieldMetric, selectPlotMetrics} from './metric';

/** The root data object containing the full state. */
export class State {
  /** All data imported with the EntryLoader. Sorted by date. */
  batches: Batch[] = [];

  /** Groups of batches sharing the same codec and version. */
  groups: number[][] = [];

  /**
   * Selected/filtered batches (~ codecs) to compare.
   * Note: There are as many batchSelections as batches. batchSelections are
   *       separate from batches because of past reasons and can be merged.
   */
  batchSelections: BatchSelection[] = [];
  referenceBatchSelectionIndex = -1;

  /** Fields common to all batches. */
  commonFields: CommonField[] = [];

  /**
   * Criteria to match each point from the referenceBatchSelection to each of
   * the other batchSelections.
   */
  matchers: FieldMatcher[] = [];

  /**
   * Which statistics to display on the matched data points from the
   * selectedBatches.
   */
  metrics: FieldMetric[] = [];
  plotMetricVertical: FieldMetric|undefined = undefined;    // among metrics
  plotMetricHorizontal: FieldMetric|undefined = undefined;  // among metrics
  verticalLogScale = true;     // Use a linear scale on the Y axis if false.
  horizontalLogScale = false;  // Use a linear scale on the X axis if false.
  verticalQuantile = 0.5;      // Display Y error bars if in [0:0.5[.
  horizontalQuantile = 0.5;    // Display X error bars if in [0:0.5[.

  /**
   * If true, each absolute data point or relative match is shown on the plot
   * as a small dot.
   */
  showEachPoint = true;

  /** If false, show absolute metrics. */
  showRelativeRatios = true;

  /**
   * If true, the geometric mean is used to aggregate the matches.
   * If false, the arithmetic mean is used to aggregate the matches.
   * Only applies if showRelativeRatios is true.
   */
  useGeometricMean = true;

  /** If true, each row is shown in the tables. NOT stored in URL params. */
  showAllRows = false;

  /** Deduced during initialize(). */
  batchesAreLikelyLossless = false;

  /** Sets all other fields up based on the contents of the batches field. */
  initialize() {
    if (this.batches.length === 0) return;

    for (let i = 0; i < this.batches.length; i++) {
      this.batches[i].index = i;

      // Make sure FieldIds are unique besides Custom.
      const uniqueFieldIds = new Set<FieldId>();
      for (const field of this.batches[i].fields) {
        if (field.id === FieldId.CUSTOM) continue;
        if (uniqueFieldIds.has(field.id)) {
          field.id = FieldId.CUSTOM;
        } else {
          uniqueFieldIds.add(field.id);
        }
      }
    }
    createGroups(this);
    setColors(this);

    this.commonFields = createCommonFields(this.batches);

    // If there is any input quality setting or distortion metric with multiple
    // values or with a value that looks not lossless, then the batch is likely
    // containing images compressed with loss.
    const anyBatchIsLossy =
        this.batches.some(batch => batch.fields.some(field => {
          if (field.id === FieldId.QUALITY) {
            // An input quality setting in [0:100[ is likely lossy.
            return field.isNumber &&
                (field.uniqueValuesArray.length > 1 ||
                 (field.rangeStart >= 0 && field.rangeStart < 100));
          }
          if (DISTORTION_METRIC_FIELD_IDS.includes(field.id)) {
            // A distortion metric with decimal values is likely lossy.
            return field.isNumber &&
                (field.uniqueValuesArray.length > 1 || !field.isInteger);
          }
          return false;
        }));
    this.batchesAreLikelyLossless = !anyBatchIsLossy;

    this.matchers = createMatchers(this.batches);
    if (this.matchers.filter((matcher) => matcher.enabled).length === 0) {
      enableDefaultMatchers(
          this.batches, this.batchesAreLikelyLossless, this.matchers);
    }
    this.metrics = createMetrics(this.batches);
    if (this.metrics.filter((metric) => metric.enabled).length === 0) {
      enableDefaultMetrics(this.batches[0], this.metrics);
    }

    for (const batch of this.batches) {
      const batchSelection = new BatchSelection(batch);
      enableDefaultFilters(batchSelection.batch, batchSelection.fieldFilters);
      this.batchSelections.push(batchSelection);
    }

    // Pick WebP at default speed if available, otherwise pick the first batch.
    const webpDefaultEffort =
        this.batchesAreLikelyLossless ? '6' : '4';  // -z / -m flag
    this.referenceBatchSelectionIndex = 0;
    for (let i = 0; i < this.batches.length; i++) {
      const codecName = this.batches[i].codec.toLowerCase();
      if (codecName.includes('webp') && !codecName.includes('webp2')) {
        const field =
            this.batches[i].fields.find((field) => field.id === FieldId.EFFORT);
        if (field !== undefined && field.uniqueValuesArray.length === 1 &&
            String(field.uniqueValuesArray[0]) === webpDefaultEffort) {
          this.referenceBatchSelectionIndex = i;
          break;
        }
      }
    }

    [this.plotMetricHorizontal, this.plotMetricVertical] =
        selectPlotMetrics(this.batches[0], this.metrics);

    if (this.batches.length > 2) {
      this.showEachPoint = false;  // Avoids visual confusion.
    } else {
      // It would be better to count the matches rather than the data points but
      // it is more important to have a default setting value right now, before
      // reading the URL arguments, which happens before finding the matches.
      const numDataPoints =
          this.batches.reduce((n, batch) => n + batch.rows.length, 0);
      if (numDataPoints > 50000) {
        this.showEachPoint = false;  // Avoids plot sluggishness by default.
      }
    }

    listen(EventType.FILTER_CHANGED, (event) => {
      if (event.detail.batchIndex === undefined) {
        // A common field filter changed.
        for (const batchSelection of this.batchSelections) {
          batchSelection.updateFilteredRows(this.commonFields);
        }
        dispatch(EventType.FILTERED_DATA_CHANGED, {batchIndex: undefined});
      } else if (event.detail.batchIndex < this.batchSelections.length) {
        // A specific batch changed.
        const batchSelection = this.batchSelections[event.detail.batchIndex];
        batchSelection.updateFilteredRows(this.commonFields);
        dispatch(
            EventType.FILTERED_DATA_CHANGED,
            {batchIndex: event.detail.batchIndex});
      }
    });

    const computeMatchesAndStats = (batchSelection: BatchSelection) => {
      const referenceBatchSelection =
          this.batchSelections[this.referenceBatchSelectionIndex];
      batchSelection.matchedDataPoints = getDataPointsSymmetric(
          batchSelection, referenceBatchSelection, this.matchers);
      batchSelection.stats = computeStats(
          batchSelection.batch, referenceBatchSelection.batch,
          batchSelection.matchedDataPoints.rows, this.metrics);
      batchSelection.histogram = computeHistogram(
          batchSelection.batch,
          // Avoid self-matches to be part of the asset usage counts.
          batchSelection.batch.index === this.referenceBatchSelectionIndex ?
              [] :
              batchSelection.matchedDataPoints.rows);
    };

    listen(EventType.FILTERED_DATA_CHANGED, (event) => {
      if (event.detail.batchIndex === undefined ||
          event.detail.batchIndex === this.referenceBatchSelectionIndex) {
        // Recompute everything because a common field filter or the reference
        // batch changed.
        for (const batchSelection of this.batchSelections) {
          computeMatchesAndStats(batchSelection);
        }
        dispatch(EventType.MATCHED_DATA_POINTS_CHANGED);
      } else if (event.detail.batchIndex < this.batchSelections.length) {
        // Only recompute the changed batch.
        computeMatchesAndStats(this.batchSelections[event.detail.batchIndex]);
        dispatch(EventType.MATCHED_DATA_POINTS_CHANGED);
      }
    });

    listen(EventType.REFERENCE_CHANGED, () => {
      for (const batchSelection of this.batchSelections) {
        computeMatchesAndStats(batchSelection);
      }
      dispatch(EventType.MATCHED_DATA_POINTS_CHANGED);
    });

    listen(EventType.MATCHER_OR_METRIC_CHANGED, () => {
      if (this.plotMetricHorizontal === undefined ||
          !this.plotMetricHorizontal.enabled) {
        this.plotMetricHorizontal =
            selectPlotMetrics(this.batches[0], this.metrics)[0];
      }
      if (this.plotMetricVertical === undefined ||
          !this.plotMetricVertical.enabled) {
        this.plotMetricVertical =
            selectPlotMetrics(this.batches[0], this.metrics)[1];
      }
      for (const batchSelection of this.batchSelections) {
        computeMatchesAndStats(batchSelection);
      }
      dispatch(EventType.MATCHED_DATA_POINTS_CHANGED);
    });
  }

  /**
   * Part of initialize() to be done once default URL parameters were recorded.
   */
  initializePostUrlStateDefaultValues() {
    // Reset the plot axis to undefined to see if loading the URL parameters
    // changes them.
    this.plotMetricHorizontal = undefined;
    this.plotMetricVertical = undefined;
  }

  /** Part of initialize() to be done once URL parameters were parsed. */
  initializePostUrlStateLoad() {
    // Adapt the default plot axis to the selected metrics, that may have
    // changed because of URL parameters. Only set the plot axis to their
    // default values if they were not explicitly set through URL parameters.
    const [plotMetricHorizontal, plotMetricVertical] =
        selectPlotMetrics(this.batches[0], this.metrics);
    if (this.plotMetricHorizontal === undefined) {
      this.plotMetricHorizontal = plotMetricHorizontal;
    }
    if (this.plotMetricVertical === undefined) {
      this.plotMetricVertical = plotMetricVertical;
    }

    for (const batchSelection of this.batchSelections) {
      batchSelection.updateFilteredRows(this.commonFields);
    }
  }
}
