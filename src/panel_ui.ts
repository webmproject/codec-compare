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
import '@material/web/fab/fab';
import '@material/web/menu/menu';
import '@material/web/menu/menu-item';
import '@material/web/tabs/tabs';
import '@material/web/tabs/secondary-tab';
import './batch_name_ui';
import './batch_selection_ui';
import './batch_ui';
import './matches_ui';
import '@material/web/icon/icon';

import {MdMenu} from '@material/web/menu/menu';
import {MenuItem} from '@material/web/menu/menu-item';
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

  @query('#selectionMenu') private readonly selectionMenu!: MdMenu;

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
    listen(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      // The index points to an element of a set that no longer exists.
      // Invalidate it. This should trickle down till MatchImageUi.
      this.matchIndex = undefined;
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
    const showRowsOnly = this.state.rdMode || batchIndex === reference.index;

    return html`
      <div id="background" @click=${onClose}></div>
      <div id="dialog" @click=${(e: Event) => {
      e.stopImmediatePropagation();
    }}>
        <div class="horizontalFlex">
          <h1 style="position: relative;">
            <md-filled-button raised trailing-icon
              id="selectionButton" @click=${() => {
      this.selectionMenu.open = !this.selectionMenu.open;
    }}>
              <batch-name-ui .batch=${batch}></batch-name-ui>
              <md-icon slot="icon">arrow_drop_down</md-icon>
            </md-filled-button>
            <md-menu
              anchor="selectionButton"
              id="selectionMenu">
              ${
        this.state.batches.map(
            (otherBatch) => html`
              <md-menu-item ?selected=${otherBatch.index === batch.index}
                @click=${() => {
              this.batch = otherBatch;
              this.requestUpdate();
            }}>
                <batch-name-ui .batch=${otherBatch}></batch-name-ui>
                ${
                (!this.state.rdMode &&
                 otherBatch.index === this.state.referenceBatchSelectionIndex) ?
                    html`<span class="referenceBatchChip">reference</span>` :
                    html``}
              </md-menu-item>`)}
            </md-menu>
          </h1>

        ${
        this.state.rdMode ?
            // Rate-Distortion curve mode does not use any batch as reference.
            '' :
            batchIndex === this.state.referenceBatchSelectionIndex ?
            // disabled md-filled-button title does not appear. Use a div.
                html`
          <div title="This batch is already the reference batch">
            <md-filled-button
              disabled>
              Set as reference
            </md-filled-button>
          </div>
        ` :
                html`
          <md-filled-button
            title="Use this batch as reference to compare other codecs with"
            @click=${onSetAsReference}>
            Set as reference
          </md-filled-button>
        `}
        </div>

        <md-tabs active-tab-index=${activeIndex}
          @change=${(event: CustomEvent) => {
      const activeTabIndex = (event.target as any).activeTabIndex;
      if (activeTabIndex === BatchTab.METADATA) {
        dispatch(EventType.BATCH_INFO_REQUEST, {batchIndex});
      } else if (activeTabIndex === BatchTab.FILTERS_AND_ROWS) {
        dispatch(EventType.FILTERED_DATA_INFO_REQUEST, {batchIndex});
      } else if (activeTabIndex === BatchTab.MATCHES) {
        dispatch(EventType.MATCHES_INFO_REQUEST, {batchIndex});
      }
    }}>
          <md-secondary-tab id="metadataTab">Metadata
            <md-icon slot="icon">info</md-icon>
          </md-secondary-tab>
          <md-secondary-tab id="rowsTab">Filters and rows
            <md-icon slot="icon">filter_alt</md-icon>
          </md-secondary-tab>
          <md-secondary-tab id="matchesTab">${showRowsOnly ? 'Rows' : 'Matches'}
            <md-icon slot="icon">${
        showRowsOnly ? 'photo_library' : 'join_inner'}</md-icon>
          </md-secondary-tab>
        </md-tabs>

        <batch-ui .state=${this.state} .batch=${batch}
          style=${activeIndex === BatchTab.METADATA ? '' : 'display: none'}>
        </batch-ui>
        <batch-selection-ui .state=${this.state}
          .batchSelection=${batchSelection}
          style=${
        activeIndex === BatchTab.FILTERS_AND_ROWS ? '' : 'display: none'}>
        </batch-selection-ui>
        <matches-ui .state=${this.state}
          .referenceSelection=${
        this.state.rdMode ? undefined : referenceSelection}
          .batchSelection=${batchSelection} .matchIndex=${this.matchIndex}
          style=${activeIndex === BatchTab.MATCHES ? '' : 'display: none'}>
        </matches-ui>

        <md-fab id="closeButton" title="Close" @click=${onClose}>
          <md-icon slot="icon">close</md-icon>
        </md-fab>
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
      background-color: var(--md-sys-color-surface);
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

    md-tabs {
      background: var(--md-sys-color-surface);
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
      color: var(--md-sys-color-text);
    }
    #selectionButton {
      margin: 0;
      pointer-events: auto;
      --md-sys-color-primary: var(--md-sys-color-background);
      --md-sys-color-on-primary: var(--md-sys-color-text);
      position: relative;
    }
    #selectionButton batch-name-ui {
      color: var(--md-sys-color-text);
      font-size: 20px;
      white-space: nowrap;
      text-transform: none;
    }
    #selectionMenu {
      --md-menu-item-one-line-container-height: 20px;
      --md-menu-item-top-space: 0;
      --md-menu-item-bottom-space: 0;
      white-space: nowrap;
    }
    .referenceBatchChip {
      background: var(--md-sys-color-secondary);
      color: var(--md-sys-color-background);
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
