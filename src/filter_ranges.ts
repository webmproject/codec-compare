// Copyright 2025 Google LLC
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
import {FieldFilter, FieldFilterWithIndex} from './filter';

/**
 * For each row with its value of a first field in the first range of this
 * bucket, the row is filtered out if its value of a second field is outside the
 * second range of this bucket. Represented as a tuple for easy array creation
 * and assumed fast access.
 */
type FieldFilterRangesBucket = [
  /*BUCKET_MIN_INCLUSIVE=*/ number,
  /*BUCKET_MAX_EXCLUSIVE=*/ number,
  /*BUCKET_FILTER_MIN_INCLUSIVE=*/ number,
  /*BUCKET_FILTER_MAX_INCLUSIVE=*/ number
];
// Indices of the tuple elements in the FieldFilterRangesBucket type above.
export const BUCKET_MIN_INCLUSIVE = 0;
export const BUCKET_MAX_EXCLUSIVE = 1;
export const BUCKET_FILTER_MIN_INCLUSIVE = 2;
export const BUCKET_FILTER_MAX_INCLUSIVE = 3;

/**
 * FieldFilter implementation for a numeric range of filtered values depending
 * on the bucketed value of another field.
 */
export abstract class FieldFilterRanges extends FieldFilter {
  public readonly buckets: FieldFilterRangesBucket[];
  public readonly crossBucketMin: number;
  public readonly crossBucketMax: number;
  constructor(
      public readonly otherFieldIndex: number,
      public readonly otherFieldDisplayName: string) {
    super();
    this.buckets = this.getBuckets();
    this.crossBucketMin = this.buckets.reduce(
        (prev, curr) => prev[BUCKET_FILTER_MIN_INCLUSIVE] <
                curr[BUCKET_FILTER_MIN_INCLUSIVE] ?
            prev :
            curr)[BUCKET_FILTER_MIN_INCLUSIVE];
    this.crossBucketMax = this.buckets.reduce(
        (prev, curr) => prev[BUCKET_FILTER_MAX_INCLUSIVE] >
                curr[BUCKET_FILTER_MAX_INCLUSIVE] ?
            prev :
            curr)[BUCKET_FILTER_MAX_INCLUSIVE];
  }

  actuallyFiltersPointsOut(field: Field) {
    // Imprecise but faster than checking all values.
    return this.crossBucketMin > field.rangeStart ||
        this.crossBucketMax < field.rangeEnd;
  }

  protected abstract getBuckets(): FieldFilterRangesBucket[];
  protected abstract getBucketIndex(otherFieldValue: number): number;

  filtersOut(row: Entry, value: string|number): boolean {
    const fieldValueToFilter = value as number;
    const otherFieldValue = row[this.otherFieldIndex] as number;
    const bucketIndex = this.getBucketIndex(otherFieldValue);
    return fieldValueToFilter <
        this.buckets[bucketIndex][BUCKET_FILTER_MIN_INCLUSIVE] ||
        fieldValueToFilter >
        this.buckets[bucketIndex][BUCKET_FILTER_MAX_INCLUSIVE];
  }

  override key(field: Field): string {
    // Use a different key to avoid conflicts with other filters on the same
    // field.
    return `${field.name}_ranges`;
  }
  serialize(field: Field): string {
    if (!this.enabled) return 'off';
    return 'on';
  }
  unserialize(field: Field, value: string) {
    if (value === 'off') {
      this.enabled = false;
    } else {
      this.enabled = true;
    }
  }

  toString(field: Field, short: boolean) {
    if (short) {
      return '[' + this.crossBucketMin.toFixed(1) + ':' +
          this.crossBucketMax.toFixed(1) + ']';
    } else {
      return `${field.displayName} limited to [${
          this.crossBucketMin.toFixed(1)}:${this.crossBucketMax.toFixed(1)}]`;
    }
  }
}

export abstract class FieldFilterWebBpp extends FieldFilterRanges {
  constructor(megapixelsFieldIndex: number) {
    super(megapixelsFieldIndex, 'megapixels');
  }
  override displayName(field: Field): string {
    return 'Web bits-per-pixel';
  }

