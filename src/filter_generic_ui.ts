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
import '@material/web/icon/icon';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {Field} from './entry';
import {dispatch, EventType, listen} from './events';
import {FieldFilter, FieldFilterRange, FieldFilterStringSet} from './filter';

/* Component displaying a FieldFilter bound to a Field. */
@customElement('filter-ui-generic')
export class FilterUiGeneric extends LitElement {
  @property({attribute: false}) batchIndex!: number;
  @property({attribute: false}) field!: Field;
  @property({attribute: false}) filter!: FieldFilter;

  override render() {
    return html`
      <p>
        <strong title="${this.field.description}">
          ${this.filter.toString(this.field, /*short=*/ false)}
        </strong>
      </p>
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

    md-filled-icon-button {
      --md-filled-icon-button-icon-size: 24px;
      --md-filled-icon-button-container-width: 32px;
      --md-filled-icon-button-container-height: 32px;
      overflow: hidden;
    }
  `;
}
