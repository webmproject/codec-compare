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

import './batch_selection_actions_ui';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {BatchSelection} from './batch_selection';
import {Field, fieldUnit} from './entry';
import {dispatch, EventType, listen} from './events';
import {FieldFilter} from './filter';
import {FieldMetric, FieldMetricStats} from './metric';
import {getRelativePercent} from './metric_ui';
import {State} from './state';

/** Component displaying each BatchSelection. */
@customElement('batch-selections-ui')
export class BatchSelectionsUi extends LitElement {
  @property({attribute: false}) state!: State;

  override connectedCallback() {
    super.connectedCallback();
    listen(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      this.requestUpdate();
    });
  }

  private renderRowMetric(
      batchSelection: BatchSelection, batchSelectionIndex: number,
      metric: FieldMetric, stats: FieldMetricStats) {
    if (!metric.enabled) return html``;

    const batch = batchSelection.batch;
    const field = batch.fields[metric.fieldIndices[batch.index]];
    const referenceBatch =
        this.state.batchSelections[this.state.referenceBatchSelectionIndex]
            .batch;
    if (this.state.showRelativeRatios &&
        batchSelectionIndex === this.state.referenceBatchSelectionIndex) {
      const title = referenceBatch.name + ' is used as reference';
      return html`
        <td class="stat" title="${title}">
          -
        </td>
      `;
    }
    if (batchSelection.matchedDataPoints.rows.length === 0) {
      const title = 'There is no data to compare ' + batch.name + ' with ' +
          referenceBatch.name;
      return html`
        <td class="stat" title="${title}">
          n/a
        </td>
      `;
    }

    if (this.state.showRelativeRatios) {
      const mean = stats.getRelativeMean(this.state.useGeometricMean);
      const title = `${field.displayName} of ${batch.name} is ${
          mean.toFixed(4)}× ${referenceBatch.name}`;
      return html`
        <td class="stat" title="${title}">
          ${getRelativePercent(mean)}
        </td>`;
    } else {
      let mean = stats.getAbsoluteMean();
      let multiple = '';
      const unit = fieldUnit(field.id);
      const title = `average ${field.displayName} of ${batch.name} is ${
          mean} ${unit}`;

      if (mean > 1000000 && unit === 'B') {
        mean /= 1000000;
        multiple = 'M';
      } else if (mean > 1000 && unit === 'B') {
        mean /= 1000;
        multiple = 'k';
      }
      const meanStr = mean < 1 ? mean.toFixed(4) :
          mean < 100           ? mean.toFixed(2) :
                                 mean.toFixed(0);
      return html`
        <td class="stat" title="${title}">${meanStr}${multiple}${unit}</td>`;
    }
  }

  private filterChipText(field: Field, fieldFilter: FieldFilter) {
    if (field.uniqueValuesArray.length === 0) {
      return '∅';
    }
    if (field.uniqueValuesArray.length === 1) {
      if (field.isNumber && !field.isInteger) {
        return Number(field.uniqueValuesArray[0]).toFixed(1);
      }
      return field.uniqueValuesArray[0];
    }
    if (field.isNumber) {
      if (field.isInteger) {
        return '[' + fieldFilter.rangeStart.toString() + ':' +
            fieldFilter.rangeEnd.toString() + ']';
      }
      return '[' + fieldFilter.rangeStart.toFixed(1) + ':' +
          fieldFilter.rangeEnd.toFixed(1) + ']';
    }
    return fieldFilter.uniqueValues.size.toString() + '/' +
        field.uniqueValuesArray.length.toString();
  }

  private renderFilterChip(
      batchSelection: BatchSelection, field: Field, fieldFilter: FieldFilter) {
    if (!fieldFilter.actuallyFiltersPointsOut(field)) return html``;
    return html`
      <div id="filterChip" @click=${() => {
      dispatch(
          EventType.FILTERED_DATA_INFO_REQUEST,
          {batchIndex: batchSelection.batch.index});
    }}>
        <mwc-icon>filter_alt</mwc-icon>
        ${field.displayName}=${this.filterChipText(field, fieldFilter)}
      </div>`;
  }

  private renderFilterChips(batchSelection: BatchSelection) {
    return html`${
        batchSelection.batch.fields.map(
            (field: Field, fieldIndex: number) => this.renderFilterChip(
                batchSelection, field,
                batchSelection.fieldFilters[fieldIndex]))}`;
  }

  private renderBatchSelectionRow(
      batchSelection: BatchSelection, index: number) {
    const batch = batchSelection.batch;
    return html`
      <tr>
        <td>
          <div class="batchName">
            <batch-name-ui .batch=${batch}></batch-name-ui>
            ${this.renderFilterChips(batchSelection)}
          </div>
        </td>
        <td class="notText">
          <batch-selection-actions-ui
            .state=${this.state}
            .batchSelectionIndex=${index}
            .isReference=${index === this.state.referenceBatchSelectionIndex}>
          </batch-selection-actions-ui>
        </td>
        ${this.state.metrics.map((metric: FieldMetric, metricIndex: number) => {
      return this.renderRowMetric(
          batchSelection, index, metric, batchSelection.stats[metricIndex]);
    })}
      </tr>`;
  }

  override render() {
    const numEnabledMetrics =
        this.state.metrics.filter(metric => metric.enabled).length;
    return html`
      <table>
        <tr>
          <th colspan=2>of codec</th>
          <th colspan=${numEnabledMetrics}>${
        (numEnabledMetrics > 1) ? 'are' : 'is'}</th>
        </tr>
        ${
        this.state.batchSelections.map(
            (batchSelection: BatchSelection, index: number) => {
              return this.renderBatchSelectionRow(batchSelection, index);
            })}
      </table>
    `;
  }

  static override styles = css`
    :host {
      box-shadow: rgba(0, 0, 0, 0.5) 0px 0px 6px 0px;
      /* Necessary for mwc-menus to work properly without hacks. */
      overflow: visible;
      /* Does not work without overflow: hidden; */
      border-radius: 5px;
    }

    table {
      color: var(--mdc-theme-text);
      width: 100%;
      white-space: nowrap;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 1px 2px;
      border-width: 1px;
      border-style: solid;
    }
    th {
      border-color: var(--mdc-theme-background);
      background: var(--mdc-theme-surface);
      font-size: 20px;
    }
    td {
      border-color: var(--mdc-theme-surface);
      font-family: monospace;
      font-size: 16px;
    }

    tr {
      background: var(--mdc-theme-background);
    }
    tr:hover {
      box-shadow: inset 0 0 8px 4px var(--mdc-theme-surface);
    }
    tr:not(:hover) batch-selection-actions-ui {
      /* Dim the action buttons when the table row is not hovered. */
      opacity: 0.1;
    }

    .batchName {
      display: flex;
      flex-flow: row wrap;
      align-content: flex-start;
      align-items: center;
      gap: 5px;
    }
    .stat {
      text-align: right;
      /* Keep the table from reshaping itself when percentages vary. */
      width: 70px;  /* Seems enough for 7 mono characters (up to "+999.9%"). */
    }
    .notText {
      text-align: center;
      /* make the column as narrow as possible */
      width: 0;
    }

    #filterChip {
      --mdc-icon-size: 12px;
      font-size: 10px;
      padding: 2px 4px;
      border-radius: 30px;
      background: var(--mdc-theme-primary);
      color: var(--mdc-theme-background);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }
    #filterChip:hover {
      cursor: pointer;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'batch-selections-ui': BatchSelectionsUi;
  }
}
