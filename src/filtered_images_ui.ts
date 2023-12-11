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

import '@material/mwc-icon';
import '@material/mwc-button';
import './batch_name_ui';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {BatchSelection} from './batch_selection';
import {Entry} from './entry';
import {State} from './state';

/** Component displaying filtered images in a table. */
@customElement('filtered-images-ui')
export class FilteredImagesUi extends LitElement {
  @property({attribute: false}) state!: State;
  @property() batchSelection!: BatchSelection;

  private renderRow(row: Entry, rowIndex: number) {
    const batch = this.batchSelection.batch;
    return html`
      <tr class="${
        this.batchSelection.filteredRowIndices.includes(rowIndex) ?
            'included' :
            'excluded'}">
        ${
        batch.fields.map(
            (_, fieldIndex) => html`<td>${row[fieldIndex]}</td>`)}
      </tr>`;
  }

  override render() {
    const batch = this.batchSelection.batch;
    return html`
        <div class="horizontalFlex">
          <div id="imageChip">
            <mwc-icon>photo_library</mwc-icon>
            ${this.batchSelection.filteredRowIndices.length} / ${
        batch.rows.length}
          </div>
          <h2>
            filtered data points in <batch-name-ui .batch=${
        batch}></batch-name-ui>
          </h2>
          <a href="${batch.url}" target="_blank">
            <mwc-button raised dense
              title="Download all unfiltered data points in JSON format">
              <mwc-icon>clear_all</mwc-icon>
              <mwc-icon>download</mwc-icon>
            </mwc-button>
          </a>
        </div>
        <div class="tableParent">
          <table>
            <tr>
              ${
        batch.fields.map(
            (field) => html`<th title="${field.description}">${
                field.displayName}</th>`)}
            </tr>
            ${batch.rows.map((row, rowIndex) => this.renderRow(row, rowIndex))}
          </table>
        </div>`;
  }

  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .horizontalFlex {
      display: flex;
      flex-flow: row wrap;
      align-items: center;
      margin: 0 0 10px 0;
      gap: 10px;
    }
    #imageChip {
      padding: 0 15px;
      height: 40px;
      border-radius: 30px;
      background: var(--mdc-theme-primary);
      color: var(--mdc-theme-background);
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 20px;
    }
    h2 {
      color: var(--mdc-theme-text);
    }

    .tableParent {
      overflow: auto;
      box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 6px 0px;
      transition: box-shadow 0.2s;
      /* Necessary for the shadow to not be clipped by host overflow:hidden. */
      margin: 7px;
    }
    .tableParent:hover {
      box-shadow: rgba(0, 0, 0, 0.5) 0px 0px 6px 0px;
    }

    table {
      color: var(--mdc-theme-text);
      width: 100%;
      white-space: nowrap;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 1px;
      border-width: 1px;
      border-style: solid;
    }
    th {
      border-color: var(--mdc-theme-background);
      background: var(--mdc-theme-surface);
      font-size: 12px;
      position: sticky;
      top: 0;
      border-top: 0;
    }
    td {
      border-color: var(--mdc-theme-surface);
      font-family: monospace;
      font-size: 10px;
    }

    tr {
      background: var(--mdc-theme-background);
    }
    tr:hover {
      background: var(--mdc-theme-surface);
    }
    .excluded {
      color: grey;
    }

    a {
      text-decoration: none;
    }
  `;
}
