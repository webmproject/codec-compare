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

import 'jasmine';

import {Batch, Field} from './entry';
import {Match} from './matcher';
import {computeStats, FieldMetric} from './metric';

function createData(leftValues: number[], rightValues: number[]):
    [Batch, Batch, Match[], FieldMetric[]] {
  const leftBatch = new Batch('url', 'path/to/left/folder');
  leftBatch.fields.push(new Field('field', 'description'));
  leftBatch.index = 0;
  const rightBatch = new Batch('url', 'path/to/right/folder');
  rightBatch.fields.push(new Field('field', 'description'));
  rightBatch.index = 1;
  const dataPoints: Match[] = [];
  for (let i = 0; i < leftValues.length; ++i) {
    leftBatch.rows.push([leftValues[i]]);
    rightBatch.rows.push([rightValues[i]]);
    dataPoints.push(new Match(i, i, /*cumulativeRelativeError=*/ 0));
  }
  const fieldMetric =
      new FieldMetric([/*leftFieldIndex=*/ 0, /*rightFieldIndex=*/ 0]);
  return [leftBatch, rightBatch, dataPoints, [fieldMetric]];
}

function createStats(leftValues: number[], rightValues: number[]) {
  const [leftBatch, rightBatch, dataPoints, metrics] =
      createData(leftValues, rightValues);
  return computeStats(leftBatch, rightBatch, dataPoints, metrics);
}

describe('computeStats', () => {
  it('computes identical ordered sets of values', () => {
    const stats = createStats([1, 2, 3], [1, 2, 3]);
    expect(stats).toBeDefined();
    expect(stats[0].geometricMean).toBe(1);
    expect(stats[0].minRatio).toBe(1);
    expect(stats[0].maxRatio).toBe(1);
  });

  it('computes identical unordered sets of values', () => {
    const stats = createStats([1, 2, 3], [3, 2, 1]);
    expect(stats).toBeDefined();
    expect(stats[0].geometricMean).toBe(1);
    expect(stats[0].minRatio).toBe(1 / 3);
    expect(stats[0].maxRatio).toBe(3 / 1);
  });

  it('handles zero', () => {
    const stats = createStats([1, 0, 1], [1, 1, 1]);
    expect(stats).toBeDefined();
    expect(stats[0].geometricMean).toBe(0);
    expect(stats[0].minRatio).toBe(0);
    expect(stats[0].maxRatio).toBe(1);
  });

  it('handles infinity', () => {
    const stats = createStats([1, 1, 1], [1, 0, 1]);
    expect(stats).toBeDefined();
    expect(stats[0].geometricMean).toBe(Infinity);
    expect(stats[0].minRatio).toBe(1);
    expect(stats[0].maxRatio).toBe(Infinity);
  });

  it('handles underflow', () => {
    const stats = createStats([1e-100, 1e-100, 1e-100], [1e100, 1e100, 1e100]);
    expect(stats).toBeDefined();
    // Precision is ~212 decimal places.
    expect(stats[0].geometricMean).toBeCloseTo(1e-200, 210);
    expect(stats[0].geometricMean).not.toBeCloseTo(1e-200, 220);
    expect(stats[0].minRatio).toBeCloseTo(1e-200, 210);
    expect(stats[0].maxRatio).toBeCloseTo(1e-200, 210);
  });

  it('handles overflow', () => {
    const stats = createStats([1e100, 1e100, 1e100], [1e-100, 1e-100, 1e-100]);
    expect(stats).toBeDefined();
    // Precision is lost in the right ~188 digits.
    expect(stats[0].geometricMean).toBeCloseTo(1e200, -190);
    expect(stats[0].geometricMean).not.toBeCloseTo(1e200, -180);
    expect(stats[0].minRatio).toBeCloseTo(1e200, -190);
    expect(stats[0].maxRatio).toBeCloseTo(1e200, -190);
  });
});
