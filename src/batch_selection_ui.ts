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
  @property({attribute: false}) batchSelection!: BatchSelection;

  @query('filtered-images-ui')
  private readonly filteredImagesUi: FilteredImagesUi|undefined;

  override connectedCallback() {
    super.connectedCallback();
    listen(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      this.filteredImagesUi?.requestUpdate();
    });
  }

  override render() {
    const batchIndex = this.batchSelection.batch.index;
    const onBatchInfoRequest = () => {
      dispatch(EventType.BATCH_INFO_REQUEST, {batchIndex});
    };
    const onMatchesInfoRequest = () => {
      dispatch(EventType.MATCHES_INFO_REQUEST, {batchIndex});
    };

    return html`
      <div class="horizontalFlex">
        <filters-ui .state=${this.state} .batchSelection=${this.batchSelection}>
        </filters-ui>
        <filtered-images-ui .state=${this.state}
          .batchSelection=${this.batchSelection}>
        </filtered-images-ui>
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
  `;
}