  getBucketIndex(megapixels: number): number {
    return megapixels <= 1 ?
        Math.max(0, Math.min(Math.ceil(megapixels * 10) - 1, 9)) :
        Math.max(10, Math.min(Math.ceil(megapixels) + 8, 22));
  }
}

export class FieldFilterWebBppJpeg extends FieldFilterWebBpp {
  // Minimum 10th and maximum 90th percentiles bpp values among Mobile and
  // Desktop images depending on megapixel range taken from
  // https://github.com/webmproject/codec-compare/wiki/Bits-per-pixel-of-Internet-images/750494dff5ca33f8bf1cc5beb468aaa2e4e66b8d#2024
  getBuckets(): FieldFilterRangesBucket[] {
    return [
      // MP, MP,  bpp,  bpp
      [0.0, 0.1, 1, 11.54],          // bucket 0
      [0.1, 0.2, 0.49, 6.6],         // bucket 1
      [0.2, 0.3, 0.6, 6.25],         // bucket 2
      [0.3, 0.4, 0.58, 5.88],        // bucket 3
      [0.4, 0.5, 0.57, 5.75],        // bucket 4
      [0.5, 0.6, 0.54, 5.53],        // bucket 5
      [0.6, 0.7, 0.44, 5.06],        // bucket 6
      [0.7, 0.8, 0.49, 4.97],        // bucket 7
      [0.8, 0.9, 0.45, 4.87],        // bucket 8
      [0.9, 1.0, 0.38, 4.78],        // bucket 9
      [1.0, 2.0, 0.37, 4.35],        // bucket 10
      [2.0, 3.0, 0.24, 3.81],        // bucket 11
      [3.0, 4.0, 0.18, 3.29],        // bucket 12
      [4.0, 5.0, 0.23, 2.87],        // bucket 13
      [5.0, 6.0, 0, 3.39],           // bucket 14
      [6.0, 7.0, 0.02, 3.46],        // bucket 15
      [7.0, 8.0, 0.23, 3.55],        // bucket 16
      [8.0, 9.0, 0.16, 3.48],        // bucket 17
      [9.0, 10.0, 0.18, 3.44],       // bucket 18
      [10.0, 11.0, 0.23, 3.68],      // bucket 19
      [11.0, 12.0, 0.19, 3.53],      // bucket 20
      [12.0, 13.0, 0.18, 3.27],      // bucket 21
      [13.0, Infinity, 0.16, 3.59],  // bucket 22
    ];
  }
}

export class FieldFilterWebBppWebp extends FieldFilterWebBpp {
  // Minimum 10th and maximum 90th percentiles bpp values among Mobile and
  // Desktop images depending on megapixel range taken from
  // https://github.com/webmproject/codec-compare/wiki/Bits-per-pixel-of-Internet-images/750494dff5ca33f8bf1cc5beb468aaa2e4e66b8d#2024
  getBuckets(): FieldFilterRangesBucket[] {
    return [
      // MP, MP,  bpp,  bpp
      [0.0, 0.1, 0.49, 10.36],       // bucket 0
      [0.1, 0.2, 0.28, 5.48],        // bucket 1
      [0.2, 0.3, 0.24, 2.77],        // bucket 2
      [0.3, 0.4, 0.25, 2.7],         // bucket 3
      [0.4, 0.5, 0.25, 2.61],        // bucket 4
      [0.5, 0.6, 0.23, 2.7],         // bucket 5
      [0.6, 0.7, 0.2, 2.11],         // bucket 6
      [0.7, 0.8, 0.23, 2.42],        // bucket 7
      [0.8, 0.9, 0.2, 2.26],         // bucket 8
      [0.9, 1.0, 0.2, 2.21],         // bucket 9
      [1.0, 2.0, 0.15, 1.92],        // bucket 10
      [2.0, 3.0, 0.12, 1.62],        // bucket 11
      [3.0, 4.0, 0.03, 1.41],        // bucket 12
      [4.0, 5.0, 0.06, 1.12],        // bucket 13
      [5.0, 6.0, 0.05, 1.11],        // bucket 14
      [6.0, 7.0, 0.05, 1.01],        // bucket 15
      [7.0, 8.0, 0.06, 1.2],         // bucket 16
      [8.0, 9.0, 0.06, 1.05],        // bucket 17
      [9.0, 10.0, 0.07, 1.08],       // bucket 18
      [10.0, 11.0, 0.05, 0.97],      // bucket 19
      [11.0, 12.0, 0.05, 0.98],      // bucket 20
      [12.0, 13.0, 0.08, 1.21],      // bucket 21
      [13.0, Infinity, 0.03, 0.75],  // bucket 22
    ];
  }
}

