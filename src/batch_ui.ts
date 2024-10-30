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

import '@material/mwc-fab';
import '@material/mwc-button';
import './batch_name_ui';
import './constants_table_ui';
import './fields_table_ui';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {Batch} from './entry';
import {dispatch, EventType, listen} from './events';
import {State} from './state';

/** Component displaying the details of a batch. */
@customElement('batch-ui')
export class BatchUi extends LitElement {
  @property({attribute: false}) state!: State;

  private batch?: Batch;

  override connectedCallback() {
    super.connectedCallback();
    listen(EventType.BATCH_INFO_REQUEST, (event) => {
      this.batch = this.state.batchSelections[event.detail.batchIndex].batch;
      this.style.display = 'block';
      this.requestUpdate();
    });
  }

  override render() {
    if (this.batch === undefined) return html``;

    const onClose = () => {
      this.batch = undefined;
      this.style.display = 'none';
      this.requestUpdate();
    };

    const refIndex = this.state.referenceBatchSelectionIndex;
    const batchIndex = this.batch.index;
    const onFilteredDataInfoRequest = () => {
      dispatch(EventType.FILTERED_DATA_INFO_REQUEST, {batchIndex});
      onClose();
    };
    const onSetAsReference = () => {
      this.state.referenceBatchSelectionIndex = batchIndex;
      dispatch(EventType.REFERENCE_CHANGED);
      this.requestUpdate();
    };
    const onMatchesInfoRequest = () => {
      dispatch(EventType.MATCHES_INFO_REQUEST, {batchIndex});
      onClose();
    };

    // Keep the batches in the same order.
    const minIndex = Math.min(refIndex, batchIndex);
    const maxIndex = Math.max(refIndex, batchIndex);
    const twoBatchLink = `?batch=${this.state.batches[minIndex].url}&batch=${
        this.state.batches[maxIndex].url}${window.location.hash}`;

    return html`
      <div id="background" @click=${onClose}></div>
      <div id="dialog">
        <h2>
          Metadata of <batch-name-ui .batch=${this.batch}></batch-name-ui>
        </h2>
        <constants-table-ui .batch=${this.batch}></constants-table-ui>

        <h2>
          Fields of <batch-name-ui .batch=${this.batch}></batch-name-ui>
        </h2>
        <fields-table-ui .batch=${this.batch}></fields-table-ui>

        <div class="buttons">
          <mwc-button
            raised
            icon="filter_alt"
            label="Filter rows"
            title="Selectively ignore data from this batch"
            @click=${onFilteredDataInfoRequest}>
          </mwc-button>

          <mwc-button
            id="showRows"
            raised
            icon="clear_all"
            label="Show rows"
            title="Display the data from this batch"
            @click=${onFilteredDataInfoRequest}>
          </mwc-button>

          ${
        batchIndex === refIndex ?
            // disabled mwc-button title does not appear. Use a div.
            html`
          <div title="This batch is already the reference batch"
            class="left-margin">
            <mwc-button
              raised
              icon="center_focus_strong"
              label="Set as reference"
              disabled>
            </mwc-button>
          </div>
        ` :
            html`
          <mwc-button
            raised
            icon="center_focus_weak"
            label="Set as reference"
            title="Use this batch as reference to compare other codecs with"
            @click=${onSetAsReference}
            class="left-margin">
          </mwc-button>
        `}

          ${
        batchIndex === refIndex ?
            // disabled mwc-button title does not appear. Use a div.
            html`
          <div title="The reference batch cannot be matched with itself">
            <mwc-button
              raised
              icon="join_inner"
              label="Show matches"
              disabled>
            </mwc-button>
          </div>
        ` :
            html`
          <mwc-button
            id="showMatches"
            raised
            icon="join_inner"
            label="Show matches"
            title="Display the matches between this batch and the reference batch"
            @click=${onMatchesInfoRequest}>
          </mwc-button>
        `}

          ${
        this.state.batches.length < 3 ?
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
        </div>

        <mwc-fab id="closeButton" icon="close" title="Close" @click=${onClose}>
        </mwc-fab>
      </div>`;
  }

  static override styles = css`
    :host {
      display: none;
      position: absolute;
      z-index: 5;
      left: 0;
      top: 0;
      bottom: 0;
      right: 0;
    }

    #background {
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.6);
    }

    #dialog {
      background-color: var(--mdc-theme-surface);
      position: absolute;
      left: 40px;
      top: 40px;
      bottom: 40px;
      right: 40px;
      padding: 20px;
      box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.2);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 20px;
      overflow: hidden;
    }

    #closeButton {
      position: absolute;
      top: 20px;
      right: 20px;
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'batch-ui': BatchUi;
  }
}
