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

import {Batch, Field} from './entry';

/** Component displaying the names and descriptions of the fields of a batch. */
@customElement('fields-table-ui')
export class FieldsTableUi extends LitElement {
  @property({attribute: false}) batch?: Batch;

  override render() {
    if (this.batch === undefined) return html``;

    const renderFieldRange = (field: Field) => {
      return `[${field.rangeStart}:${field.rangeEnd}]`;
    };
    const renderFieldSet = (field: Field) => {
      if (field.uniqueValuesArray.length > 3) {
        return `{${field.uniqueValuesArray.slice(0, 3).join(', ')}, ...}`;
      }
      return `{${field.uniqueValuesArray.join(', ')}}`;
    };

    const renderField = (field: Field) => {
      return html`
      <tr>
        <th>${field.displayName}</th>
        <td class="description">${field.description}</td>
        <td>
          ${field.isNumber ? renderFieldRange(field) : renderFieldSet(field)}
        </td>
      </tr>`;
    };

    return html`
      <table>
        ${this.batch.fields.map(renderField)}
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
