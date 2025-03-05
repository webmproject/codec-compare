// Copyright 2025 Google LLC
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
import '@material/mwc-textfield';

import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {Field} from './entry';
import {dispatch, EventType, listen} from './events';
import {BUCKET_FILTER_MAX_INCLUSIVE, BUCKET_FILTER_MIN_INCLUSIVE, BUCKET_MAX_EXCLUSIVE, BUCKET_MIN_INCLUSIVE, FieldFilterWebBpp} from './filter_ranges';

/* Component displaying a FieldFilterWebBpp bound to a Field. */
@customElement('filter-ui-web-bpp')
export class FilterUiWebBpp extends LitElement {
  @property({attribute: false}) batchIndex!: number;
  @property({attribute: false}) field!: Field;
  @property({attribute: false}) filter!: FieldFilterWebBpp;

  override render() {
    return html`
      <p>
        <strong title="${this.field.description}">
          ${this.field.displayName}
        </strong>
        filtered according to 10th and 90th percentiles of bits-per-pixel for
        Megapixels buckets as described at
        <a target="_blank" href="https://github.com/webmproject/codec-compare/wiki/Bits-per-pixel-of-Internet-images/750494dff5ca33f8bf1cc5beb468aaa2e4e66b8d#2024">
          Bits-per-pixel of Internet images
          <mwc-icon>open_in_new</mwc-icon></a>:
      </p>
      <table>
        <tr>
          <th title="Number of millions of pixels">Megapixels</th>
          <th title="Values outside this range are filtered out">
            Bits-per-pixel
          </th>
        </tr>
        ${
        this.filter.buckets.map(
            (bucket) => html`
        <tr>
          <td>
            [${bucket[BUCKET_MIN_INCLUSIVE].toFixed(1)}:${
                bucket[BUCKET_MAX_EXCLUSIVE].toFixed(1)}[
          </td>
          <td>[${bucket[BUCKET_FILTER_MIN_INCLUSIVE].toFixed(2)}:${
                bucket[BUCKET_FILTER_MAX_INCLUSIVE].toFixed(2)}]</td>
        </tr>`)}
      </table>
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
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
    }

    p {
      margin: 0;
      color: var(--mdc-theme-text);
      font-size: 20px;
    }
    mwc-icon {
      vertical-align: top;
    }
  `;
}
