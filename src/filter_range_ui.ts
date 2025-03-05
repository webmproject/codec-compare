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
import '@material/mwc-slider';
import '@material/mwc-slider/slider-range';
import '@material/mwc-textfield';

import {SliderRange} from '@material/mwc-slider/slider-range';
import {TextField} from '@material/mwc-textfield';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {Field} from './entry';
import {dispatch, EventType, listen} from './events';
import {FieldFilter, FieldFilterRange, FieldFilterStringSet} from './filter';

/* Component displaying a FieldFilterRange bound to a Field. */
@customElement('filter-ui-range')
export class FilterUiRange extends LitElement {
  @property({attribute: false}) batchIndex!: number;
  @property({attribute: false}) field!: Field;
  @property({attribute: false}) filter!: FieldFilterRange;

  @query('#numberMin') private readonly numberMin?: TextField;
  @query('#numberMax') private readonly numberMax?: TextField;
  @query('#numberSlider') private readonly numberSlider?: SliderRange;

  override connectedCallback() {
    super.connectedCallback();
    // Hack to force refreshing the mwc-slider-range. Otherwise it may appear
    // broken (probably due to being initialized in a display:none parent).
    listen(EventType.FILTERED_DATA_INFO_REQUEST, async () => {
      await new Promise(r => setTimeout(r, 1));
      if (this.numberSlider !== undefined) {
        await this.numberSlider.layout();
      }
    });
  }

  private renderSingleUniqueValue() {
    const uniqueValue = this.field.uniqueValuesArray.length === 0 ?
        'n/a' :
        this.field.uniqueValuesArray[0];
    return html`
      <p>
        <strong title="${this.field.description}">
          ${this.field.displayName}
        </strong> being ${uniqueValue}
      </p>`;
  }

  private renderNumberMin() {
    const onChangeMinText = () => {
      if (this.numberMin === undefined) return;
      if (this.numberSlider === undefined) return;

      if (!isNaN(Number(this.numberMin.value))) {
        this.filter.rangeStart = Math.min(
            Math.max(Number(this.numberMin.value), this.field.rangeStart),
            this.filter.rangeEnd);
      }
      this.numberMin.value = this.filter.rangeStart.toString();
      this.numberSlider.valueStart = this.filter.rangeStart;
      dispatch(EventType.FILTER_CHANGED, {batchIndex: this.batchIndex});
    };

    return html`
      <mwc-textfield outlined .value=${this.filter.rangeStart.toString()}
        @change=${onChangeMinText} id="numberMin">
      </mwc-textfield>`;
  }

  private renderNumberMax() {
    const onChangeMaxText = () => {
      if (this.numberMax === undefined) return;
      if (this.numberSlider === undefined) return;

      if (!isNaN(Number(this.numberMax.value))) {
        this.filter.rangeEnd = Math.min(
            Math.max(Number(this.numberMax.value), this.filter.rangeStart),
            this.field.rangeEnd);
      }
      this.numberMax.value = this.filter.rangeEnd.toString();
      this.numberSlider.valueEnd = this.filter.rangeEnd;
      dispatch(EventType.FILTER_CHANGED, {batchIndex: this.batchIndex});
    };

    return html`
      <mwc-textfield outlined .value=${this.filter.rangeEnd.toString()}
        @change=${onChangeMaxText} id="numberMax">
      </mwc-textfield>`;
  }

  private renderNumberSlider() {
    const onChangeSlider = () => {
      if (this.numberMin === undefined) return;
      if (this.numberMax === undefined) return;
      if (this.numberSlider === undefined) return;

      if (this.numberSlider.valueStart !== this.filter.rangeStart) {
        this.filter.rangeStart = this.numberSlider.valueStart;
        this.numberMin.value = this.filter.rangeStart.toString();
        dispatch(EventType.FILTER_CHANGED, {batchIndex: this.batchIndex});
      }
      if (this.numberSlider.valueEnd !== this.filter.rangeEnd) {
        this.filter.rangeEnd = this.numberSlider.valueEnd;
        this.numberMax.value = this.filter.rangeEnd.toString();
        dispatch(EventType.FILTER_CHANGED, {batchIndex: this.batchIndex});
      }
    };

    const range = this.field.rangeEnd - this.field.rangeStart;
    if (this.field.isInteger) {
      if (range < 30) {
        // withtickmarks is laggy with large values
        return html`<mwc-slider-range
          discrete
          withtickmarks
          min="${this.field.rangeStart}"
          max="${this.field.rangeEnd}"
          valueStart="${this.filter.rangeStart}"
          valueEnd="${this.filter.rangeEnd}"
          step="1"
          @change=${onChangeSlider}
          id="numberSlider"></mwc-slider-range>`;
      }
      return html`<mwc-slider-range
        discrete
        min="${this.field.rangeStart}"
        max="${this.field.rangeEnd}"
        valueStart="${this.filter.rangeStart}"
        valueEnd="${this.filter.rangeEnd}"
        step="1"
        @change=${onChangeSlider}
        id="numberSlider"></mwc-slider-range>`;
    }

    // Hack to bypass the inconvenient check at
    // https://github.com/simonziegler/material-components-web/blob/78305b6d547b07aa06db04ad47b765b8f92851fa/packages/mdc-slider/foundation.ts#L1017-L1025
    const step = range / (256 * 256);
    const min = this.field.rangeStart;
    const valueStart =
        min + Math.round((this.filter.rangeStart - min) / step) * step;
    const valueEnd =
        min + Math.round((this.filter.rangeEnd - min) / step) * step;
    return html`<mwc-slider-range
      min="${this.field.rangeStart}"
      max="${this.field.rangeEnd}"
      valueStart="${valueStart}"
      valueEnd="${valueEnd}"
      step="${step}"
      @change=${onChangeSlider}
      id="numberSlider"></mwc-slider-range>`;
  }

  private renderNumber() {
    return html`
    <p>
      <strong title="${this.field.description}">
        ${this.field.displayName}
      </strong> in range [
    </p>
    ${this.renderNumberMin()}
    ${this.renderNumberSlider()}
    ${this.renderNumberMax()}
    <p>]</p>`;
  }

  override render() {
    return html`
      ${
        this.field.uniqueValuesArray.length < 2 ?
            this.renderSingleUniqueValue() :
            this.renderNumber()}
      <mwc-button
        raised
        dense
        @click=${() => {
      this.filter.enabled = false;
      dispatch(EventType.FILTER_CHANGED, {batchIndex: this.batchIndex});
    }}
        title="Delete filter">
        <mwc-icon>filter_alt_off</mwc-icon>
      </mwc-button>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      background: var(--mdc-theme-background);
      margin: 0;
      padding: 10px;
      border-radius: 10px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
    }

    p {
      margin: 0;
      color: var(--mdc-theme-text);
      font-size: 20px;
      white-space: nowrap;
    }

    mwc-textfield {
      width: 80px;
      height: 35px;
    }
    mwc-slider-range {
      width: 400px;
    }
  `;
}
