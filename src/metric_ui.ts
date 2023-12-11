// Copyright 2022 Google LLC
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
import './mwc_button_fit';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {dispatch, EventType} from './events';
import {FieldMetric} from './metric';

/** Component displaying one FieldMetric. */
@customElement('metric-ui')
export class MetricUi extends LitElement {
  @property({attribute: false}) displayName!: string;
  @property({attribute: false}) description!: string;
  @property({attribute: false}) metric!: FieldMetric;
  @property() isFirst!: boolean;
  @property() isLast!: boolean;

  private renderDeleteButton() {
    if (this.isFirst && this.isLast) {
      // title on a disabled mwc-button-fit does not work. Encapsulate in a div.
      return html`<div
        title="This metric cannot be deleted. There must be at least one metric.">
        <mwc-button-fit raised dense disabled
          ><mwc-icon>delete</mwc-icon></mwc-button-fit
        >
      </div>`;
    }
    return html`<mwc-button-fit
      raised
      dense
      @click=${() => {
      this.metric.enabled = false;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
    }}
      title="Delete metric"
      ><mwc-icon>delete</mwc-icon></mwc-button-fit
    >`;
  }

  override render() {
    const description = html`
        the <span title="geometric mean">average</span>
      <strong title="${this.description}">
        ${this.displayName}
      </strong>${this.isLast ? '' : ' and'}`;

    return html`${this.renderDeleteButton()} <p>${description}</p>`;
  }

  static override styles = css`
    :host {
      background-color: var(--mdc-theme-surface);
      margin: 0;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }
    p {
      margin: 0;
      color: var(--mdc-theme-text);
      font-size: 20px;
    }

    mwc-icon {
      font-size: 20px;
    }
  `;
}

/** Formats the given ratio into a "+/-X%" string. */
export function getRelativePercent(ratio: number): string {
  if (ratio < 1) {
    return '-' + ((1 - ratio) * 100).toFixed(1) + '%';
  }
  return '+' + ((ratio - 1) * 100).toFixed(1) + '%';
}
