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
import {getDataPoints, getDataPointsSymmetric, Match} from './matcher';
import {State} from './state';

describe('Matcher', () => {
  let state: State;
  beforeEach(() => {
    // Create a few batches of made-up data.
    state = new State();
    state.batches = [
      new Batch('json/url', 'path/to/folder'),
      new Batch('json/url', 'path/to/folder')
    ];
    for (const [batchIndex, batch] of state.batches.entries()) {
      batch.name = `batch${batchIndex}`;
      batch.fields.push(new Field('field A-something', 'exact match'));
      batch.fields.push(new Field('field B', 'is numeric'));
    }

    state.batches[0].rows.push(['value A-1', 6]);
    state.batches[0].rows.push(['value A-1', 1]);
    state.batches[0].rows.push(['value A-2', 8]);
    state.batches[0].rows.push(['value A-2', 1000]);
    state.batches[0].rows.push(['value A-3', 1]);

    state.batches[1].rows.push(['value A-1', 1]);
    state.batches[1].rows.push(['value A-1', 6]);
    state.batches[1].rows.push(['value A-2', 4]);
    state.batches[1].rows.push(['value A-2', 2000]);
    state.batches[1].rows.push(['value A-2', 2001]);
    state.batches[1].rows.push(['value A-Not3', 1.1]);

    for (const batch of state.batches) {
      for (const [fieldIndex, field] of batch.fields.entries()) {
        field.addValues(batch.rows, fieldIndex);
      }
    }
    state.initialize();
    state.matchers[0].enabled = true;   // field A
    state.matchers[1].enabled = true;   // field B
    state.matchers[1].tolerance = 0.5;  // [-50%:+100%]
    state.initializePostUrlStateLoad();
  });

  it('pairs rows', () => {
    const matches = getDataPoints(
        state.batchSelections[0], state.batchSelections[1], state.matchers,
        state.matchRepeatedly);
    expect(matches.rows).toEqual([
      // Match constructor arguments are:
      //   leftIndex (row index in batch 0), rightIndex (row index in batch 1),
      //   cumulativeRelativeError (aggregated relative diff of field B values)
      new Match(0, 1, 0),    // value A-1
      new Match(1, 0, 0),    // value A-1
      new Match(2, 2, 0.5),  // value A-2
      new Match(3, 3, 0.5)   // value A-2
    ]);
  });

  it('pairs rows with and without repetitions', () => {
    // Add rows that can be matched in multiple valid ways.
    state.batches[0].rows.push(['value A-1', 1]);
    state.batches[0].rows.push(['value A-1', 1]);
    for (const batchSelection of state.batchSelections) {
      batchSelection.updateFilteredRows(state.commonFields);
    }

    const repeatedMatches = getDataPoints(
        state.batchSelections[0], state.batchSelections[1], state.matchers,
        /*matchRepeatedly=*/ true);
    expect(repeatedMatches.rows).toEqual([
      new Match(0, 1, 0),    // value A-1
      new Match(1, 0, 0),    // value A-1
      new Match(2, 2, 0.5),  // value A-2
      new Match(3, 3, 0.5),  // value A-2
      new Match(5, 0, 0),    // value A-1
      new Match(6, 0, 0),    // value A-1
    ]);

    const matches = getDataPoints(
        state.batchSelections[0], state.batchSelections[1], state.matchers,
        /*matchRepeatedly=*/ false);
    expect(matches.rows).toEqual([
      new Match(0, 1, 0),    // value A-1
      new Match(1, 0, 0),    // value A-1
      new Match(2, 2, 0.5),  // value A-2
      new Match(3, 3, 0.5)   // value A-2
      // Other "value A-1" rows are left unmatched because all corresponding
      // rows in the reference batch were already used.
    ]);
  });

  it('pairs rows at most once each', () => {
    // Add rows that can be matched in multiple valid ways.
    state.batches[0].rows.push(['value A-10', 10]);
    state.batches[0].rows.push(['value A-10', 10]);
    state.batches[0].rows.push(['value A-11', 11]);
    state.batches[0].rows.push(['value A-11', 11]);
    state.batches[1].rows.push(['value A-10', 10]);
    state.batches[1].rows.push(['value A-11', 11]);
    state.batches[1].rows.push(['value A-11', 11]);
    state.batches[1].rows.push(['value A-11', 11]);
    for (const batchSelection of state.batchSelections) {
      batchSelection.updateFilteredRows(state.commonFields);
    }

    const matches = getDataPoints(
        state.batchSelections[0], state.batchSelections[1], state.matchers,
        state.matchRepeatedly);
    expect(matches.rows).toEqual([
      new Match(0, 1, 0),    // value A-1
      new Match(1, 0, 0),    // value A-1
      new Match(2, 2, 0.5),  // value A-2
      new Match(3, 3, 0.5),  // value A-2
      new Match(5, 6, 0),    // value A-10
      new Match(7, 7, 0),    // value A-11
      new Match(8, 8, 0)     // value A-11
    ]);
  });

  it('aggregates relative error', () => {
    const matches = getDataPoints(
        state.batchSelections[0], state.batchSelections[1], state.matchers,
        state.matchRepeatedly);
    expect(matches.averageRelativeError).toBe(0.25);
    expect(matches.maximumRelativeError).toBe(0.5);
  });

  it('pairs rows symmetrically', () => {
    // Add rows that can be matched in multiple valid ways with the same stats.
    state.batches[0].rows.push(['value A-4', 20]);
    state.batches[0].rows.push(['value A-4', 80]);
    state.batches[1].rows.push(['value A-4', 10]);
    state.batches[1].rows.push(['value A-4', 40]);
    for (const batchSelection of state.batchSelections) {
      batchSelection.updateFilteredRows(state.commonFields);
    }

    const matches = getDataPointsSymmetric(
        state.batchSelections[0], state.batchSelections[1], state.matchers,
        state.matchRepeatedly);
    const expected = getDataPointsSymmetric(
        state.batchSelections[1], state.batchSelections[0], state.matchers,
        state.matchRepeatedly);
    // Swap the row indices to expect switched batch inputs.
    for (const row of matches.rows) {
      [row.leftIndex, row.rightIndex] = [row.rightIndex, row.leftIndex];
    }
    expect(matches.rows).toEqual(jasmine.arrayWithExactContents(expected.rows));
    expect(matches.averageRelativeError).toBe(expected.averageRelativeError);
    expect(matches.maximumRelativeError).toBe(expected.maximumRelativeError);
  });

  it('limits the match count when too many comparisons', () => {
    // Add a lot of rows that can all be matched into pairs.
    for (let i = 1; i < 10000; i++) {
      state.batches[0].rows.push(['value A-∞', 123]);
      state.batches[1].rows.push(['value A-∞', 123]);
    }
    for (const batchSelection of state.batchSelections) {
      batchSelection.updateFilteredRows(state.commonFields);
    }

    const matches = getDataPoints(
        state.batchSelections[0], state.batchSelections[1], state.matchers,
        state.matchRepeatedly);
    expect(matches.limited).toBeTrue();
  });

  it('handles many rows that do not require many comparisons', () => {
    // Add a lot of rows that cannot all be matched in pairs.
    for (let i = 1; i < 10000; i++) {
      state.batches[0].rows.push([`value A-${i}`, 123]);
      state.batches[0].rows.push([`value A-${i}`, 123]);
      state.batches[1].rows.push([`value A-${i}`, 123]);
      state.batches[1].rows.push([`value A-${i}`, 123]);
    }
    for (const batchSelection of state.batchSelections) {
      batchSelection.updateFilteredRows(state.commonFields);
    }

    const matches = getDataPoints(
        state.batchSelections[0], state.batchSelections[1], state.matchers,
        state.matchRepeatedly);
    expect(matches.limited).toBeFalse();
  });
});
