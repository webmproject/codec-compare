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

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {styleMap} from 'lit/directives/style-map.js';

import {BatchSelection} from './batch_selection';
import {areFieldsComparable, Batch, Field, FieldId, fieldUnit} from './entry';
import {dispatch, EventType} from './events';
import {FieldMatcher, Match} from './matcher';
import {FieldMetric, getRatio} from './metric';
import {getRelativePercent} from './metric_ui';
import {State} from './state';

/**
 * Component displaying a table of each Match between a given batch and the
 * reference batch.
 */
@customElement('matches-table-ui')
export class MatchesTableUi extends LitElement {
  @property({attribute: false}) state!: State;

  @property({attribute: false}) batchSelection!: BatchSelection;

  // Cells

  private renderFieldHeader(batch: Batch, fieldIndex: number, rowspan: number) {
    return html`
      <th colspan=2 rowspan=${rowspan}
        title="${batch.fields[fieldIndex].description}" class="headerRow">
        ${batch.fields[fieldIndex].displayName}
      </th>`;
  }

  private renderField(
      selection: Batch, selectionFieldIndex: number, selectionRowIndex: number,
      reference: Batch, referenceFieldIndex: number,
      referenceRowIndex: number) {
    const selectionField = selection.fields[selectionFieldIndex];
    const selectionValue =
        selection.rows[selectionRowIndex][selectionFieldIndex];
    const referenceValue =
        reference.rows[referenceRowIndex][referenceFieldIndex];
    const referenceField = reference.fields[referenceFieldIndex];
    const isNumber = selectionField.isNumber && referenceField.isNumber;
    const cssClass = isNumber ? 'numberCell' : '';

    if (selectionField.id !== FieldId.EFFORT &&
        selectionField.id !== FieldId.QUALITY) {
      if (this.state.showRelativeRatios && isNumber &&
          selectionField.id !== FieldId.WIDTH &&
          selectionField.id !== FieldId.HEIGHT &&
          selectionField.id !== FieldId.FRAME_COUNT &&
          selectionField.id !== FieldId.MEGAPIXELS) {
        const ratio =
            getRatio(selectionValue as number, referenceValue as number);
        return html`<td colspan=2 class="${cssClass}">${
            getRelativePercent(ratio)}</td>`;
      }
      if (selectionValue === referenceValue) {
        return html`<td colspan=2 class="${cssClass}">${selectionValue}</td>`;
      }
    }
    const referenceStyle = {'color': reference.color};
    const selectionStyle = {'color': selection.color};
    // TODO: Align all floating point numbers in same column at decimal point.
    return html`
        <td style=${styleMap(referenceStyle)} class="${cssClass}">
          ${referenceValue}
        </td>
        <td style=${styleMap(selectionStyle)} class="${cssClass}">
          ${selectionValue}
        </td>`;
  }

  // Header rows (two needed because some cells use a rowspan)

