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
import {applyBitmaskToStringArray, getBase16Bitmask} from './utils';

/** Describes which rows should be compared with another Batch. */
export abstract class FieldFilter {
  enabled = false;

  displayName(field: Field): string {
    return field.displayName;
  }

  /**
   * Even if a filter is enabled, it may not change anything because it includes
   * all values. This function returns true if at least one value is excluded.
   */
  abstract actuallyFiltersPointsOut(field: Field): boolean;

  /** Returns true if the value must be excluded from the comparison. */
  abstract filtersOut(row: Entry, value: string|number): boolean;

  /** Used for URL state synchronization. */
  key(field: Field): string {
    return field.name;
  }
  abstract serialize(field: Field): string;
  abstract unserialize(field: Field, value: string): void;

  /** Returns a string representation of the filter. */
  abstract toString(field: Field, short: boolean): string;
}

/**
 * Describes which rows from a specific Batch should be compared with another
 * Batch.
 */
export class FieldFilterWithIndex {
  constructor(public fieldFilter: FieldFilter, public fieldIndex: number) {}
}

/** FieldFilter implementation for a numeric range of filtered values. */
export abstract class FieldFilterRange extends FieldFilter {
  rangeStart = 0;  // Range of kept values.
  rangeEnd = 0;

  actuallyFiltersPointsOut(field: Field) {
    return this.rangeStart > field.rangeStart || this.rangeEnd < field.rangeEnd;
  }

  filtersOut(row: Entry, value: string|number): boolean {
    return value as number < this.rangeStart || value as number > this.rangeEnd;
  }

  serialize(field: Field): string {
    if (!this.enabled) return 'off';
    return `${this.rangeStart}..${this.rangeEnd}`;
  }
  unserialize(field: Field, value: string): void {
    if (value === 'off') {
      this.enabled = false;
    } else {
      const range = value.split('..');
      if (range.length !== 2) return;

      const rangeStart = Number(range[0]);
      const rangeEnd = Number(range[1]);
      if (!isFinite(rangeStart) || !isFinite(rangeEnd)) return;
      if (rangeStart > rangeEnd) return;

      this.enabled = true;
      this.rangeStart =
          Math.min(Math.max(field.rangeStart, rangeStart), field.rangeEnd);
      this.rangeEnd =
          Math.min(Math.max(field.rangeStart, rangeEnd), field.rangeEnd);
    }
  }
}
export class FieldFilterRangeFloat extends FieldFilterRange {
  toString(field: Field, short: boolean) {
    if (short) {
      return '[' + this.rangeStart.toFixed(1) + ':' + this.rangeEnd.toFixed(1) +
          ']';
    } else {
      if (this.rangeStart === this.rangeEnd) {
        return `${field.displayName} limited to ${this.rangeStart.toFixed(1)}`;
      }
      return `${field.displayName} limited to [${this.rangeStart.toFixed(1)}:${
          this.rangeEnd.toFixed(1)}]`;
    }
  }
}
export class FieldFilterRangeInteger extends FieldFilterRange {
  toString(field: Field, short: boolean) {
    if (short) {
      return '[' + this.rangeStart.toString() + ':' + this.rangeEnd.toString() +
          ']';
    } else {
      if (this.rangeStart === this.rangeEnd) {
        return `${field.displayName} limited to ${this.rangeStart}`;
      }
      return `${field.displayName} limited to [${this.rangeStart}:${
          this.rangeEnd}]`;
    }
  }
}

/** FieldFilter implementation for an exact string match set. */
export class FieldFilterStringSet extends FieldFilter {
  uniqueValues = new Set<string>();  // Set of kept values.

  actuallyFiltersPointsOut(field: Field) {
    return this.uniqueValues.size < field.uniqueValuesArray.length;
  }

  filtersOut(row: Entry, value: string|number): boolean {
    return !this.uniqueValues.has(value as string);
  }

  serialize(field: Field): string {
    if (!this.enabled) return 'off';
    // Serialize the bitset of filtered values as a hexadecimal string.
    // Listing the set of actual values verbatim would take too many
    // characters.
    return getBase16Bitmask(
        field.uniqueValuesArray.length,
        (elementIndex: number) =>
            this.uniqueValues.has(field.uniqueValuesArray[elementIndex]));
  }
  unserialize(field: Field, value: string) {
    if (value === 'off') {
      this.enabled = false;
    } else if (value.length === Math.ceil(field.uniqueValuesArray.length / 4)) {
      this.enabled = true;
      // Deserialize the hexadecimal string to a bitset of filtered values.
      applyBitmaskToStringArray(
          field.uniqueValuesArray, value, this.uniqueValues);
    }
  }

  toString(field: Field, short: boolean) {
    if (short) {
      return this.uniqueValues.size.toString() + '/' +
          field.uniqueValuesArray.length.toString();
    } else {
      if (this.uniqueValues.size === 1) {
        return `${field.displayName} limited to ${
            this.uniqueValues.values().next().value}`;
      }
      return `${field.displayName} limited`;
    }
  }
}

export function createFilter(field: Field): FieldFilter {
  if (field.isInteger) {
    const fieldFilter = new FieldFilterRangeInteger();
    fieldFilter.rangeStart = field.rangeStart;
    fieldFilter.rangeEnd = field.rangeEnd;
    return fieldFilter;
  } else if (field.isNumber) {
    const fieldFilter = new FieldFilterRangeFloat();
    fieldFilter.rangeStart = field.rangeStart;
    fieldFilter.rangeEnd = field.rangeEnd;
    return fieldFilter;
  } else {
    const fieldFilter = new FieldFilterStringSet();
    for (const value of field.uniqueValuesArray) {
      fieldFilter.uniqueValues.add(value);
    }
    return fieldFilter;
  }
}

/** Arbitrarily enables some filters. */
export function enableDefaultFilters(
    batch: Batch, filters: FieldFilterWithIndex[]) {
  // Pick the highest (usually meaning slowest) effort for best compression
  // results.
  const effortIndex =
      batch.fields.findIndex((field: Field) => field.id === FieldId.EFFORT);
  if (effortIndex !== -1) {
    const effortField = batch.fields[effortIndex];
    if (effortField.isInteger && effortField.uniqueValuesArray.length > 1) {
      const effortFilter = filters.find(
          (filter: FieldFilterWithIndex) => filter.fieldIndex === effortIndex);
      if (effortFilter !== undefined) {
        effortFilter.fieldFilter.enabled = true;
        (effortFilter.fieldFilter as FieldFilterRangeInteger).rangeStart =
            (effortFilter.fieldFilter as FieldFilterRangeInteger).rangeEnd;
      }
    }
  }
}
