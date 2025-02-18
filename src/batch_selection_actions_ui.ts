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

import '@material/mwc-icon-button';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {dispatch, EventType} from './events';
import {State} from './state';

/** The three vertical dots button and its menu. Displayed for each batch. */
@customElement('batch-selection-actions-ui')
export class BatchSelectionActionsUi extends LitElement {
  @property({attribute: false}) state!: State;
  /** Index of the BatchSelection this component is referring to. */
  @property() batchSelectionIndex!: number;
  /**
   * True if the BatchSelection this component is referring to is used as a
   * reference to compare other codecs against.
   */
  @property() isReference!: boolean;

  override render() {
    const batchSelection = this.state.batchSelections[this.batchSelectionIndex];
    return html`
      <span title="${batchSelection.isDisplayed ? 'Hide' : 'Show'}">
        <mwc-icon-button
          icon=${batchSelection.isDisplayed ? 'visibility' : 'visibility_off'}
          @click=${() => {
      batchSelection.isDisplayed = !batchSelection.isDisplayed;
      dispatch(EventType.MATCHED_DATA_POINTS_CHANGED);
      this.requestUpdate();
    }}>
        </mwc-icon-button>
      </span>
        `;
  }

  static override styles = css`
    mwc-icon-button {
      color: var(--mdc-theme-text);
      /* Make the background disk that appears when hovered slightly bigger
       * than the icon itself, which is 24px. */
      --mdc-icon-button-size: 28px;
      /* Tighten the buttons to save space. */
      margin: -2px;
    }
  `;
}