  private renderFirstHeaderRow(
      reference: Batch, matchers: FieldMatcher[], metrics: FieldMetric[],
      referenceSharedFieldIndices: number[]) {
    return html`<tr>
      <th colspan=${matchers.length * 2} class="headerRow">Matchers</th>
      <th colspan=${metrics.length * 2} class="headerRow">Metrics</th>
      ${referenceSharedFieldIndices.map((fieldIndex) => {
      return this.renderFieldHeader(reference, fieldIndex, /*rowspan=*/ 2);
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

  private renderAbsoluteMeanRows(
      selection: Batch, numColumns: number, matchers: FieldMatcher[],
      metricIndices: number[], selectionSharedFieldIndices: number[]) {
    const selectionStyle = {'color': selection.color};
    return html`
      <tr>
        <th colspan=${numColumns * 2}>Arithmetic means</th>
      </tr>
      <tr>
        <td colspan=${matchers.length * 2} class="missing"></td>
        ${metricIndices.map((metricIndex) => {
      const mean = this.batchSelection.stats[metricIndex].getAbsoluteMean();
      const metric = this.state.metrics[metricIndex];
      const fieldIndex = metric.fieldIndices[this.batchSelection.batch.index];
      const field = this.batchSelection.batch.fields[fieldIndex];
      return html`
        <td colspan=2 class="numberCell" style=${styleMap(selectionStyle)}>
          ${mean}${fieldUnit(field.id)}
        </td>`;
    })}
        <td colspan=${selectionSharedFieldIndices.length * 2} class="missing">
        </td>
      </tr>`;
  }

  private renderRelativeMeanRows(
      numColumns: number, matchers: FieldMatcher[], metricIndices: number[],
      selectionSharedFieldIndices: number[]) {
    return html`
      <tr>
        <th colspan=${numColumns * 2}>Arithmetic means</th>
      </tr>
      <tr>
        <td colspan=${matchers.length * 2} class="missing"></td>
        ${metricIndices.map((metricIndex) => {
      const mean = this.batchSelection.stats[metricIndex].getRelativeMean(
          /*geometric=*/ false);
      return html`
        <td colspan=2 class="numberCell">${getRelativePercent(mean)}</td>`;
    })}
        <td colspan=${selectionSharedFieldIndices.length * 2} class="missing">
        </td>
      </tr>

      <tr>
        <th colspan=${numColumns * 2}>Geometric means</th>
      </tr>
      <tr>
        <td colspan=${matchers.length * 2} class="missing"></td>
        ${metricIndices.map((metricIndex) => {
      const mean = this.batchSelection.stats[metricIndex].getRelativeMean(
          /*geometric=*/ true);
      return html`
        <td colspan=2 class="numberCell">${getRelativePercent(mean)}</td>`;
    })}
        <td colspan=${selectionSharedFieldIndices.length * 2} class="missing">
        </td>
      </tr>`;
  }

  override render() {
    if (!this.batchSelection) return html``;
    const reference =
        this.state.batchSelections[this.state.referenceBatchSelectionIndex]
            .batch;
    const selection = this.batchSelection.batch;
    const selectionIndex = selection.index;

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
    const metricIndices: number[] = [];
    for (const [metricIndex, metric] of this.state.metrics.entries()) {
      if (metric.enabled) {
        // Do not check for fields already used for matchers.
        // Display it twice if it is both a matcher and a metric.
        metrics.push(metric);
        metricIndices.push(metricIndex);
        referenceFieldIndicesUsed[metric.fieldIndices[reference.index]] = true;
        selectionFieldIndicesUsed[metric.fieldIndices[selection.index]] = true;
      }
    }

    // Fields sharing the same FieldId.
    const referenceSharedFieldIndices: number[] = [];
    const selectionSharedFieldIndices: number[] = [];

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
      }
    }

    const renderRow = (match: Match, matchIndex: number) => {
      const onMatchInfoRequest = () => {
        dispatch(
            EventType.MATCH_INFO_REQUEST,
            {batchIndex: selectionIndex, matchIndex});
      };
      return html`
          <tr @click=${onMatchInfoRequest} class="matchRow">
            ${matchers.map((matcher) => {
        return this.renderField(
            selection, matcher.fieldIndices[selection.index], match.leftIndex,
            reference, matcher.fieldIndices[reference.index], match.rightIndex);
      })}
            ${metrics.map((metric) => {
        return this.renderField(
            selection, metric.fieldIndices[selection.index], match.leftIndex,
            reference, metric.fieldIndices[reference.index], match.rightIndex);
      })}
            ${selectionSharedFieldIndices.map((fieldIndex, i) => {
        return this.renderField(
            selection, fieldIndex, match.leftIndex, reference,
            referenceSharedFieldIndices[i], match.rightIndex);
      })}
          </tr>
    `;
    };

    const numColumns =
        matchers.length + metrics.length + selectionSharedFieldIndices.length;
    let rows = this.batchSelection.matchedDataPoints.rows;
    let truncatedRows = html``;
    if (!this.state.showAllRows && rows.length > 100) {
      const onDisplayHiddenRow = () => {
        this.state.showAllRows = true;
        dispatch(EventType.SETTINGS_CHANGED);
        this.requestUpdate();
      };
      truncatedRows = html`
        <tr>
          <td @click=${onDisplayHiddenRow}
              colspan=${numColumns * 2} class="hiddenRow">
            ${rows.length - 100} hidden rows. Click to expand.
          </td>
        </tr>`;
      rows = rows.slice(0, 100);
    }

    return html`
      <table>
        ${
        this.renderFirstHeaderRow(
            reference, matchers, metrics, referenceSharedFieldIndices)}
        ${this.renderSecondHeaderRow(reference, matchers, metrics)}
        ${rows.map(renderRow)}
        ${truncatedRows}
        ${
        this.state.showRelativeRatios ?
            this.renderRelativeMeanRows(
                numColumns, matchers, metricIndices,
                selectionSharedFieldIndices) :
            this.renderAbsoluteMeanRows(
                selection, numColumns, matchers, metricIndices,
                selectionSharedFieldIndices)}
      </table>`;
  }

  static override styles = css`
    :host {
      overflow: auto;
      box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 6px 0px;
      /* Necessary for shadow to not be clipped by parent overflow:hidden. */
      margin: 7px;
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
    }
    .headerRow {
      position: sticky;
      top: 0;
      border-top: 0;
    }
    td {
      border-color: var(--mdc-theme-surface);
      font-family: monospace;
      font-size: 10px;
    }
    .numberCell {
      text-align: right;
    }

    tr {
      background: var(--mdc-theme-background);
    }
    .matchRow:hover {
      background: var(--mdc-theme-surface);
      cursor: pointer;
    }
    .hiddenRow {
      color: grey;
      font-style: italic;
      text-align: center;
    }
    .hiddenRow:hover {
      cursor: pointer;
    }

    .missing {
      background: var(--mdc-theme-surface);
    }
  `;
}
