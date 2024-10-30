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
import {FieldFilter} from './filter';

function rowPassesFilter(
    batch: Batch, row: Entry, fieldFilters: FieldFilter[],
    commonFields: CommonField[]): boolean {
  for (let fieldIndex = 0; fieldIndex < row.length; ++fieldIndex) {
    const filter = fieldFilters[fieldIndex];
    if (!filter.enabled) {
      continue;
    }
    if (batch.fields[fieldIndex].isNumber) {
      const value = row[fieldIndex] as number;
      if (value < filter.rangeStart || value > filter.rangeEnd) {
        return false;
      }
    } else {
      if (!filter.uniqueValues.has(row[fieldIndex] as string)) {
        return false;
      }
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
      const value = row[fieldIndex] as number;
      if (value < commonField.filter.rangeStart ||
          value > commonField.filter.rangeEnd) {
        return false;
      }
    } else {
      // No guarantee that the value is a string in all batches, hence the
      // conversion instead of a cast.
      if (!commonField.filter.uniqueValues.has(String(row[fieldIndex]))) {
        return false;
      }
    }
  }
  return true;
}

function forEachFilteredRow(
    batch: Batch, fieldFilters: FieldFilter[], commonFields: CommonField[],
    effect: (rowIndex: number) => void) {
  for (let rowIndex = 0; rowIndex < batch.rows.length; ++rowIndex) {
    if (rowPassesFilter(
            batch, batch.rows[rowIndex], fieldFilters, commonFields)) {
      effect(rowIndex);
    }
  }
}

/** Returns the indices of the kept rows in a batch, given some fieldFilters. */
export function getFilteredRowIndices(
    batch: Batch, fieldFilters: FieldFilter[],
    commonFields: CommonField[]): number[] {
  const filteredRowIndices: number[] = [];
  forEachFilteredRow(batch, fieldFilters, commonFields, (rowIndex: number) => {
    filteredRowIndices.push(rowIndex);
  });
  return filteredRowIndices;
}
