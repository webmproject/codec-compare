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
import {FieldFilterRangeFloat, FieldFilterStringSet} from './filter';
import {State} from './state';
import {applyMappingToState, stateToMapping, trimDefaultStateMapping} from './state_hash';

/** Returns a made-up State instance. */
function createState() {
  const state = new State();
  state.batches = [
    new Batch('json/url', 'path/to/folder'),
    new Batch('json/url', 'path/to/folder')
  ];
  for (const [batchIndex, batch] of state.batches.entries()) {
    batch.name = `batch${batchIndex}`;
    batch.fields.push(new Field('original', 'image'));
    batch.fields.push(new Field('field', 'description'));
    batch.rows.push(['path/to/image', batchIndex * 3.14]);
    for (const [fieldIndex, field] of batch.fields.entries()) {
      field.addValues(batch.rows, fieldIndex);
    }
  }
  state.initialize();
  state.initializePostUrlStateLoad();
  return state;
}

describe('stateToMapping', () => {
  let state: State;
  beforeEach(() => {
    state = createState();
  });

  it('detects state changes', () => {
    expect(stateToMapping(state).get('ref')).toBe('batch0');
    state.referenceBatchSelectionIndex = 1;
    expect(stateToMapping(state).get('ref')).toBe('batch1');
  });

  it('supports field filters', () => {
    expect(stateToMapping(state).get('batch0-original')).toBe('off');
    expect(stateToMapping(state).get('batch1-field')).toBe('off');
    state.batchSelections[0].fieldFilters[0].fieldFilter.enabled = true;
    state.batchSelections[1].fieldFilters[1].fieldFilter.enabled = true;
    expect(stateToMapping(state).get('batch0-original')).toBe('1');  // bitset
    expect(stateToMapping(state).get('batch1-field')).toBe('3.14..3.14');
  });

  it('outputs global settings', () => {
    expect(stateToMapping(state).get('each_point')).toBeDefined();
  });
});

describe('applyMappingToState', () => {
  let state: State;
  beforeEach(() => {
    state = createState();
  });

  it('keeps the state intact if all values are the default ones', () => {
    applyMappingToState(stateToMapping(state), state);
    expect(state).toEqual(createState());
  });

  it('changes the state if a value is not the default one', () => {
    const allValues = stateToMapping(state);
    expect(allValues.get('matcher_field')).toBe('off');
    allValues.set('matcher_field', '0.1');
    applyMappingToState(allValues, state);
    expect(state).not.toEqual(createState());
  });

  it('roundtrips', () => {
    const allValues = stateToMapping(state);
    expect(allValues.get('metric_field')).toBe('off');
    allValues.set('metric_field', 'on');
    applyMappingToState(allValues, state);
    expect(stateToMapping(state)).toEqual(allValues);
  });

  it('supports field filters', () => {
    const allValues = stateToMapping(state);
    const filter = state.batchSelections[0].fieldFilters[0].fieldFilter;
    expect(filter.enabled).toBeFalse();
    expect(filter).toBeInstanceOf(FieldFilterStringSet);
    expect((filter as FieldFilterStringSet).uniqueValues).toHaveSize(1);
    expect(stateToMapping(state).get('batch0-original')).toBe('off');
    allValues.set('batch0-original', '0');
    applyMappingToState(allValues, state);
    expect(filter.enabled).toBeTrue();
    expect((filter as FieldFilterStringSet).uniqueValues).toHaveSize(0);
  });
});

describe('trimDefaultStateMapping', () => {
  let state: State;
  beforeEach(() => {
    state = createState();
  });

  it('trims all default values', () => {
    const defaultValues = stateToMapping(state);
    const allValues = defaultValues;
    const nonDefaultValues = trimDefaultStateMapping(allValues, defaultValues);
    expect(nonDefaultValues.size).toBe(0);
  });

  it('trims only default values', () => {
    const defaultValues = stateToMapping(state);
    expect(state.useGeometricMean).toBeTrue();
    state.useGeometricMean = false;
    const allValues = stateToMapping(state);
    const nonDefaultValues = trimDefaultStateMapping(allValues, defaultValues);
    expect(nonDefaultValues.toString()).toBe('mean=arith');
  });
});

describe('State with many rows', () => {
  let state: State;
  beforeEach(() => {
    state = new State();
    state.batches = [
      new Batch('json/url', 'path/to/folder'),
      new Batch('json/url', 'path/to/folder')
    ];
    for (const [batchIndex, batch] of state.batches.entries()) {
      batch.name = `batch${batchIndex}`;
      batch.fields.push(new Field('field A', 'is a string'));
      batch.fields.push(new Field('field B', 'is a number'));
      for (let i = 0; i < 13; ++i) {
        batch.rows.push([`row${i}`, 1 + i + batchIndex * 0.1]);
      }
      for (const [fieldIndex, field] of batch.fields.entries()) {
        field.addValues(batch.rows, fieldIndex);
      }
    }
    state.initialize();
    state.initializePostUrlStateLoad();
  });

  it('serializes field filter sets', () => {
    expect(stateToMapping(state).get('batch0-field A')).toBe('off');
    const filter = state.batchSelections[0].fieldFilters[0].fieldFilter;
    filter.enabled = true;
    expect(filter).toBeInstanceOf(FieldFilterStringSet);
    (filter as FieldFilterStringSet).uniqueValues.delete('row7');
    (filter as FieldFilterStringSet).uniqueValues.delete('row12');
    // bitset serialized as hexadecimal string
    expect(stateToMapping(state).get('batch0-field A')).toBe('f7f0');
  });

  it('deserializes field filter sets', () => {
    const allValues = stateToMapping(state);
    allValues.set('batch0-field A', 'f7f0');
    applyMappingToState(allValues, state);
    const filter = state.batchSelections[0].fieldFilters[0].fieldFilter;
    expect(filter.enabled).toBeTrue();
    expect(filter).toBeInstanceOf(FieldFilterStringSet);
    expect((filter as FieldFilterStringSet).uniqueValues)
        .toEqual(new Set<string>([
          'row0', 'row1', 'row2', 'row3', 'row4', 'row5', 'row6', 'row8',
          'row9', 'row10', 'row11'
        ]));
  });

  it('serializes field filter ranges', () => {
    expect(stateToMapping(state).get('batch1-field B')).toBe('off');
    const filter = state.batchSelections[1].fieldFilters[1].fieldFilter;
    filter.enabled = true;
    expect(filter).toBeInstanceOf(FieldFilterRangeFloat);
    (filter as FieldFilterRangeFloat).rangeStart = 5;
    (filter as FieldFilterRangeFloat).rangeEnd = 10.1010101;
    expect(stateToMapping(state).get('batch1-field B')).toBe('5..10.1010101');
  });

  it('deserializes field filter ranges', () => {
    const allValues = stateToMapping(state);
    allValues.set('batch1-field B', '5..10.1010101');
    applyMappingToState(allValues, state);
    const filter = state.batchSelections[1].fieldFilters[1].fieldFilter;
    expect(filter.enabled).toBeTrue();
    expect(filter).toBeInstanceOf(FieldFilterRangeFloat);
    expect((filter as FieldFilterRangeFloat).rangeStart).toBe(5);
    expect((filter as FieldFilterRangeFloat).rangeEnd).toBe(10.1010101);
  });
});
