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
import '@material/web/textfield/outlined-text-field';
import '@material/web/slider/slider';
import '@material/web/icon/icon';

import {MdSlider} from '@material/web/slider/slider';
import {MdOutlinedTextField} from '@material/web/textfield/outlined-text-field';
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

  @query('#numberMin') private readonly numberMin?: MdOutlinedTextField;
  @query('#numberMax') private readonly numberMax?: MdOutlinedTextField;
  @query('#numberSlider') private readonly numberSlider?: MdSlider;

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
      <md-outlined-text-field value=${this.filter.rangeStart.toString()}
        @change=${onChangeMinText} id="numberMin">
      </md-outlined-text-field>`;
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
      <md-outlined-text-field .value=${this.filter.rangeEnd.toString()}
        @change=${onChangeMaxText} id="numberMax">
      </md-outlined-text-field>`;
  }

  private renderNumberSlider() {
    const onChangeSlider = () => {
      if (this.numberMin === undefined) return;
      if (this.numberMax === undefined) return;
      if (this.numberSlider === undefined) return;

      if (this.numberSlider.valueStart !== this.filter.rangeStart) {
        this.filter.rangeStart = this.numberSlider.valueStart!;
        this.numberMin.value = this.filter.rangeStart.toString();
        dispatch(EventType.FILTER_CHANGED, {batchIndex: this.batchIndex});
      }
      if (this.numberSlider.valueEnd !== this.filter.rangeEnd) {
        this.filter.rangeEnd = this.numberSlider.valueEnd!;
        this.numberMax.value = this.filter.rangeEnd.toString();
        dispatch(EventType.FILTER_CHANGED, {batchIndex: this.batchIndex});
      }
    };

    const range = this.field.rangeEnd - this.field.rangeStart;
    if (this.field.isInteger) {
      if (range < 30) {
        // withtickmarks is laggy with large values
        return html`<md-slider
          range
          ticks
          min="${this.field.rangeStart}"
          max="${this.field.rangeEnd}"
          value-start="${this.filter.rangeStart}"
          value-end="${this.filter.rangeEnd}"
          step="1"
          @change=${onChangeSlider}
          id="numberSlider"></md-slider>`;
      }
      return html`<md-slider
        range
        min="${this.field.rangeStart}"
        max="${this.field.rangeEnd}"
        value-start="${this.filter.rangeStart}"
        value-end="${this.filter.rangeEnd}"
        step="1"
        @change=${onChangeSlider}
        id="numberSlider"></md-slider>`;
    }

    const step = range / (256 * 256);
    const min = this.field.rangeStart;
    const valueStart =
        min + Math.round((this.filter.rangeStart - min) / step) * step;
    const valueEnd =
        min + Math.round((this.filter.rangeEnd - min) / step) * step;
    return html`<md-slider
      range
      min="${this.field.rangeStart}"
      max="${this.field.rangeEnd}"
      value-start="${valueStart}"
      value-end="${valueEnd}"
      step="${step}"
      @change=${onChangeSlider}
      id="numberSlider"></md-slider>`;
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
      <md-filled-icon-button
        @click=${() => {
      this.filter.enabled = false;
      dispatch(EventType.FILTER_CHANGED, {batchIndex: this.batchIndex});
    }}
        title="Delete filter">
        <md-icon>filter_alt_off</md-icon>
      </md-filled-icon-button>
    `;
  }

  static override styles = css`
    :host {
      display: block;
      background: var(--md-sys-color-background);
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
      color: var(--md-sys-color-text);
      font-size: 20px;
      white-space: nowrap;
    }

    md-outlined-text-field {
      width: 80px;
      height: 35px;
      --md-outlined-field-top-space: 2px;
      --md-outlined-field-bottom-space: 2px;
      --md-outlined-text-field-leading-space: 2px;
      --md-outlined-text-field-trailing-space: 2px;
    }
    md-slider {
      width: 400px;
    }

    md-filled-icon-button {
      --md-filled-icon-button-icon-size: 24px;
      --md-filled-icon-button-container-width: 32px;
      --md-filled-icon-button-container-height: 32px;
      overflow: hidden;
    }
  `;
}
