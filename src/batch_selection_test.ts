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

import {BatchSelection} from './batch_selection';
import {Batch, Field} from './entry';
import {dispatch, EventType} from './events';

describe('BatchSelection', () => {
  let batch: Batch;
  let selection: BatchSelection;
  beforeEach(() => {
    // Create a few columns and rows of made-up data.
    batch = new Batch('json/url', 'path/to/folder');
    batch.name = `batch`;
    batch.fields.push(new Field('original', 'image'));
    batch.fields.push(new Field('field', 'description'));
    batch.rows.push(['path/to/image', 3.14]);
    batch.rows.push(['path/to/image2', 5]);
    batch.rows.push(['path/to/image2', 4.5]);
    for (const [fieldIndex, field] of batch.fields.entries()) {
      field.addValues(batch.rows, fieldIndex);
    }
    expect(batch.fields[0].isNumber).toBeFalse();
    expect(batch.fields[1].isNumber).toBeTrue();

    selection = new BatchSelection(batch);
    selection.updateFilteredRows([]);
  });

  it('filters rows', () => {
    // FieldFilters are correctly set up but disabled by default.
    expect(selection.fieldFilters[0].enabled).toBeFalse();
    expect(selection.fieldFilters[0].uniqueValues).toEqual(new Set<string>([
      'path/to/image', 'path/to/image2'
    ]));
    expect(selection.fieldFilters[1].enabled).toBeFalse();
    expect(selection.fieldFilters[1].rangeStart).toBe(3.14);
    expect(selection.fieldFilters[1].rangeEnd).toBe(5);
    // All rows are available by default.
    expect(selection.filteredRowIndices).toEqual([0, 1, 2]);

    // Filter out one image.
    selection.fieldFilters[0].enabled = true;
    selection.fieldFilters[0].uniqueValues.delete('path/to/image');
    selection.updateFilteredRows([]);
    expect(selection.filteredRowIndices).toEqual([1, 2]);

    // Reduce the range of numeric values.
    selection.fieldFilters[1].enabled = true;
    selection.fieldFilters[1].rangeEnd = 4.6;
    selection.updateFilteredRows([]);
    expect(selection.filteredRowIndices).toEqual([2]);
  });
});
