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
import './batch_selections_ui';

import {Batch, Field} from './entry';
import {dispatch, EventType} from './events';
import {State} from './state';

describe('BatchSelectionsUi', () => {
  let state: State;
  let containerEl: HTMLDivElement;
  beforeEach(() => {
    // Create a few batches of made-up data.
    state = new State();
    state.batches = [
      new Batch('json/url', 'path/to/folder'),
      new Batch('json/url', 'path/to/folder'),
    ];
    for (const [batchIndex, batch] of state.batches.entries()) {
      batch.name = `batch${batchIndex}`;
      batch.fields.push(new Field('field A', 'used as match criterion'));
      batch.fields.push(new Field('field B', 'used as metric'));
      batch.rows.push(['it\'s a match', 1 + 1.2 * batchIndex]);
      for (const [fieldIndex, field] of batch.fields.entries()) {
        field.addValues(batch.rows, fieldIndex);
      }
    }
    state.initialize();
    state.matchers[0].enabled = true;
    state.metrics[0].enabled = true;
    state.initializePostUrlStateLoad();

    containerEl = document.createElement('div');
    document.body.appendChild(containerEl);
  });
  afterEach(() => {
    document.body.removeChild(containerEl);
  });

  it('displays stats', async () => {
    // Create an element displaying stats based on the state.
    const batchSelectionsEl = document.createElement('batch-selections-ui');
    batchSelectionsEl.state = state;
    containerEl.appendChild(batchSelectionsEl);
    await batchSelectionsEl.updateComplete;

    // Dig in the DOM to find the elements containing stat results.
    const expectStatsToBe = (expectedStats: string[]) => {
      const stats = batchSelectionsEl.shadowRoot?.querySelectorAll('.stat');
      expect(stats).toBeDefined();
      if (stats === undefined) return;

      expect(stats).toHaveSize(state.batches.length);
      expect(stats).toHaveSize(expectedStats.length);
      for (const [index, stat] of stats.entries()) {
        expect(stat).toBeInstanceOf(HTMLTableCellElement);
        if (stat instanceof HTMLTableCellElement &&
            index < expectedStats.length) {
          expect(stat.innerText).toBe(expectedStats[index]);
        }
      }
    };

    // No stat was computed yet.
    expectStatsToBe(['-', 'n/a']);

    // The first batch is used as the reference so there is no stat compared
    // with itself. The second batch is compared with the first batch based on
    // the values of the field used as a metric.
    expect(state.referenceBatchSelectionIndex).toBe(0);
    dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
    await batchSelectionsEl.updateComplete;
    expectStatsToBe(['-', '+120.0%']);

    // Swapping the reference leads to the opposite results.
    state.referenceBatchSelectionIndex = 1;
    dispatch(EventType.REFERENCE_CHANGED);
    await batchSelectionsEl.updateComplete;
    expectStatsToBe(['-54.5%', '-']);
  });
});
