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

import {Batch, Entry, Field, FieldId} from './entry';

/** Describes which rows from a selected Batch should be compared. */
export class FieldFilter {
  enabled = false;
  uniqueValues = new Set<string>();  // Set of kept values.
  rangeStart = 0;                    // Range of kept values.
  rangeEnd = 0;

  /**
   * Even if a filter is enabled, it may not change anything because it includes
   * all values. This function returns true if at least one value is excluded.
   */
  actuallyFiltersPointsOut(field: Field) {
    if (!this.enabled) return false;
    if (field.isNumber) {
      return this.rangeStart > field.rangeStart ||
          this.rangeEnd < field.rangeEnd;
    } else {
      return this.uniqueValues.size < field.uniqueValuesArray.length;
    }
  }
}

/** Arbitrarily enables some filters. */
export function enableDefaultFilters(batch: Batch, filters: FieldFilter[]) {
  // Pick the highest (usually meaning slowest) effort for best compression
  // results.
  const effortIndex =
      batch.fields.findIndex((field: Field) => field.id === FieldId.EFFORT);
  if (effortIndex !== -1) {
    const effortField = batch.fields[effortIndex];
    if (effortField.isInteger && effortField.uniqueValuesArray.length > 1) {
      const effortFilter = filters[effortIndex];
      effortFilter.enabled = true;
      effortFilter.rangeStart = effortFilter.rangeEnd;
    }
  }
}
