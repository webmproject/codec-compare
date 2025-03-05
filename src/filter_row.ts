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
import {Batch, Entry, Field} from './entry';
import {FieldFilterWithIndex} from './filter';

function rowPassesFilter(
    batch: Batch, row: Entry, fieldFilters: FieldFilterWithIndex[],
    commonFields: CommonField[]): boolean {
  for (const filter of fieldFilters) {
    if (filter.fieldFilter.enabled &&
        filter.fieldFilter.filtersOut(row, row[filter.fieldIndex])) {
      return false;
    }
  }

  for (const commonField of commonFields) {
    if (!commonField.filter.enabled) {
      continue;
    }
    const fieldIndex = commonField.fieldIndices[batch.index];
    if (commonField.field.isNumber) {
      // commonField.field.isNumber can only be true if isNumber is true for
      // that field in all batches.
      if (commonField.filter.filtersOut(row, row[fieldIndex])) {
        return false;
      }
    } else {
      // No guarantee that the value is a string in all batches, hence the
      // conversion instead of a cast.
      if (commonField.filter.filtersOut(row, String(row[fieldIndex]))) {
        return false;
      }
    }
  }
  return true;
}

function forEachFilteredRow(
    batch: Batch, fieldFilters: FieldFilterWithIndex[],
    commonFields: CommonField[], effect: (rowIndex: number) => void) {
  for (let rowIndex = 0; rowIndex < batch.rows.length; ++rowIndex) {
    if (rowPassesFilter(
            batch, batch.rows[rowIndex], fieldFilters, commonFields)) {
      effect(rowIndex);
    }
  }
}

/** Returns the indices of the kept rows in a batch, given some fieldFilters. */
export function getFilteredRowIndices(
    batch: Batch, fieldFilters: FieldFilterWithIndex[],
    commonFields: CommonField[]): number[] {
  const filteredRowIndices: number[] = [];
  forEachFilteredRow(batch, fieldFilters, commonFields, (rowIndex: number) => {
    filteredRowIndices.push(rowIndex);
  });
  return filteredRowIndices;
}
