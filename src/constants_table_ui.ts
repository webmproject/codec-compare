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

import './batch_name_ui';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {getFinalConstantValues} from './constant';
import {Batch, Constant, FieldId} from './entry';

/**
 * Component displaying the raw value of each constant of a selected batch.
 * If rowIndex is provided, the tokens are replaced by the field or constant
 * values of that data point in the constants' values.
 */
@customElement('constants-table-ui')
export class ConstantsTableUi extends LitElement {
  @property({attribute: false}) batch?: Batch;
  @property({attribute: false}) rowIndex = -1;

  private renderConstant(
      batch: Batch, constant: Constant, showDescriptionAsTitle: boolean,
      constantValue: string) {
    if (constant.id === FieldId.BATCH_NAME) return html``;
    return html`
        <tr>
          ${
        showDescriptionAsTitle ? html`
          <th title="${constant.description}">${constant.displayName}</th>` :
                                 html`
          <th>${constant.displayName}</th>
          <td class="description">${constant.description}</td>`}
          ${
        constant.id === FieldId.DATE ? html`<td>${batch.timeStringLong}</td>` :
                                       html`<td>${constantValue}</td>`}
        </tr>`;
  }

  override render() {
    if (this.batch === undefined) return html``;

    let constantValues: string[];
    let showDescriptionAsTitle: boolean;
    if (this.rowIndex === -1) {
      constantValues = [];
      for (const constant of this.batch.constants) {
        constantValues.push(constant.value);
      }
      showDescriptionAsTitle = false;
    } else {
      constantValues =
          getFinalConstantValues(this.batch, this.batch.rows[this.rowIndex]);
      showDescriptionAsTitle = true;
    }

    return html`
      <table>
        ${this.batch.constants.map((constant, index) => {
      return this.renderConstant(
          this.batch!, constant, showDescriptionAsTitle, constantValues[index]);
    })}
      </table>`;
  }

  static override styles = css`
    :host {
      box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 6px 0px;
      margin: 7px;
    }

    table {
      color: var(--mdc-theme-text);
      border-collapse: collapse;
      min-width: 100%;
    }
    th,
    td {
      padding: 3px;
      border-width: 1px;
      border-style: solid;
    }
    th {
      border-color: var(--mdc-theme-background);
      background: var(--mdc-theme-surface);
    }
    td {
      border-color: var(--mdc-theme-surface);
      font-family: monospace;
      word-break: break-word;
    }
    tr {
      background: var(--mdc-theme-background);
    }
    .description {
      font-style: italic;
      font-family: sans-serif;
    }
  `;
}
