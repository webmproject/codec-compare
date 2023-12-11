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
import {Batch, FieldId} from './entry';
import {dispatch, EventType, listen} from './events';
import {createMatchers, enableDefaultMatchers, FieldMatcher, getDataPointsSymmetric, isLossless} from './matcher';
import {computeStats, createMetrics, enableDefaultMetrics, FieldMetric, selectPlotMetrics} from './metric';

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

  /** If true, each match is shown on the plot as a small dot. */
  showEachMatch = true;

  /**
   * If true, the geometric mean is used to aggregate the matches.
   * If false, the arithmetic mean is used to aggregate the matches.
   */
  useGeometricMean = true;

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

    this.matchers = createMatchers(this.batches);
    if (this.matchers.filter((matcher) => matcher.enabled).length === 0) {
      enableDefaultMatchers(this.batches[0], this.matchers);
    }
    this.metrics = createMetrics(this.batches);
    if (this.metrics.filter((metric) => metric.enabled).length === 0) {
      enableDefaultMetrics(this.batches[0], this.metrics);
    }

    for (const batch of this.batches) {
      this.batchSelections.push(new BatchSelection(batch));
    }

    // Pick WebP at default speed if available, otherwise pick the first batch.
    const webpDefaultEffort =
        isLossless(this.batches[0], this.matchers) ? '6' : '4';  // -z / -m flag
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

    // It would be better to count the matches rather than the data points but
    // it is more important to have a default setting value right now, before
    // reading the URL arguments, which happens before finding the matches.
    const numDataPoints =
        this.batches.reduce((n, batch) => n + batch.rows.length, 0);
    if (numDataPoints > 50000) {
      this.showEachMatch = false;  // Avoids plot sluggishness by default.
    }

    const computeMatchesAndStats = (batchSelection: BatchSelection) => {
      const referenceBatchSelection =
          this.batchSelections[this.referenceBatchSelectionIndex];
      batchSelection.matchedDataPoints = getDataPointsSymmetric(
          batchSelection, referenceBatchSelection, this.matchers);
      batchSelection.stats = computeStats(
          batchSelection.batch, referenceBatchSelection.batch,
          batchSelection.matchedDataPoints.rows, this.metrics);
    };

    listen(EventType.FILTERED_DATA_CHANGED, (event) => {
      if (event.detail.batchIndex < 0 ||
          event.detail.batchIndex >= this.batchSelections.length) {
        return;
      }

      if (event.detail.batchIndex === this.referenceBatchSelectionIndex) {
        // Recompute everything because the reference batch changed.
        for (const batchSelection of this.batchSelections) {
          computeMatchesAndStats(batchSelection);
        }
      } else {
        // Only recompute the changed batch.
        computeMatchesAndStats(this.batchSelections[event.detail.batchIndex]);
      }
      dispatch(EventType.MATCHED_DATA_POINTS_CHANGED);
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

  /** Part of initialize() to be done once URL params were parsed. */
  initializePostUrlStateLoad() {
    [this.plotMetricHorizontal, this.plotMetricVertical] =
        selectPlotMetrics(this.batches[0], this.metrics);
    for (const batchSelection of this.batchSelections) {
      batchSelection.updateFilteredRows();
    }
  }
}
