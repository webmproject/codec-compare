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
import '@material/mwc-menu';

import {Button} from '@material/mwc-button';
import {ActionDetail} from '@material/mwc-list';
import {Menu} from '@material/mwc-menu';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {FieldId, DISTORTION_METRIC_FIELD_IDS} from './entry';
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
  if (DISTORTION_METRIC_FIELD_IDS.includes(id)) return null;  // Should not happen.
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

  @query('#verticalMenu') private readonly verticalMenu!: Menu;
  @query('#verticalButton') private readonly verticalButton!: Button;
  @query('#horizontalMenu') private readonly horizontalMenu!: Menu;
  @query('#horizontalButton') private readonly horizontalButton!: Button;

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

    const fieldIndices: number[] = [];
    const enabledMetrics: FieldMetric[] = [];
    if (this.state !== undefined) {
      for (const metric of this.state.metrics) {
        if (!metric.enabled) continue;
        fieldIndices.push(metric.fieldIndices[0]);
        enabledMetrics.push(metric);
      }
    }

    return html`
      <div id="vertical">
        <div style="position: relative;">
          <mwc-button icon="arrow_forward" trailingIcon title="${verticalTitle}"
            id="verticalButton" @click=${() => {
      this.verticalMenu.show();
    }}>
            <span>${verticalString}</span>
          </mwc-button>
          <mwc-menu
            .anchor=${this.verticalButton}
            corner="TOP_LEFT"
            menuCorner="START"
            id="verticalMenu"
            @action=${(e: CustomEvent<ActionDetail>) => {
      this.state!.plotMetricVertical = enabledMetrics[e.detail.index];
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
    }}>
            ${fieldIndices.map((fieldIndex) => html`
            <mwc-list-item ?activated=${fieldIndex === verticalFieldIndex}>
              ${this.state!.batches[0].fields[fieldIndex].displayName}
            </mwc-list-item>`)}
          </mwc-menu>
        </div>
      </div>
      <div id="horizontal">
        <div style="position: relative;">
          <mwc-button icon="arrow_backward" title="${horizontalTitle}"
            id="horizontalButton" @click=${() => {
      this.horizontalMenu.show();
    }}>
            <span>${horizontalString}</span>
          </mwc-button>
          <mwc-menu
            .anchor=${this.horizontalButton}
            corner="TOP_RIGHT"
            menuCorner="END"
            id="horizontalMenu"
            @action=${(e: CustomEvent<ActionDetail>) => {
      this.state!.plotMetricHorizontal = enabledMetrics[e.detail.index];
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
    }}>
            ${fieldIndices.map((fieldIndex) => html`
            <mwc-list-item ?activated=${fieldIndex === horizontalFieldIndex}>
              ${this.state!.batches[0].fields[fieldIndex].displayName}
            </mwc-list-item>`)}
          </mwc-menu>
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
      --mdc-theme-primary: black;
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