export class FieldFilterWebBppAvif extends FieldFilterWebBpp {
  // Minimum 10th and maximum 90th percentiles bpp values among Mobile and
  // Desktop images depending on megapixel range taken from
  // https://github.com/webmproject/codec-compare/wiki/Bits-per-pixel-of-Internet-images/750494dff5ca33f8bf1cc5beb468aaa2e4e66b8d#2024
  getBuckets(): FieldFilterRangesBucket[] {
    return [
      // MP, MP,  bpp,  bpp
      [0.0, 0.1, 0.58, 8.83],        // bucket 0
      [0.1, 0.2, 0.22, 2.16],        // bucket 1
      [0.2, 0.3, 0.2, 1.87],         // bucket 2
      [0.3, 0.4, 0.14, 1.62],        // bucket 3
      [0.4, 0.5, 0.14, 1.65],        // bucket 4
      [0.5, 0.6, 0.12, 1.6],         // bucket 5
      [0.6, 0.7, 0.13, 1.62],        // bucket 6
      [0.7, 0.8, 0.1, 1.42],         // bucket 7
      [0.8, 0.9, 0.09, 1.7],         // bucket 8
      [0.9, 1.0, 0.08, 1.56],        // bucket 9
      [1.0, 2.0, 0.07, 1.21],        // bucket 10
      [2.0, 3.0, 0.04, 1.26],        // bucket 11
      [3.0, 4.0, 0.01, 0.98],        // bucket 12
      [4.0, 5.0, 0.01, 0.92],        // bucket 13
      [5.0, 6.0, 0.01, 1.03],        // bucket 14
      [6.0, 7.0, 0.01, 0.89],        // bucket 15
      [7.0, 8.0, 0.02, 0.75],        // bucket 16
      [8.0, 9.0, 0.03, 0.91],        // bucket 17
      [9.0, 10.0, 0.03, 0.65],       // bucket 18
      [10.0, 11.0, 0.05, 0.84],      // bucket 19
      [11.0, 12.0, 0.05, 1.11],      // bucket 20
      [12.0, 13.0, 0.05, 1.11],      // bucket 21
      [13.0, Infinity, 0.01, 0.66],  // bucket 22
    ];
  }
}

export function tryCreateWebBppFilter(batch: Batch): FieldFilterWithIndex|
    undefined {
  // Only consider lossy batches, considered as such if there are multiple
  // encoding qualities.
  const qualityField =
      batch.fields.find((field) => field.id === FieldId.QUALITY);
  if (qualityField === undefined || qualityField.uniqueValuesArray.length < 2) {
    return undefined;
  }

  const bppFieldIndex = batch.fields.findIndex(
      (field) => field.id === FieldId.ENCODED_BITS_PER_PIXEL && field.isNumber);
  const otherFieldIndex = batch.fields.findIndex(
      (field) => field.id === FieldId.MEGAPIXELS && field.isNumber);
  if (bppFieldIndex === -1 || otherFieldIndex === -1) {
    return undefined;
  }

  const codec = batch.codec.toLowerCase();
  if (codec.includes('jpg') || codec.includes('jpeg')) {
    const fieldFilter = new FieldFilterWebBppJpeg(otherFieldIndex);
    return new FieldFilterWithIndex(fieldFilter, bppFieldIndex);
  }
  if (codec.includes('webp')) {
    const fieldFilter = new FieldFilterWebBppWebp(otherFieldIndex);
    return new FieldFilterWithIndex(fieldFilter, bppFieldIndex);
  }
  if (codec.includes('avif') && !codec.includes('avm')) {
    const fieldFilter = new FieldFilterWebBppAvif(otherFieldIndex);
    return new FieldFilterWithIndex(fieldFilter, bppFieldIndex);
  }

  return undefined;
}
