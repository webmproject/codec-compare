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

import {BatchSelection} from './batch_selection';
import {areFieldsComparable, Batch, Field} from './entry';
import {FieldMatcher} from './matcher';
import {FieldMetric, getRatio} from './metric';
import {getRelativePercent} from './metric_ui';
import {State} from './state';

/**
 * Component displaying the raw values of each data point in one selected Match.
 */
@customElement('match-table-ui')
export class MatchTableUi extends LitElement {
  @property({attribute: false}) state!: State;

  /** The selected batch and the index of the Match. */
  @property({attribute: false}) batchSelection!: BatchSelection;
  @property({attribute: false}) matchIndex!: number;

  // Cells

  private renderFieldHeader(batch: Batch, fieldIndex: number, rowspan: number) {
    return html`<th rowspan=${rowspan} title="${
        batch.fields[fieldIndex].description}">
      ${batch.fields[fieldIndex].displayName}
    </th>`;
  }

  private renderField(batch: Batch, fieldIndex: number, rowIndex: number) {
    const value = batch.rows[rowIndex][fieldIndex];
    if (batch.fields[fieldIndex].isNumber &&
        !batch.fields[fieldIndex].isInteger) {
      return html`<td>${(value as number).toFixed(4)}</td>`;
    }
    return html`<td>${value}</td>`;
  }

  private renderRatio(
      batch: Batch, fieldIndex: number, rowIndex: number, reference: Batch,
      referenceFieldIndex: number, referenceRowIndex: number) {
    const value = batch.rows[rowIndex][fieldIndex];
    const referenceValue =
        reference.rows[referenceRowIndex][referenceFieldIndex];
    const ratio = getRatio(value as number, referenceValue as number);
    return html`<td>${getRelativePercent(ratio)}</td>`;
  }

  // Header rows (two needed because some cells use a rowspan)

  private renderFirstHeaderRow(
      reference: Batch, selection: Batch, matchers: FieldMatcher[],
      metrics: FieldMetric[], referenceSharedFieldIndices: number[],
      referenceOtherFieldIndices: number[],
      selectionOtherFieldIndices: number[]) {
    return html`<tr>
      <th rowspan="2">Codec</th>
      <th colspan=${matchers.length}>Matchers</th>
      <th colspan=${metrics.length}>Metrics</th>
      ${referenceSharedFieldIndices.map((fieldIndex) => {
      return this.renderFieldHeader(reference, fieldIndex, /*rowspan=*/ 2);
    })}
      ${referenceOtherFieldIndices.map((fieldIndex) => {
      return this.renderFieldHeader(reference, fieldIndex, /*rowspan=*/ 2);
    })}
      ${selectionOtherFieldIndices.map((fieldIndex) => {
      return this.renderFieldHeader(selection, fieldIndex, /*rowspan=*/ 2);
    })}
    </tr>`;
  }

  private renderSecondHeaderRow(
      reference: Batch, matchers: FieldMatcher[], metrics: FieldMetric[]) {
    // Other columns were "rowspanned" out.
    return html`<tr>
      ${matchers.map((matcher) => {
      return this.renderFieldHeader(
          reference, matcher.fieldIndices[reference.index], /*rowspan=*/ 1);
    })}
      ${metrics.map((metric) => {
      return this.renderFieldHeader(
          reference, metric.fieldIndices[reference.index], /*rowspan=*/ 1);
    })}
    </tr>`;
  }

  // Data rows

  private renderReferenceRow(
      reference: Batch, matchers: FieldMatcher[], metrics: FieldMetric[],
      referenceSharedFieldIndices: number[],
      referenceOtherFieldIndices: number[],
      selectionOtherFieldIndices: number[], rowIndex: number) {
    return html`<tr>
      <td><batch-name-ui .batch=${reference}></batch-name-ui></td>
      ${matchers.map((matcher) => {
      return this.renderField(
          reference, matcher.fieldIndices[reference.index], rowIndex);
    })}
      ${metrics.map((metric) => {
      return this.renderField(
          reference, metric.fieldIndices[reference.index], rowIndex);
    })}
      ${referenceSharedFieldIndices.map((fieldIndex) => {
      return this.renderField(reference, fieldIndex, rowIndex);
    })}
      ${referenceOtherFieldIndices.map((fieldIndex) => {
      return this.renderField(reference, fieldIndex, rowIndex);
    })}
      ${selectionOtherFieldIndices.length === 0 ? '' : html`<td
            class="missing"
            colspan=${selectionOtherFieldIndices.length}
          ></td>`}
    </tr>`;
  }

  private renderRatioRow(
      reference: Batch, selection: Batch, matchers: FieldMatcher[],
      metrics: FieldMetric[], referenceSharedFieldIndices: number[],
      referenceOtherFieldIndices: number[],
      selectionOtherFieldIndices: number[], referenceRowIndex: number,
      selectionRowIndex: number) {
    return html`<tr>
      <td>Difference</td>
      <td class="missing" colspan=${matchers.length}></td>
      ${metrics.map((metric) => {
      return this.renderRatio(
          selection, metric.fieldIndices[selection.index], selectionRowIndex,
          reference, metric.fieldIndices[reference.index], referenceRowIndex);
    })}
      <td class="missing" colspan=${
        referenceSharedFieldIndices.length + referenceOtherFieldIndices.length +
        selectionOtherFieldIndices.length}>
      </td>
    </tr>`;
  }

