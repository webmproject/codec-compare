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
import './filtered_images_ui';
import './filters_ui';

import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {BatchSelection} from './batch_selection';
import {dispatch, EventType, listen} from './events';
import {FilteredImagesUi} from './filtered_images_ui';
import {State} from './state';

/**
 * Component displaying one selected batch, its filters and filtered images.
 */
@customElement('batch-selection-ui')
export class BatchSelectionUi extends LitElement {
  @property({attribute: false}) state!: State;

  /** The selected batch. */
  private batchSelection: BatchSelection|undefined = undefined;

  @query('filtered-images-ui')
  private readonly filteredImagesUi: FilteredImagesUi|undefined;

  override connectedCallback() {
    super.connectedCallback();
    listen(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      this.filteredImagesUi?.requestUpdate();
    });
    listen(EventType.FILTERED_DATA_INFO_REQUEST, (event) => {
      this.batchSelection = this.state.batchSelections[event.detail.batchIndex];
      this.style.display = 'block';
      this.requestUpdate();
    });
  }

  override render() {
    if (!this.batchSelection) return html``;

    const onClose = () => {
      this.batchSelection = undefined;
      this.style.display = 'none';
      this.requestUpdate();
    };

    const batchIndex = this.batchSelection.batch.index;
    const onBatchInfoRequest = () => {
      dispatch(EventType.BATCH_INFO_REQUEST, {batchIndex});
      onClose();
    };
    const onMatchesInfoRequest = () => {
      dispatch(EventType.MATCHES_INFO_REQUEST, {batchIndex});
      onClose();
    };

    return html`
      <div id="background" @click=${onClose}></div>
      <div id="dialog" @click=${(e: Event) => {
      e.stopImmediatePropagation();
    }}>
        <div class="horizontalFlex">
          <filters-ui .state=${this.state}
            .batchSelection=${this.batchSelection}>
          </filters-ui>
          <filtered-images-ui .state=${this.state}
            .batchSelection=${this.batchSelection}>
          </filtered-images-ui>
        </div>

        <div class="buttons">
          <mwc-button
            raised
            icon="info"
            label="Show metadata"
            title="Display the details of the batch"
            @click=${onBatchInfoRequest}>
          </mwc-button>

          ${
        batchIndex === this.state.referenceBatchSelectionIndex ?
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
            raised
            icon="join_inner"
            label="Show matches"
            title="Display the matches between this batch and the reference batch"
            @click=${onMatchesInfoRequest}>
          </mwc-button>
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
      /* Rely on margin:auto for distributing the space. */
      justify-content: flex-start;
      gap: 20px;
      overflow: hidden;
    }

    #closeButton {
      position: absolute;
      top: 20px;
      right: 20px;
    }

    .horizontalFlex {
      display: flex;
      flex-direction: row;
      gap: 20px;
      overflow: hidden;
    }
    filters-ui,
    filtered-images-ui {
      /* Always show child scrollbars, even if the window is tiny. */
      min-height: 150px;
      max-height: 100%;
      flex: 1;
    }

    .buttons {
      display: flex;
      flex-direction: row;
      justify-content: space-evenly;
    }
  `;
}
