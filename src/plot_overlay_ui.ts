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
import '@material/web/menu/menu';
import '@material/web/menu/menu-item';
import '@material/web/icon/icon';

import {MdFilledButton} from '@material/web/button/filled-button';
import {MdMenu} from '@material/web/menu/menu';
import {MenuItem} from '@material/web/menu/menu-item';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {DISTORTION_METRIC_FIELD_IDS, FieldId} from './entry';
import {dispatch, EventType} from './events';
import {FieldMetric} from './metric';
import {State} from './state';

function fieldIdToString(id: FieldId) {
  if (id === FieldId.PSNR) return 'worse looking';
  if (id === FieldId.SSIM) return 'worse looking';
  if (id === FieldId.DSSIM) return 'better looking';
  if (id === FieldId.MSSSIM) return 'worse looking';
  if (id === FieldId.BUTTERAUGLI) return 'better looking';
  if (id === FieldId.SSIMULACRA) return 'better looking';
  if (id === FieldId.SSIMULACRA2) return 'worse looking';
  if (id === FieldId.CIEDE2000) return 'worse looking';
  if (id === FieldId.FLIP) return 'better looking';
  if (id === FieldId.LPIPS) return 'better looking';
  if (id === FieldId.P3NORM) return 'better looking';
  if (DISTORTION_METRIC_FIELD_IDS.includes(id))
    return null;  // Should not happen.
  if (id === FieldId.ENCODED_SIZE) return 'smaller file';
  if (id === FieldId.ENCODING_DURATION) return 'faster encoding';
  if (id === FieldId.DECODING_DURATION) return 'faster decoding';
  if (id === FieldId.RAW_DECODING_DURATION) return 'faster raw decoding';
  return null;
}

/** Plot overlay displaying clarifying arrows next to the axis. */
@customElement('plot-overlay-ui')
export class PlotOverlayUi extends LitElement {
  @property({attribute: false}) state: State|undefined = undefined;

  @query('#verticalMenu') private readonly verticalMenu!: MdMenu;
  @query('#verticalButton') private readonly verticalButton!: MdFilledButton;
  @query('#horizontalMenu') private readonly horizontalMenu!: MdMenu;
  @query('#horizontalButton')
  private readonly horizontalButton!: MdFilledButton;

  override render() {
    let verticalFieldIndex = -1;
    let verticalString = 'Custom';
    let verticalTitle = 'Unknown axis';
    if (this.state?.plotMetricVertical !== undefined) {
      verticalFieldIndex = this.state.plotMetricVertical.fieldIndices[0];
      const field = this.state.batches[0].fields[verticalFieldIndex];
      verticalString = fieldIdToString(field.id) ?? field.displayName;
      verticalTitle = `${field.displayName} (click to change)`;
    }

    let horizontalFieldIndex = -1;
    let horizontalString = 'Custom';
    let horizontalTitle = 'Unknown axis';
    if (this.state?.plotMetricHorizontal !== undefined) {
      horizontalFieldIndex = this.state.plotMetricHorizontal.fieldIndices[0];
      const field = this.state.batches[0].fields[horizontalFieldIndex];
      horizontalString = fieldIdToString(field.id) ?? field.displayName;
      horizontalTitle = `${field.displayName} (click to change)`;
    }

    const enabledMetrics: FieldMetric[] = [];
    if (this.state !== undefined) {
      for (const metric of this.state.metrics) {
        if (!metric.enabled) continue;
        enabledMetrics.push(metric);
      }
    }

    return html`
      <div id="vertical">
        <div style="position: relative;">
          <md-filled-button title="${verticalTitle}" trailing-icon
            id="verticalButton" @click=${() => {
      this.verticalMenu.open = !this.verticalMenu.open;
    }}>
            <md-icon slot="icon">arrow_forward</md-icon>
            <span>${verticalString}</span>
          </md-filled-button>
          <md-menu
            anchor="verticalButton"
            positioning="popover"
            anchor-corner="start-end"
            menu-corner="start-start"
            id="verticalMenu">
            ${
        enabledMetrics.map(
            (metric) => html`
            <md-menu-item ?selected=${
                metric.fieldIndices[0] === verticalFieldIndex}
            @click=${() => {
              this.state!.plotMetricVertical = metric;
              console.log(this.state!.plotMetricVertical);
              dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
            }}>
              ${
                this.state!.batches[0]
                    .fields[metric.fieldIndices[0]]
                    .displayName}
            </md-menu-item>`)}
          </md-menu>
        </div>
      </div>
      <div id="horizontal">
        <div style="position: relative;">
          <md-filled-button title="${horizontalTitle}"
            id="horizontalButton" @click=${() => {
      this.horizontalMenu.open = !this.horizontalMenu.open;
    }}>
            <md-icon slot="icon">arrow_back</md-icon>
            <span>${horizontalString}</span>
          </md-filled-button>
          <md-menu
            anchor="horizontalButton"
            positioning="popover"
            id="horizontalMenu">
            ${
        enabledMetrics.map(
            (metric) => html`
            <md-menu-item ?selected=${
                metric.fieldIndices[0] === horizontalFieldIndex}
            @click=${() => {
              this.state!.plotMetricHorizontal = metric;
              dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
            }}>
              ${
                this.state!.batches[0]
                    .fields[metric.fieldIndices[0]]
                    .displayName}
            </md-menu-item>`)}
          </md-menu>
        </div>
      </div>`;
  }

  static override styles = css`
    :host {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: 1;
      /* Let the user interact with the plot below this element. */
      pointer-events: none;
    }

    #vertical, #horizontal {
      position: absolute;
      bottom: 0;
      left: 0;
      /* Cover plot axis names but keep them for built-in PNG export. */
      background: white;
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: auto;
    }
    #vertical {
      top: 0;
      width: 45px;
    }
    #horizontal {
      right: 0;
      height: 45px;
    }

    #verticalButton,
    #horizontalButton {
      margin: 0;
      pointer-events: auto;
      --md-sys-color-primary: white;
      --md-sys-color-on-primary: black;
      position: relative;
    }
    #verticalButton span,
    #horizontalButton span {
      font-size: 20px;
      white-space: nowrap;
      text-transform: none;
    }
    #vertical > * {
      transform: rotate(90deg);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'plot-overlay-ui': PlotOverlayUi;
  }
}
