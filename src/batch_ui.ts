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

import '@material/mwc-button';
import './batch_name_ui';
import './constants_table_ui';
import './fields_table_ui';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {Batch} from './entry';
import {EventType, listen} from './events';
import {State} from './state';

/** Component displaying the details of a batch. */
@customElement('batch-ui')
export class BatchUi extends LitElement {
  @property({attribute: false}) state!: State;
  @property({attribute: false}) batch!: Batch;

  override connectedCallback() {
    super.connectedCallback();
    listen(EventType.REFERENCE_CHANGED, () => {
      this.requestUpdate();
    });
  }

  override render() {
    const refIndex = this.state.referenceBatchSelectionIndex;
    const batchIndex = this.batch.index;

    // Keep the batches in the same order.
    const minIndex = Math.min(refIndex, batchIndex);
    const maxIndex = Math.max(refIndex, batchIndex);
    const twoBatchLink = `?batch=${this.state.batches[minIndex].url}&batch=${
        this.state.batches[maxIndex].url}${window.location.hash}`;

    return html`
      <constants-table-ui .batch=${this.batch}></constants-table-ui>
      <fields-table-ui .batch=${this.batch}></fields-table-ui>

      <div class="buttons">
        <a href="${this.batch.url}" target="_blank">
          <mwc-button icon="download" raised
            label="Download batch"
            title="Download all unfiltered data points in JSON format">
          </mwc-button>
        </a>

        ${
        this.state.batches.length <= 2 ?
            html`` :
            batchIndex === refIndex ?
            // disabled mwc-button title does not appear. Use a div.
            html`
        <div title="Only available with another batch as reference">
          <mwc-button
            raised
            icon="filter_2"
            label="Two-batch view"
            disabled>
            <mwc-icon>open_in_new</mwc-icon>
          </mwc-button>
        </div>
      ` :
            html`
        <a href="${twoBatchLink}" target="_blank">
          <mwc-button
            raised
            icon="filter_2"
            label="Two-batch view"
            title="Compare only this batch and the reference batch">
            <mwc-icon>open_in_new</mwc-icon>
          </mwc-button>
        </a>
      `}
      </div>`;
  }

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 20px;
      overflow: hidden;
    }

    h2 {
      color: var(--mdc-theme-text);
      margin-bottom: 0;
    }

    constants-table-ui, fields-table-ui {
      overflow: auto;
    }

    .buttons {
      display: flex;
      flex-direction: row;
      justify-content: space-evenly;
      gap: 20px;
    }

    .left-margin {
      margin-left: auto;
    }

    mwc-icon {
      margin-left: 8px;
      font-size: 16px;
    }

    a {
      text-decoration: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'batch-ui': BatchUi;
  }
}
