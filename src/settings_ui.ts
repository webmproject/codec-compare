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
          <span title="Use a linear scale for the horizontal axis">
            Linear x axis
          </span>
          <mwc-switch id="settingHorizontalLogScale"
            ?selected=${this.state.horizontalLogScale} @click=${() => {
      this.state.horizontalLogScale = !this.state.horizontalLogScale;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
      dispatch(EventType.SETTINGS_CHANGED);
    }}>
          </mwc-switch>
          <span title="Use a logarithmic scale for the horizontal axis">
            Logarithmic x axis
          </span>
        </div>
        <div class="settingGroup">
          <span title="Use a linear scale for the vertical axis">
            Linear y axis
          </span>
          <mwc-switch id="settingVerticalLogScale"
            ?selected=${this.state.verticalLogScale} @click=${() => {
      this.state.verticalLogScale = !this.state.verticalLogScale;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
      dispatch(EventType.SETTINGS_CHANGED);
    }}>
          </mwc-switch>
          <span title="Use a logarithmic scale for the vertical axis">
            Logarithmic y axis
          </span>
        </div>
        <div class="settingGroup">
          <span title="Hide the individual data points in the graph">
            Hide data points
          </span>
          <mwc-switch id="settingShowEachPoint"
            ?selected=${this.state.showEachPoint} @click=${() => {
      this.state.showEachPoint = !this.state.showEachPoint;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
      dispatch(EventType.SETTINGS_CHANGED);
    }}>
          </mwc-switch>
          <span title="Show each individual data point as a small dot in the graph (${
        slownessWarning})">
            Show data points
          </span>
        </div>
        <div class="settingGroup">
          <span title="Multiple data points from the same batch cannot be matched with the same data point from the reference batch">
            Match set
          </span>
          <mwc-switch id="settingMatchRepeatedly"
            ?selected=${this.state.matchRepeatedly} @click=${() => {
      this.state.matchRepeatedly = !this.state.matchRepeatedly;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
      dispatch(EventType.SETTINGS_CHANGED);
    }}>
          </mwc-switch>
          <span title="Multiple data points from the same batch can be matched with the same data point from the reference batch">
            Match multiset
          </span>
        </div>
        <div class="settingGroup">
          <span title="Display the absolute values of the data points">
            Absolute metrics
          </span>
          <mwc-switch id="settingShowRelativeRatios"
            ?selected=${this.state.showRelativeRatios} @click=${() => {
      this.state.showRelativeRatios = !this.state.showRelativeRatios;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
      dispatch(EventType.SETTINGS_CHANGED);
    }}>
          </mwc-switch>
          <span title="Display the relative ratios of the matched pairs">
            Relative ratios
          </span>
        </div>
        <div class="settingGroup">
          <span title="Aggregate the metrics using the arithmetic mean of the values of the data points">
            Arithmetic mean
          </span>
          <mwc-switch id="settingUseGeometricMean" ?selected=${
        this.state.showRelativeRatios && this.state.useGeometricMean}
            ?disabled=${!this.state.showRelativeRatios}
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
          <span title="Do not show horizontal error bars">
            Hide X error bars
          </span>
          <mwc-switch id="settingUseHorizontalErrorBars" ?selected=${
    !this.state.showRelativeRatios && !this.state.useGeometricMean &&
        this.state.horizontalQuantile === 0.1}
            ?disabled=${
        this.state.showRelativeRatios ||
        this.state.useGeometricMean}
            @click=${() => {
      this.state.horizontalQuantile =
          this.state.horizontalQuantile === 0.1 ? 0.5 : 0.1;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
      dispatch(EventType.SETTINGS_CHANGED);
    }}>
          </mwc-switch>
          <span title="Display the 10th and 90th percentiles as horizontal error bars">
            Show X error bars
          </span>
        </div>
        <div class="settingGroup">
          <span title="Do not show vertical error bars">
            Hide Y error bars
          </span>
          <mwc-switch id="settingUseVerticalErrorBars" ?selected=${
    !this.state.showRelativeRatios && !this.state.useGeometricMean &&
        this.state.verticalQuantile === 0.1}
            ?disabled=${
        this.state.showRelativeRatios ||
        this.state.useGeometricMean}
            @click=${() => {
      this.state.verticalQuantile =
          this.state.verticalQuantile === 0.1 ? 0.5 : 0.1;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
      dispatch(EventType.SETTINGS_CHANGED);
    }}>
          </mwc-switch>
          <span title="Display the 10th and 90th percentiles as vertical error bars">
            Show Y error bars
          </span>
        </div>
        <div class="settingGroup">
          <span title="Only display a few rows of the data point tables">
            Show some rows
          </span>
          <mwc-switch id="settingShowAllRows"
            ?selected=${this.state.showAllRows} @click=${() => {
      this.state.showAllRows = !this.state.showAllRows;
      dispatch(EventType.SETTINGS_CHANGED);
    }}>
          </mwc-switch>
          <span title="Display all rows of the data point tables (${
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
      gap: 10px;
    }

    .settingGroup {
      display: flex;
      gap: 20px;
    }
  `;
}
