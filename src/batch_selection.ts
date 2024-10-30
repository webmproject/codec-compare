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

import {CommonField} from './common_field';
import {Batch} from './entry';
import {FieldFilter} from './filter';
import {getFilteredRowIndices} from './filter_row';
import {MatchedDataPoints} from './matcher';
import {FieldMetricStats, SourceCount} from './metric';

/** One Batch (~ codec experiment results) to compare with another. */
export class BatchSelection {
  /** The selected set of input raw data points. */
  batch: Batch;

  /**
   * How to filter these input raw data points into a subset that will be used
   * for the comparison.
   */
  fieldFilters: FieldFilter[] = [];  // As many as batch.fields.

  /** The indices of the rows. Each index refers to batch.rows[]. */
  filteredRowIndices: number[] = [];  // At most batch.rows.length.

  /** The data points matched against State.referenceBatchSelectionIndex. */
  matchedDataPoints = new MatchedDataPoints();

  /** The statistics to display. */
  stats: FieldMetricStats[] = [];  // As many as State.metrics.
  histogram: SourceCount[] = [];   // As many as distinct source media inputs.

  constructor(selectedBatch: Batch) {
    this.batch = selectedBatch;

    // Create the fieldFilters.
    for (const field of selectedBatch.fields) {
      const fieldFilter = new FieldFilter();
      fieldFilter.rangeStart = field.rangeStart;
      fieldFilter.rangeEnd = field.rangeEnd;
      if (!field.isNumber) {
        for (const value of field.uniqueValuesArray) {
          fieldFilter.uniqueValues.add(value);
        }
      }
      this.fieldFilters.push(fieldFilter);
    }
  }

  /** Updates the filteredRowIndices based on the batch and the fieldFilters. */
  updateFilteredRows(commonFields: CommonField[]) {
    this.filteredRowIndices =
        getFilteredRowIndices(this.batch, this.fieldFilters, commonFields);
  }
}
