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

  /** Called when this component is made visible. */
  onOpen() {
    this.style.display = 'block';
    this.requestUpdate();
  }

  override render() {
    if (!this.state) return html``;

    const onClose = () => {
      this.style.display = 'none';
      this.requestUpdate();
    };

    return html`
      <div id="background" @click=${onClose}>
      </div>
      <div id="dialog" @click=${(e: Event) => {
      e.stopImmediatePropagation();
    }}>
        <mwc-fab id="closeButton" icon="close" title="Close" @click=${onClose}>
        </mwc-fab>
        <h2>Settings</h2>
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
        </div>
      </div>`;
  }

  static override styles = css`
    :host {
      display: none;
      position: absolute;
      z-index: 8;
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
      width: 520px;
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
      margin-left: auto;
    }

    .settingGroup {
      display: flex;
      gap: 20px;
      justify-content: center;
    }
  `;
}
