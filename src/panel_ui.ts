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
import '@material/mwc-fab';
import '@material/mwc-menu';
import '@material/mwc-tab-bar';
import '@material/mwc-tab';
import './batch_name_ui';
import './batch_selection_ui';
import './batch_ui';
import './matches_ui';

import {ActionDetail} from '@material/mwc-list';
import {Menu} from '@material/mwc-menu';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {BatchSelection} from './batch_selection';
import {Batch} from './entry';
import {dispatch, EventType, listen} from './events';
import {State} from './state';
import {BatchTab} from './tab';

/** Component displaying the details of a batch. */
@customElement('panel-ui')
export class PanelUi extends LitElement {
  @property({attribute: false}) state!: State;
  /** Currently selected batch. */
  private batch?: Batch;
  private matchIndex: number|undefined = undefined;
  /** Currently displayed component. */
  private currentTab = BatchTab.METADATA;

  @query('#selectionMenu') private readonly selectionMenu!: Menu;

  override connectedCallback() {
    super.connectedCallback();
    listen(EventType.BATCH_INFO_REQUEST, (event) => {
      this.batch = this.state.batchSelections[event.detail.batchIndex].batch;
      this.currentTab = BatchTab.METADATA;
      this.style.display = 'block';
      this.requestUpdate();
    });
    listen(EventType.FILTERED_DATA_INFO_REQUEST, (event) => {
      this.batch = this.state.batchSelections[event.detail.batchIndex].batch;
      this.currentTab = BatchTab.FILTERS_AND_ROWS;
      this.style.display = 'block';
      this.requestUpdate();
    });
    listen(EventType.MATCHES_INFO_REQUEST, (event) => {
      this.batch = this.state.batchSelections[event.detail.batchIndex].batch;
      this.currentTab = BatchTab.MATCHES;
      this.style.display = 'block';
      this.requestUpdate();
    });
    listen(EventType.MATCH_INFO_REQUEST, (event) => {
      this.batch = this.state.batchSelections[event.detail.batchIndex].batch;
      this.matchIndex = event.detail.matchIndex;
      this.currentTab = BatchTab.MATCHES;
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
    const onSetAsReference = () => {
      this.state.referenceBatchSelectionIndex = batchIndex;
      dispatch(EventType.REFERENCE_CHANGED);
      this.requestUpdate();
    };

    const referenceSelection: BatchSelection =
        this.state.batchSelections[this.state.referenceBatchSelectionIndex];
    const reference: Batch = referenceSelection.batch;
    const batch: Batch = this.batch;
    const batchSelection: BatchSelection =
        this.state.batchSelections[this.batch.index];
    const batchIndex: number = this.batch.index;
    const activeIndex: number = this.currentTab;

    return html`
      <div id="background" @click=${onClose}></div>
      <div id="dialog" @click=${(e: Event) => {
      e.stopImmediatePropagation();
    }}>
        <div class="horizontalFlex">
          <h1 style="position: relative;">
            <mwc-button icon="arrow_drop_down" trailingIcon raised
              title="Change the batch to display details for"
              id="selectionButton" @click=${() => {
      this.selectionMenu.show();
    }}>
              <batch-name-ui .batch=${batch}></batch-name-ui>
            </mwc-button>
            <mwc-menu
              .anchor=${this.selectionMenu}
              corner="BOTTOM_LEFT"
              menuCorner="START"
              id="selectionMenu"
              @action=${(e: CustomEvent<ActionDetail>) => {
      this.batch = this.state.batches[e.detail.index];
      this.requestUpdate();
    }}>
              ${
        this.state.batches.map(
            (otherBatch) => html`
              <mwc-list-item ?activated=${otherBatch.index === batch.index}>
                <batch-name-ui .batch=${otherBatch}></batch-name-ui>
                ${
                otherBatch.index === this.state.referenceBatchSelectionIndex ?
                    html`<span class="referenceBatchChip">reference</span>` :
                    html``}
              </mwc-list-item>`)}
            </mwc-menu>
          </h1>

        ${
        batchIndex === this.state.referenceBatchSelectionIndex ?
            // disabled mwc-button title does not appear. Use a div.
            html`
          <div title="This batch is already the reference batch">
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
            @click=${onSetAsReference}>
          </mwc-button>
        `}
        </div>

        <mwc-tab-bar activeIndex=${activeIndex}
          @MDCTabBar:activated=${(event: CustomEvent<{index: number}>) => {
      if (event.detail.index === BatchTab.METADATA) {
        dispatch(EventType.BATCH_INFO_REQUEST, {batchIndex});
      } else if (event.detail.index === BatchTab.FILTERS_AND_ROWS) {
        dispatch(EventType.FILTERED_DATA_INFO_REQUEST, {batchIndex});
      } else if (event.detail.index === BatchTab.MATCHES) {
        dispatch(EventType.MATCHES_INFO_REQUEST, {batchIndex});
      }
    }}>
          <mwc-tab label="Metadata" icon="info" id="metadataTab"></mwc-tab>
          <mwc-tab label="Filters and rows" icon="filter_alt" id="rowsTab">
          </mwc-tab>
          <mwc-tab label="${
        batch.index === reference.index ? 'Rows' : 'Matches'}" icon="${
        batch.index === reference.index ?
            'photo_library' :
            'join_inner'}" id="matchesTab"></mwc-tab>
        </mwc-tab-bar>

        <batch-ui .state=${this.state} .batch=${batch}
          style=${activeIndex === BatchTab.METADATA ? '' : 'display: none'}>
        </batch-ui>
        <batch-selection-ui .state=${this.state}
          .batchSelection=${batchSelection}
          style=${
        activeIndex === BatchTab.FILTERS_AND_ROWS ? '' : 'display: none'}>
        </batch-selection-ui>
        <matches-ui .state=${this.state}
          .referenceSelection=${referenceSelection}
          .batchSelection=${batchSelection} .matchIndex=${this.matchIndex}
          style=${activeIndex === BatchTab.MATCHES ? '' : 'display: none'}>
        </matches-ui>

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

    mwc-tab-bar {
      background: var(--mdc-theme-surface);
    }

    #closeButton {
      position: absolute;
      top: 20px;
      right: 20px;
    }

    .horizontalFlex {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      gap: 10px;
    }
    h1 {
      color: var(--mdc-theme-text);
    }
    #selectionButton {
      margin: 0;
      pointer-events: auto;
      --mdc-theme-primary: white;
      --mdc-theme-on-primary: var(--mdc-theme-text);
      position: relative;
    }
    #selectionButton batch-name-ui {
      color: var(--mdc-theme-text);
      font-size: 20px;
      white-space: nowrap;
      text-transform: none;
    }
    .referenceBatchChip {
      background: var(--mdc-theme-primary);
      color: var(--mdc-theme-background);
      border-radius: 16px;
      padding: 2px 8px;
      font-size: 12px;
      margin-left: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'panel-ui': PanelUi;
  }
}
