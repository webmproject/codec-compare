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
import './batch_ui';
import './constants_table_ui';
import './fields_table_ui';
import './panel_ui';

import {Batch, Constant, Field} from './entry';
import {dispatch, EventType} from './events';
import {State} from './state';

describe('BatchUi', () => {
  let state: State;
  let containerEl: HTMLDivElement;
  beforeEach(() => {
    state = new State();
    // Create a few columns and rows of made-up data.
    const batch = new Batch('json/url', 'path/to/folder');
    batch.name = 'batch';
    batch.constants.push(
        new Constant('constant A', 'description A', 'value A'));
    batch.fields.push(new Field('field B', 'description B'));
    batch.rows.push([3.14]);
    batch.fields[0].addValues(batch.rows, /*fieldIndex=*/ 0);
    state.batches = [batch];
    state.initialize();

    containerEl = document.createElement('div');
    document.body.appendChild(containerEl);
  });
  afterEach(() => {
    document.body.removeChild(containerEl);
  });

  it('displays constants and fields', async () => {
    // Create an element displaying the metadata of a batch.
    const batchEl = document.createElement('batch-ui');
    batchEl.state = state;
    batchEl.batch = state.batches[0];
    containerEl.appendChild(batchEl);
    await batchEl.updateComplete;

    // Dig in the DOM to find the elements.
    const expectInnerTextsToBe =
        (element: Element, selectors: string, expectedInnerTexts: string[]) => {
          const elements = element.shadowRoot?.querySelectorAll(selectors);
          expect(elements).toBeDefined();
          if (elements === undefined) return;

          expect(elements).toHaveSize(expectedInnerTexts.length);
          for (const [index, element] of elements.entries()) {
            expect(element).toBeInstanceOf(HTMLElement);
            if (element instanceof HTMLElement &&
                index < expectedInnerTexts.length) {
              expect(element.innerText).toBe(expectedInnerTexts[index]);
            }
          }
        };

    // Check the child elements.
    const constantsEl = batchEl.shadowRoot?.querySelector('constants-table-ui');
    expect(constantsEl).toBeDefined();
    expect(constantsEl).not.toBeNull();
    if (constantsEl) {
      expectInnerTextsToBe(constantsEl, 'th', ['constant A']);
      expectInnerTextsToBe(constantsEl, 'td', ['description A', 'value A']);
    }

    const fieldsEl = batchEl.shadowRoot?.querySelector('fields-table-ui');
    expect(fieldsEl).toBeDefined();
    expect(fieldsEl).not.toBeNull();
    if (fieldsEl) {
      expectInnerTextsToBe(fieldsEl, 'th', ['field B']);
      expectInnerTextsToBe(fieldsEl, 'td', ['description B', '[3.14:3.14]']);
    }
  });
});
