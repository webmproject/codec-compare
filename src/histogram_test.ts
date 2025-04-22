// Copyright 2024 Google LLC
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

import {mergeHistograms} from './batch_merger';
import {BatchSelection} from './batch_selection';
import {Batch, Field, FieldId} from './entry';
import {FieldMatcher, getDataPointsSymmetric, Match} from './matcher';
import {computeHistogram} from './metric';

function createMyData(
    leftValues: number[], rightValues: number[]): [Batch, Batch, Match[]] {
  const leftBatch = new Batch('url', 'path/to/left/folder');
  leftBatch.fields.push(new Field('source image', 'description'));
  leftBatch.index = 0;
  const rightBatch = new Batch('url', 'path/to/right/folder');
  rightBatch.fields.push(new Field('source image', 'description'));
  rightBatch.index = 1;
  for (const value of leftValues) leftBatch.rows.push([value]);
  for (const value of rightValues) rightBatch.rows.push([value]);
  leftBatch.fields[0].addValues(leftBatch.rows, 0);
  rightBatch.fields[0].addValues(rightBatch.rows, 0);

  const leftBatchSelection = new BatchSelection(leftBatch);
  const rightBatchSelection = new BatchSelection(rightBatch);
  leftBatchSelection.updateFilteredRows([]);
  rightBatchSelection.updateFilteredRows([]);

  const matcher = new FieldMatcher([0, 0], 0);
  matcher.enabled = true;
  const dataPoints = getDataPointsSymmetric(
      leftBatchSelection, rightBatchSelection, [matcher],
      /*matchRepeatedly=*/ false);
  return [leftBatch, rightBatch, dataPoints.rows];
}

function createHistogram(leftValues: number[], rightValues: number[]) {
  const [leftBatch, unused, dataPoints] = createMyData(leftValues, rightValues);
  return computeHistogram(leftBatch, dataPoints);
}

describe('computeHistogram', () => {
  it('does not find source media', () => {
    const [leftBatch, unused, dataPoints] = createMyData([1, 2, 3], [1, 2, 3]);
    leftBatch.fields[0].id = FieldId.CUSTOM;
    expect(computeHistogram(leftBatch, dataPoints)).toHaveSize(0);
  });

  it('finds source media', () => {
    const histogram = createHistogram([1, 2, 3], [1, 2, 3]);
    expect(histogram).toHaveSize(3);
    for (const sourceCount of histogram) {
      expect(sourceCount.count).toBe(1);
    }
  });

  it('aggregates properly', () => {
    const histogram = createHistogram([81, 81, 81, 62], [81, 81, 23, 23]);
    expect(histogram).toHaveSize(2);
    expect(histogram[0].sourceName).toBe('81');
    expect(histogram[0].count).toBe(2);
    expect(histogram[1].sourceName).toBe('62');
    expect(histogram[1].count).toBe(0);  // 62 has no pair.
    // 23 is not part of the left batch.
  });
});

describe('mergeHistograms', () => {
  it('aggregates properly', () => {
    const histogram1 = createHistogram([1, 2, 3], [1, 2, 3]);
    const histogram2 = createHistogram([81, 81, 81, 62], [81, 81, 23, 23]);
    const histogram3 = createHistogram([81, 81, 81, 23], [81, 81, 23, 23]);
    const histogram = mergeHistograms([histogram1, histogram2, histogram3]);

    expect(histogram).toHaveSize(6);
    expect(histogram[0].sourceName).toBe('1');
    expect(histogram[0].count).toBe(1);
    expect(histogram[1].sourceName).toBe('2');
    expect(histogram[1].count).toBe(1);
    expect(histogram[2].sourceName).toBe('23');
    expect(histogram[2].count).toBe(1);
    expect(histogram[3].sourceName).toBe('3');
    expect(histogram[3].count).toBe(1);
    expect(histogram[4].sourceName).toBe('62');
    expect(histogram[4].count).toBe(0);
    expect(histogram[5].sourceName).toBe('81');
    expect(histogram[5].count).toBe(2 + 2);
  });
});
