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
import '@material/mwc-checkbox';

import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {Field} from './entry';
import {dispatch, EventType, listen} from './events';
import {FieldFilterStringSet} from './filter';

/* Component displaying a FieldFilterStringSet bound to a Field. */
@customElement('filter-ui-string-set')
export class FilterUiStringSet extends LitElement {
  @property({attribute: false}) batchIndex!: number;
  @property({attribute: false}) field!: Field;
  @property({attribute: false}) filter!: FieldFilterStringSet;

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

  private renderListItem(value: string) {
    const onToggle = (e: Event) => {
      if ((e.target as HTMLInputElement).checked) {
        this.filter.uniqueValues.add(value);
      } else {
        this.filter.uniqueValues.delete(value);
      }
      dispatch(EventType.FILTER_CHANGED, {batchIndex: this.batchIndex});
    };

    return html`
      <label>
        ${value}
        <mwc-checkbox reducedTouchTarget
          ?checked=${this.filter.uniqueValues.has(value)} @change=${onToggle}>
        </mwc-checkbox>
      </label>`;
  }

  private renderList() {
    return html`
      <p>
        <strong title="${this.field.description}">
          ${this.field.displayName}
        </strong> in set {
      </p>
      ${this.field.uniqueValuesArray.map((value: string) => {
      return this.renderListItem(value);
    })}
      <p>}</p>`;
  }

  override render() {
    return html`
      ${
        this.field.uniqueValuesArray.length < 2 ?
            this.renderSingleUniqueValue() :
            this.renderList()}
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

    label {
      padding-left: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      color: var(--mdc-theme-text);
      font-family: monospace;
      background: var(--mdc-theme-surface);
      border-radius: 30px;
    }
  `;
}
