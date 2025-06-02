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
import '@material/mwc-icon';
import './batch_name_ui';
import './match_image_ui';
import './matches_table_ui';

import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {BatchSelection} from './batch_selection';
import {EventType, listen} from './events';
import {MatchImageUi} from './match_image_ui';
import {State} from './state';
import {getRdModeHash} from './state_hash';

/**
 * Component displaying each Match between a given batch and the reference
 * batch.
 */
@customElement('matches-ui')
export class MatchesUi extends LitElement {
  @property({attribute: false}) state!: State;
  @property({attribute: false}) referenceSelection!: BatchSelection;
  @property({attribute: false}) batchSelection!: BatchSelection;
  @property({attribute: false}) matchIndex!: number|undefined;

  @query('match-image-ui') private readonly matchImageUi!: MatchImageUi;

  override connectedCallback() {
    super.connectedCallback();
    listen(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      // batchSelection and matchIndex may stay the same, while the underlying
      // data points changed, so this.matchImageUi could display the wrong
      // image. Explicitly update it in this case.
      this.matchImageUi.requestUpdate();
      this.requestUpdate();
    });
  }

  override render() {
    const rowIndex = this.matchIndex === undefined ?
        undefined :
        this.batchSelection.matchedDataPoints.rows[this.matchIndex].leftIndex;

    const rdModeHash = rowIndex === undefined ?
        undefined :
        getRdModeHash(
            this.state, this.batchSelection.batch,
            this.referenceSelection.batch, rowIndex, window.location.hash);

    return html`
      <div class="leftVerticalFlex">
        <div id="batchesHeader">
          <div id="matchChip">
            <mwc-icon>${
        this.batchSelection.batch.index ===
                this.referenceSelection.batch.index ?
            'photo_library' :
            'join_inner'}</mwc-icon>
            ${this.batchSelection.matchedDataPoints.rows.length}
          </div>
          <h2>
        ${
        this.batchSelection.batch.index ===
                this.referenceSelection.batch.index ?
            html`filtered data points` :
            html`matches with
            <batch-name-ui .batch=${this.referenceSelection.batch}>
            </batch-name-ui>`}
          </h2>
        </div>

        <matches-table-ui .state=${this.state}
          .referenceSelection=${this.referenceSelection}
          .batchSelection=${this.batchSelection} .matchIndex=${this.matchIndex}>
        </matches-table-ui>
      </div>

      <div class="rightVerticalFlex"
        style=${this.matchIndex !== undefined ? '' : 'display: none'}>
        <constants-table-ui
          .batch=${this.batchSelection.batch}
          .rowIndex=${rowIndex}>
        </constants-table-ui>
        ${rdModeHash === undefined ? html`` : html`
        <a href="#${rdModeHash}" target="_blank">
          <mwc-button
            raised
            icon="show_chart"
            label="Rate-Distortion"
            title="Display the Rate-Distortion curve containing this data point">
            <mwc-icon>open_in_new</mwc-icon>
          </mwc-button>
        </a>`}
        <match-image-ui .referenceSelection=${this.referenceSelection}
          .batchSelection=${this.batchSelection}
          .matchIndex=${this.matchIndex === undefined ? 0 : this.matchIndex}>
        </match-image-ui>
      </div>`;
  }

  static override styles = css`
    :host {
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      gap: 10px;
      overflow: hidden;
    }
    .leftVerticalFlex,
    .rightVerticalFlex {
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 10px;
      overflow: hidden;
    }
    .leftVerticalFlex {
      flex: 4;
      /* Prevents unnecessarily wide table but breaks scrollbars. */
      /* align-items: flex-start; */
    }
    .rightVerticalFlex {
      flex: 1;
      align-items: center;
    }

    #batchesHeader {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    #matchChip {
      padding: 0 15px;
      height: 40px;
      border-radius: 30px;
      background: var(--mdc-theme-primary);
      color: var(--mdc-theme-background);
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 20px;
    }

    h2 {
      margin: 0;
    }

    mwc-button mwc-icon {
      margin-left: 8px;
      font-size: 16px;
    }
  `;
}
