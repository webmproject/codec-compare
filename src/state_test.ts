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
import {dispatch, EventType} from './events';
import {State} from './state';

describe('State', () => {
  let state: State;
  beforeEach(() => {
    // Create a few batches of made-up data.
    state = new State();
    state.batches = [
      new Batch('json/url', 'path/to/folder'),
      new Batch('json/url', 'path/to/folder'),
      new Batch('json/url', 'path/to/folder')
    ];
    for (const [batchIndex, batch] of state.batches.entries()) {
      batch.name = `batch${batchIndex}`;
      batch.fields.push(new Field('original', 'image'));
      batch.fields.push(new Field('field', 'description'));
      batch.rows.push(['path/to/image', 1 + 5 * batchIndex]);
      for (const [fieldIndex, field] of batch.fields.entries()) {
        field.addValues(batch.rows, fieldIndex);
      }
    }
    state.initialize();
    state.matchers[0].enabled = true;
    state.initializePostUrlStateLoad();
  });

  it('finds matches upon picking the batch used as reference', () => {
    expect(state.batchSelections.length).toBeGreaterThanOrEqual(2);
    state.referenceBatchSelectionIndex = 1;

    expect(state.batchSelections[0].matchedDataPoints.rows).toEqual([]);
    dispatch(EventType.REFERENCE_CHANGED);
    expect(state.batchSelections[0].matchedDataPoints.rows).not.toEqual([]);
  });

  it('finds matches upon enabling a metric', () => {
    expect(state.referenceBatchSelectionIndex).toBe(0);
    expect(state.metrics.length).toBeGreaterThanOrEqual(1);
    state.metrics[0].enabled = true;

    expect(state.batchSelections[1].matchedDataPoints.rows).toEqual([]);
    dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
    expect(state.batchSelections[1].matchedDataPoints.rows).not.toEqual([]);
  });

  it('computes stats', () => {
    expect(state.referenceBatchSelectionIndex).toBe(0);
    dispatch(EventType.FILTERED_DATA_CHANGED, {batchIndex: 0});

    expect(state.batchSelections[0].stats.length).toBe(1);
    expect(state.batchSelections[0].stats[0].absoluteArithmeticMean).toBe(1);

    expect(state.batchSelections[1].stats.length).toBe(1);
    expect(state.batchSelections[1].stats[0].absoluteArithmeticMean).toBe(6);
    expect(state.batchSelections[1].stats[0].geometricMean).toBe(6);
    expect(state.batchSelections[1].stats[0].relativeArithmeticMean).toBe(6);
  });

  it('computes stats only for batches that changed according to event', () => {
    expect(state.batchSelections.length).toBeGreaterThanOrEqual(3);
    expect(state.referenceBatchSelectionIndex).toBe(0);
    dispatch(EventType.FILTERED_DATA_CHANGED, {batchIndex: 0});

    expect(state.batchSelections[0].stats[0].absoluteArithmeticMean).toBe(1);

    expect(state.batchSelections[1].stats[0].absoluteArithmeticMean).toBe(6);
    expect(state.batchSelections[1].stats[0].geometricMean).toBeCloseTo(6);
    expect(state.batchSelections[1].stats[0].relativeArithmeticMean).toBe(6);
    expect(state.batchSelections[2].stats[0].absoluteArithmeticMean).toBe(11);
    expect(state.batchSelections[2].stats[0].geometricMean).toBeCloseTo(11);
    expect(state.batchSelections[2].stats[0].relativeArithmeticMean).toBe(11);

    // Change the data points of both batches.
    state.batches[1].rows[0][1] = 123;
    state.batches[2].rows[0][1] = 123;
    // Only notify the change of one batch.
    dispatch(EventType.FILTERED_DATA_CHANGED, {batchIndex: 1});
    // Only one stat changed.
    expect(state.batchSelections[1].stats[0].absoluteArithmeticMean).toBe(123);
    expect(state.batchSelections[1].stats[0].geometricMean).toBeCloseTo(123);
    expect(state.batchSelections[1].stats[0].relativeArithmeticMean).toBe(123);
    expect(state.batchSelections[2].stats[0].absoluteArithmeticMean).toBe(11);
    expect(state.batchSelections[2].stats[0].geometricMean).toBeCloseTo(11);
    expect(state.batchSelections[2].stats[0].relativeArithmeticMean).toBe(11);
  });

  it('dispatches an event back', () => {
    let dataPointsChanged = false;
    window.addEventListener(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      dataPointsChanged = true;
    });
    dispatch(EventType.REFERENCE_CHANGED);
    expect(dataPointsChanged).toBeTrue();
  });
});
