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

import {dispatch, EventType} from './events';
import {State} from './state';

/** Pop-up settings menu. */
@customElement('settings-ui')
export class SettingsUi extends LitElement {
  @property({attribute: false}) state!: State;

  override render() {
    if (!this.state) return html``;

    return html`
        <div class="settingGroup">
          <span>Hide data points</span>
          <mwc-switch ?selected=${this.state.showEachMatch}
            @click=${() => {
      this.state.showEachMatch = !this.state.showEachMatch;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
      this.requestUpdate();
    }}>
          </mwc-switch>
          <span>Show data points</span>
        </div>
        <div class="settingGroup">
          <span>Arithmetic mean</span>
          <mwc-switch ?selected=${this.state.useGeometricMean}
            @click=${() => {
      this.state.useGeometricMean = !this.state.useGeometricMean;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
      this.requestUpdate();
    }}>
          </mwc-switch>
          <span>Geometric mean</span>
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
