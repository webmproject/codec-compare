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
import {dispatch, EventType, listen} from './events';
import {FilteredImagesUi} from './filtered_images_ui';
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
  @property({attribute: false}) referenceSelection!: BatchSelection|undefined;
  @property({attribute: false}) batchSelection!: BatchSelection;
  @property({attribute: false}) matchIndex!: number|undefined;

  override connectedCallback() {
    super.connectedCallback();
    listen(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      this.requestUpdate();
    });
  }

  // Cells

  private renderFieldHeader(batch: Batch, fieldIndex: number, rowspan: number) {
    return html`
      <th colspan=3 rowspan=${rowspan}
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

    const displayRatio = isNumber && selectionField.id !== FieldId.EFFORT &&
        selectionField.id !== FieldId.QUALITY &&
        selectionField.id !== FieldId.WIDTH &&
        selectionField.id !== FieldId.HEIGHT &&
        selectionField.id !== FieldId.FRAME_COUNT &&
        selectionField.id !== FieldId.MEGAPIXELS;
    if (!displayRatio && selectionValue === referenceValue &&
        selectionField.id !== FieldId.EFFORT &&
        selectionField.id !== FieldId.QUALITY) {
      return html`<td colspan=3 class="${cssClass}">${selectionValue}</td>`;
    }

    const referenceStyle = {'color': reference.color};
    if (selection.index === reference.index) {
      // Note that referenceValue may differ from selectionValue when
      // this.state.matchRepeatedly is true.
      return html`
          <td colspan=3 style=${styleMap(referenceStyle)} class="${cssClass}">
            ${selectionValue}
          </td>`;
    }

    const selectionStyle = {'color': selection.color};
    // TODO: Align all floating point numbers in same column at decimal point.
    return html`
        <td style=${styleMap(referenceStyle)} class="${cssClass}">
          ${referenceValue}
        </td>
        ${
        displayRatio ?
            html`
        <td class="${cssClass}">
          ${
                selectionValue === referenceValue ?
                    '=' :
                    getRelativePercent(getRatio(
                        selectionValue as number, referenceValue as number))}
        </td>` :
            html``}
        <td colspan=${displayRatio ? 1 : 2} style=${styleMap(selectionStyle)}
          class="${cssClass}">
          ${selectionValue}
        </td>`;
  }

  // Header rows (two needed because some cells use a rowspan)

  private renderFirstHeaderRow(
      batch: Batch, matchers: FieldMatcher[], metrics: FieldMetric[],
      fieldIndices: number[]) {
    return html`<tr>
      <th colspan=${matchers.length * 3} class="headerRow">Matchers</th>
      <th colspan=${metrics.length * 3} class="headerRow">Metrics</th>
      ${fieldIndices.map((fieldIndex) => {
      return this.renderFieldHeader(batch, fieldIndex, /*rowspan=*/ 2);
    })}
    </tr>`;
  }

  private renderSecondHeaderRow(
      batch: Batch, matchers: FieldMatcher[], metrics: FieldMetric[]) {
    // Other columns were "rowspanned" out.
    return html`<tr>
      ${matchers.map((matcher) => {
      return this.renderFieldHeader(
          batch, matcher.fieldIndices[batch.index], /*rowspan=*/ 1);
    })}
      ${metrics.map((metric) => {
      return this.renderFieldHeader(
          batch, metric.fieldIndices[batch.index], /*rowspan=*/ 1);
    })}
    </tr>`;
  }

  private renderMeanRows(
      selection: BatchSelection, reference: BatchSelection, numColumns: number,
      matchers: FieldMatcher[], metricIndices: number[],
      selectionSharedFieldIndices: number[]) {
    const referenceStyle = {'color': reference.batch.color};
    const selectionStyle = {'color': selection.batch.color};
    return html`
      <tr>
        <th colspan=${numColumns * 3}>Arithmetic means</th>
      </tr>
      <tr>
        <td colspan=${matchers.length * 3} class="missing"></td>
        ${metricIndices.map((metricIndex) => {
      const relativeMean = selection.stats[metricIndex].getRelativeMean(
          /*geometric=*/ false);
      const selectionAbsoluteMean =
          selection.stats[metricIndex].getAbsoluteMean();
      const referenceAbsoluteMean = selectionAbsoluteMean / relativeMean;
      const metric = this.state.metrics[metricIndex];
      const fieldIndex = metric.fieldIndices[selection.batch.index];
      const field = selection.batch.fields[fieldIndex];
      return html`
        <td class="numberCell" style=${styleMap(referenceStyle)}>
          ${referenceAbsoluteMean}${fieldUnit(field.id)}
        </td>
        <td class="numberCell">
          ${getRelativePercent(relativeMean)}
        </td>
        <td class="numberCell" style=${styleMap(selectionStyle)}>
          ${selectionAbsoluteMean}${fieldUnit(field.id)}
        </td>`;
    })}
        <td colspan=${selectionSharedFieldIndices.length * 3} class="missing">
        </td>
      </tr>

      <tr>
        <th colspan=${numColumns * 3}>Geometric means</th>
      </tr>
      <tr>
        <td colspan=${matchers.length * 3} class="missing"></td>
        ${metricIndices.map((metricIndex) => {
      const mean = selection.stats[metricIndex].getRelativeMean(
          /*geometric=*/ true);
      return html`
        <td colspan=2 class="numberCell">${getRelativePercent(mean)}</td>
        <td></td>`;
    })}
        <td colspan=${selectionSharedFieldIndices.length * 3} class="missing">
        </td>
      </tr>`;
  }

  private renderMeanRowsSingleBatch(
      selection: BatchSelection, numColumns: number, matchers: FieldMatcher[],
      metricIndices: number[], selectionSharedFieldIndices: number[]) {
    const selectionStyle = {'color': selection.batch.color};
    return html`
      <tr>
        <th colspan=${numColumns * 3}>Arithmetic means</th>
      </tr>
      <tr>
        <td colspan=${matchers.length * 3} class="missing"></td>
        ${metricIndices.map((metricIndex) => {
      const mean = selection.stats[metricIndex].getAbsoluteMean();
      const metric = this.state.metrics[metricIndex];
      const fieldIndex = metric.fieldIndices[selection.batch.index];
      const field = selection.batch.fields[fieldIndex];
      return html`
        <td colspan=3 class="numberCell" style=${styleMap(selectionStyle)}>
          ${mean}${fieldUnit(field.id)}
        </td>`;
    })}
        <td colspan=${selectionSharedFieldIndices.length * 3} class="missing">
        </td>
      </tr>`;
  }

  private renderBatchAndReference(
      batchSelection: BatchSelection, referenceSelection: BatchSelection) {
    const reference = referenceSelection.batch;
    const selection = batchSelection.batch;
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
      // Only keep number fields. Other fields can be displayed when selecting
      // a row.
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
        dispatch(EventType.MATCH_INFO_REQUEST, {
          batchIndex: selectionIndex,
          matchIndex: matchIndex === this.matchIndex ? undefined : matchIndex
        });
      };
      return html`
          <tr @click=${onMatchInfoRequest} class="${
          matchIndex === this.matchIndex ? 'matchRowSelected' : 'matchRow'}">
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
            selection, fieldIndex, match.leftIndex,  //
            reference, referenceSharedFieldIndices[i], match.rightIndex);
      })}
          </tr>
    `;
    };

    const rowsToRender = this.getRowsToRender(
        batchSelection, matchers, metrics, referenceSharedFieldIndices);

    return html`
      <table>
        ${
        this.renderFirstHeaderRow(
            reference, matchers, metrics, referenceSharedFieldIndices)}
        ${this.renderSecondHeaderRow(reference, matchers, metrics)}
        ${rowsToRender.truncatedRowsBefore}
        ${
        rowsToRender.rows.map(
            (match: Match, index: number) =>
                renderRow(match, rowsToRender.firstDisplayedRowIndex + index))}
        ${rowsToRender.truncatedRowsAfter}
        ${
        this.renderMeanRows(
            batchSelection, referenceSelection, rowsToRender.numColumns,
            matchers, metricIndices, selectionSharedFieldIndices)}
      </table>`;
  }

  private getRowsToRender(
      batchSelection: BatchSelection, matchers: FieldMatcher[],
      metrics: FieldMetric[], remainingFieldIndices: number[]): RowsToRender {
    let rowsToRender = new RowsToRender();
    rowsToRender.numColumns =
        matchers.length + metrics.length + remainingFieldIndices.length;
    rowsToRender.rows = batchSelection.matchedDataPoints.rows;
    rowsToRender.firstDisplayedRowIndex = 0;
    let numDisplayedRows = FilteredImagesUi.DEFAULT_NUM_DISPLAYED_ROWS;
    rowsToRender.truncatedRowsBefore = html``;
    rowsToRender.truncatedRowsAfter = html``;
    // +2 in case one or two placeholder rows below are replaced by actual
    // single data rows.
    if (this.state.showAllRows ||
        rowsToRender.rows.length <= numDisplayedRows + 2) {
      numDisplayedRows = rowsToRender.rows.length;
    } else {
      const onDisplayHiddenRow = () => {
        this.state.showAllRows = true;
        dispatch(EventType.SETTINGS_CHANGED);
        this.requestUpdate();
      };
      if (this.matchIndex !== undefined && this.matchIndex > 10) {
        rowsToRender.firstDisplayedRowIndex = Math.min(
            this.matchIndex - 10, rowsToRender.rows.length - numDisplayedRows);
        if (rowsToRender.firstDisplayedRowIndex === 1) {
          // Display the data row directly instead of showing a "1 hidden row"
          // placeholder.
          rowsToRender.firstDisplayedRowIndex = 0;
          numDisplayedRows += 1;
        } else {
          rowsToRender.truncatedRowsBefore = html`
            <tr>
              <td @click=${onDisplayHiddenRow} colspan=${
              rowsToRender.numColumns * 3}
                class="hiddenRow">
                ${
              rowsToRender.firstDisplayedRowIndex} hidden rows. Click to expand.
              </td>
            </tr>`;
        }
      }
      if (rowsToRender.firstDisplayedRowIndex + numDisplayedRows + 1 >=
          rowsToRender.rows.length) {
        // Display the data row directly instead of showing a "1 hidden row"
        // placeholder.
        numDisplayedRows += 1;
      }
      const endRow = rowsToRender.firstDisplayedRowIndex + numDisplayedRows;
      if (endRow < rowsToRender.rows.length) {
        rowsToRender.truncatedRowsAfter = html`
          <tr>
            <td @click=${onDisplayHiddenRow} colspan=${
            rowsToRender.numColumns * 3}
              class="hiddenRow">
              ${rowsToRender.rows.length - endRow} hidden rows. Click to expand.
            </td>
          </tr>`;
      }
      rowsToRender.rows =
          rowsToRender.rows.slice(rowsToRender.firstDisplayedRowIndex, endRow);
    }
    return rowsToRender;
  }

  // Same behavior as renderBatchAndReference() above but simplified for when
  // there is no reference batch or when the reference batch is the same batch
  // as the compared batch.
  private renderSingleBatch(batchSelection: BatchSelection) {
    const selection = batchSelection.batch;
    const selectionIndex = selection.index;

    // Remember the used fields to avoid displaying them twice.
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
        selectionFieldIndicesUsed[metric.fieldIndices[selection.index]] = true;
      }
    }

    // Remaining fields.
    const remainingFieldIndices: number[] = [];

    for (const [selectionFieldIndex, selectionField] of selection.fields
             .entries()) {
      // Only keep number fields. Other fields can be displayed when selecting
      // a row.
      if (!selectionField.isNumber) continue;
      if (!selectionFieldIndicesUsed[selectionFieldIndex]) {
        remainingFieldIndices.push(selectionFieldIndex);
        selectionFieldIndicesUsed[selectionFieldIndex] = true;
      }
    }

    const renderRow = (match: Match, matchIndex: number) => {
      // match.rightIndex refers to the reference batch which is missing. Only
      // use leftIndex.
      const onMatchInfoRequest = () => {
        dispatch(EventType.MATCH_INFO_REQUEST, {
          batchIndex: selectionIndex,
          matchIndex: matchIndex === this.matchIndex ? undefined : matchIndex
        });
      };
      // Reuse renderField() implementation by passing twice the same batch.
      return html`
          <tr @click=${onMatchInfoRequest} class="${
          matchIndex === this.matchIndex ? 'matchRowSelected' : 'matchRow'}">
            ${matchers.map((matcher) => {
        return this.renderField(
            selection, matcher.fieldIndices[selection.index], match.leftIndex,
            selection, matcher.fieldIndices[selection.index], match.leftIndex);
      })}
            ${metrics.map((metric) => {
        return this.renderField(
            selection, metric.fieldIndices[selection.index], match.leftIndex,
            selection, metric.fieldIndices[selection.index], match.leftIndex);
      })}
            ${remainingFieldIndices.map((fieldIndex) => {
        return this.renderField(
            selection, fieldIndex, match.leftIndex,  //
            selection, fieldIndex, match.leftIndex);
      })}
          </tr>
    `;
    };

    const rowsToRender = this.getRowsToRender(
        batchSelection, matchers, metrics, remainingFieldIndices);

    return html`
      <table>
        ${
        this.renderFirstHeaderRow(
            selection, matchers, metrics, remainingFieldIndices)}
        ${this.renderSecondHeaderRow(selection, matchers, metrics)}
        ${rowsToRender.truncatedRowsBefore}
        ${
        rowsToRender.rows.map(
            (match: Match, index: number) =>
                renderRow(match, rowsToRender.firstDisplayedRowIndex + index))}
        ${rowsToRender.truncatedRowsAfter}
        ${
        this.renderMeanRowsSingleBatch(
            batchSelection, rowsToRender.numColumns, matchers, metricIndices,
            remainingFieldIndices)}
      </table>`;
  }

  override render() {
    if (this.referenceSelection === undefined ||
        this.referenceSelection.batch.index ===
            this.batchSelection.batch.index) {
      return this.renderSingleBatch(this.batchSelection);
    } else {
      return this.renderBatchAndReference(
          this.batchSelection, this.referenceSelection);
    }
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
    .matchRowSelected {
      background: var(--mdc-theme-surface);
      cursor: pointer;
    }
    .hiddenRow {
      color: grey;
      font-style: italic;
      text-align: start; /* Show text even if the table is very wide. */
    }
    .hiddenRow:hover {
      cursor: pointer;
    }

    .missing {
      background: var(--mdc-theme-surface);
    }
  `;
}

// Helper class only used to return different types from getRowsToRender().
class RowsToRender {
  numColumns = 0;
  rows = new Array<Match>();
  firstDisplayedRowIndex = 0;
  // Initialize these fields to deduce their type.
  truncatedRowsBefore = html``;
  truncatedRowsAfter = html``;
}
