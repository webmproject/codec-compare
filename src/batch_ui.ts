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

import '@material/web/button/filled-button';
import '@material/web/icon/icon';
import './batch_name_ui';
import './constants_table_ui';
import './fields_table_ui';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {Batch} from './entry';
import {EventType, listen} from './events';
import {State} from './state';
import {getRdModeHash} from './state_hash';

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
    // Remove any state that depends on batch indices.
    const stateHash = new URLSearchParams(
        window.location.hash.length > 3 ? window.location.hash.slice(1) : '');
    stateHash.delete('shown');
    const twoBatchLink = `?batch=${this.state.batches[minIndex].url}&batch=${
        this.state.batches[maxIndex].url}${
        stateHash.size > 0 ? `#${stateHash.toString()}` : ''}`;

    const rdModeHash = getRdModeHash(
        this.state, this.batch, this.batch, undefined, window.location.hash);

    return html`
      <constants-table-ui .batch=${this.batch}></constants-table-ui>
      <fields-table-ui .batch=${this.batch}></fields-table-ui>

      <div class="buttons">
        <a href="${this.batch.url}" target="_blank">
          <md-filled-button raised
            title="Download all unfiltered data points in JSON format">
            Download batch
            <md-icon slot="icon">download</md-icon>
          </md-filled-button>
        </a>

        ${
        this.state.batches.length <= 2 ?
            html`` :
            batchIndex === refIndex ?
            // disabled md-filled-button title does not appear. Use a div.
            html`
        <div title="Only available with another batch as reference">
          <md-filled-button class="md-button-with-md-icon"
            raised
            disabled>
            Two-batch view
            <md-icon class="md-icon-in-md-button">open_in_new</md-icon>
            <md-icon slot="icon">filter_2</md-icon>
          </md-filled-button>
        </div>
      ` :
            html`
        <a href="${twoBatchLink}" target="_blank">
          <md-filled-button class="md-button-with-md-icon"
            raised
            title="Compare only this batch and the reference batch">
            Two-batch view
            <md-icon class="md-icon-in-md-button">open_in_new</md-icon>
            <md-icon slot="icon">filter_2</md-icon>
          </md-filled-button>
        </a>
      `}

      ${rdModeHash === undefined ? html`` : html`
        <a href="#${rdModeHash}" target="_blank">
          <md-filled-button class="md-button-with-md-icon"
            raised
            title="Display the Rate-Distortion curves for this batch">
            Rate-Distortion
            <md-icon class="md-icon-in-md-button">open_in_new</md-icon>
            <md-icon slot="icon">stacked_line_chart</md-icon>
          </md-filled-button>
        </a>`}
      </div>`;
  }

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 10px;
      overflow: hidden;
    }

    h2 {
      color: var(--md-sys-color-text);
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
      margin-bottom: 8px;  /* Leave some room for the shadow. */
    }

    .left-margin {
      margin-left: auto;
    }

    .md-icon-in-md-button {
      margin-left: 8px;
      vertical-align: middle;
      --md-icon-size: 20px;
    }
    .md-button-with-md-icon {
      --md-filled-button-with-leading-icon-trailing-space: 16px;
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
