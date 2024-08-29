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

import '@material/mwc-icon';
import '@material/mwc-fab';
import '@material/mwc-switch';
import './filtered_images_ui';
import './filters_ui';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {dispatch, EventType, listen} from './events';
import {State} from './state';

/** Pop-up settings menu. */
@customElement('settings-ui')
export class SettingsUi extends LitElement {
  @property({attribute: false}) state!: State;

  override firstUpdated() {
    listen(EventType.SETTINGS_CHANGED, () => {
      this.requestUpdate();
    });
  }

  override render() {
    if (!this.state) return html``;
    const slownessWarning = 'warning: may cause graphical interface slowness';

    return html`
        <div class="settingGroup">
          <span title="Hide the matched pairs in the graph">
            Hide data points
          </span>
          <mwc-switch ?selected=${this.state.showEachMatch}
            @click=${() => {
      this.state.showEachMatch = !this.state.showEachMatch;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
      dispatch(EventType.SETTINGS_CHANGED);
    }}>
          </mwc-switch>
          <span title="Show each matched pair as a small dot in the graph (${
        slownessWarning})">
            Show data points
          </span>
        </div>
        <div class="settingGroup">
          <span title="Aggregate the metrics using the arithmetic mean of the values of the matched data points">
            Arithmetic mean
          </span>
          <mwc-switch ?selected=${this.state.useGeometricMean}
            @click=${() => {
      this.state.useGeometricMean = !this.state.useGeometricMean;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
      dispatch(EventType.SETTINGS_CHANGED);
    }}>
          </mwc-switch>
          <span title="Aggregate the metrics using the geometric mean of the ratios of the matched pairs">
            Geometric mean
          </span>
        </div>
        <div class="settingGroup">
          <span title="Only display the first rows of the filtered or matched data point tables">
            Show some rows
          </span>
          <mwc-switch ?selected=${this.state.showAllRows}
            @click=${() => {
      this.state.showAllRows = !this.state.showAllRows;
      dispatch(EventType.SETTINGS_CHANGED);
    }}>
          </mwc-switch>
          <span title="Display all rows of the filtered or matched data point tables (${
        slownessWarning})">
            Show all rows
          </span>
        </div>`;
  }

  static override styles = css`
    :host {
      margin-left: 70px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .settingGroup {
      display: flex;
      gap: 20px;
    }
  `;
}