  private renderSelectionRow(
      selection: Batch, matchers: FieldMatcher[], metrics: FieldMetric[],
      selectionSharedFieldIndices: number[],
      referenceOtherFieldIndices: number[],
      selectionOtherFieldIndices: number[], rowIndex: number) {
    return html`<tr>
      <td><batch-name-ui .batch=${selection}></batch-name-ui></td>
      ${matchers.map((matcher) => {
      return this.renderField(
          selection, matcher.fieldIndices[selection.index], rowIndex);
    })}
      ${metrics.map((metric) => {
      return this.renderField(
          selection, metric.fieldIndices[selection.index], rowIndex);
    })}
      ${selectionSharedFieldIndices.map((fieldIndex) => {
      return this.renderField(selection, fieldIndex, rowIndex);
    })}
      ${referenceOtherFieldIndices.length === 0 ? '' : html`<td
            class="missing"
            colspan=${referenceOtherFieldIndices.length}
          ></td>`}
      ${selectionOtherFieldIndices.map((fieldIndex) => {
      return this.renderField(selection, fieldIndex, rowIndex);
    })}
    </tr>`;
  }

  override render() {
    if (!this.batchSelection) return html``;
    const reference =
        this.state.batchSelections[this.state.referenceBatchSelectionIndex]
            .batch;
    const selection = this.batchSelection.batch;
    const match = this.batchSelection.matchedDataPoints.rows[this.matchIndex];

    // Remember the used fields to avoid displaying them twice.
    const referenceFieldIndicesUsed = Array
                                          .from<boolean>({
                                            length: reference.fields.length,
                                          })
                                          .fill(false);
    const selectionFieldIndicesUsed = Array
                                          .from<boolean>({
                                            length: selection.fields.length,
                                          })
                                          .fill(false);

    // Count enabled matchers and metrics.
    const matchers: FieldMatcher[] = [];
    for (const matcher of this.state.matchers) {
      if (matcher.enabled) {
        matchers.push(matcher);
        referenceFieldIndicesUsed[matcher.fieldIndices[reference.index]] = true;
        selectionFieldIndicesUsed[matcher.fieldIndices[selection.index]] = true;
      }
    }
    const metrics: FieldMetric[] = [];
    for (const metric of this.state.metrics) {
      if (metric.enabled) {
        // Do not check for fields already used for matchers.
        // Display it twice if it is both a matcher and a metric.
        metrics.push(metric);
        referenceFieldIndicesUsed[metric.fieldIndices[reference.index]] = true;
        selectionFieldIndicesUsed[metric.fieldIndices[selection.index]] = true;
      }
    }

    // Fields sharing the same FieldId.
    const referenceSharedFieldIndices: number[] = [];
    const selectionSharedFieldIndices: number[] = [];
    // Remaining fields.
    const referenceOtherFieldIndices: number[] = [];
    const selectionOtherFieldIndices: number[] = [];

    for (const [referenceIndex, referenceField] of reference.fields.entries()) {
      // Only keep number fields.
      if (!referenceField.isNumber) continue;
      if (referenceFieldIndicesUsed[referenceIndex]) continue;
      const selectionFieldIndex =
          selection.fields.findIndex((selectionField: Field) => {
            return areFieldsComparable(referenceField, selectionField);
          });
      if (selectionFieldIndex !== -1 &&
          !selectionFieldIndicesUsed[selectionFieldIndex]) {
        referenceSharedFieldIndices.push(referenceIndex);
        selectionSharedFieldIndices.push(selectionFieldIndex);
        referenceFieldIndicesUsed[referenceIndex] = true;
        selectionFieldIndicesUsed[selectionFieldIndex] = true;
      } else {
        referenceOtherFieldIndices.push(referenceIndex);
        referenceFieldIndicesUsed[referenceIndex] = true;
      }
    }
    for (const [selectionIndex, selectionField] of selection.fields.entries()) {
      if (!selectionField.isNumber) continue;
      if (selectionFieldIndicesUsed[selectionIndex]) continue;
      selectionOtherFieldIndices.push(selectionIndex);
      selectionFieldIndicesUsed[selectionIndex] = true;
    }

    return html` <table>
      ${
        this.renderFirstHeaderRow(
            reference, selection, matchers, metrics,
            referenceSharedFieldIndices, referenceOtherFieldIndices,
            selectionOtherFieldIndices)}
      ${this.renderSecondHeaderRow(reference, matchers, metrics)}
      ${
        this.renderReferenceRow(
            reference, matchers, metrics, referenceSharedFieldIndices,
            referenceOtherFieldIndices, selectionOtherFieldIndices,
            match.rightIndex)}
      ${
        this.renderRatioRow(
            reference, selection, matchers, metrics,
            selectionSharedFieldIndices, referenceOtherFieldIndices,
            selectionOtherFieldIndices, match.rightIndex, match.leftIndex)}
      ${
        this.renderSelectionRow(
            selection, matchers, metrics, selectionSharedFieldIndices,
            referenceOtherFieldIndices, selectionOtherFieldIndices,
            match.leftIndex)}
    </table>`;
  }

  static override styles = css`
    :host {
      overflow: auto;
      box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 6px 0px;
      /* Necessary for shadow to not be clipped by parent overflow:hidden. */
      margin: 7px;
      flex-shrink: 0;
    }

    table {
      color: var(--mdc-theme-text);
      width: 100%;
      white-space: nowrap;
      border-collapse: collapse;
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
      top: 0;
      border-top: 0;
    }
    td {
      border-color: var(--mdc-theme-surface);
      font-family: monospace;
    }

    tr {
      background: var(--mdc-theme-background);
    }

    .missing {
      background: var(--mdc-theme-surface);
    }
  `;
}
