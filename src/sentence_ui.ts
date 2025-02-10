// Copyright 2024 Google LLC
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
import './matcher_ui';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {BatchSelection} from './batch_selection';
import {Batch, DISTORTION_METRIC_FIELD_IDS, Field, FieldId, fieldUnit} from './entry';
import {dispatch, EventType, listen} from './events';
import {FieldFilter} from './filter';
import {FieldMatcher} from './matcher';
import {FieldMetric, FieldMetricStats} from './metric';
import {State} from './state';

/**
 * Component displaying a summary of the whole comparison ("simple interface").
 */
@customElement('sentence-ui')
export class SentenceUi extends LitElement {
  @property({attribute: false}) state!: State;

  override connectedCallback() {
    super.connectedCallback();
    listen(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      this.requestUpdate();
    });
  }

  // Matchers

  private renderMatcher(
      matcher: FieldMatcher, index: number, numEnabledMatchers: number) {
    let displayName: string|undefined = undefined;
    let subName: string|undefined = undefined;
    for (const batch of this.state.batches) {
      const field = batch.fields[matcher.fieldIndices[batch.index]];
      if (field.displayName === '') continue;
      if (DISTORTION_METRIC_FIELD_IDS.includes(field.id)) {
        displayName = 'distortion';
        subName = field.displayName;
      } else {
        displayName = field.displayName;
      }
      break;
    }
    if (displayName === '') return html``;

    const isFirst = index === 0;
    const isLast = index === numEnabledMatchers - 1;
    const tolerance: string|undefined = matcher.tolerance !== 0 ?
        `±${(matcher.tolerance * 100).toFixed(1)}%` :
        undefined;
    const paren = subName ?
        (tolerance ? ` (${subName} ${tolerance})` : ` (${subName})`) :
        (tolerance ? ` (${tolerance})` : '');
    const lineEnd = isLast ? this.state.showRelativeRatios ? ',' : '' : 'and';

    return html`
        <p>
          ${isFirst ? 'For' : ''} the same ${displayName}${paren}${lineEnd}
        </p>`;
  }

  private renderMatchers() {
    const numEnabledMatchers =
        this.state.matchers.filter(matcher => matcher.enabled).length;
    let index = 0;
    return html`
        ${
        this.state.matchers.map(
            matcher => matcher.enabled ?
                this.renderMatcher(matcher, index++, numEnabledMatchers) :
                '')}`;
  }

  // Batches, filters and metrics

  private renderFilter(field: Field, filter: FieldFilter) {
    if (field.isNumber) {
      if (field.isInteger) {
        if (filter.rangeStart === filter.rangeEnd) {
          return `${field.displayName} limited to ${filter.rangeStart}`;
        }
        return `${field.displayName} limited to [${filter.rangeStart}:${
            filter.rangeEnd}]`;
      }

      if (filter.rangeStart === filter.rangeEnd) {
        return `${field.displayName} limited to ${
            filter.rangeStart.toFixed(1)}`;
      }
      return `${field.displayName} limited to [${
          filter.rangeStart.toFixed(1)}:${filter.rangeEnd.toFixed(1)}]`;
    }

    if (filter.uniqueValues.size === 1) {
      return `${field.displayName} limited to ${
          filter.uniqueValues.values().next().value}`;
    }
    return `${field.displayName} limited`;
  }

  private renderFilters(batchSelection: BatchSelection) {
    const batch = batchSelection.batch;
    let numFilters = 0;
    const filters = html`${
        batchSelection.fieldFilters.map(
            (filter: FieldFilter, fieldIndex: number) => {
              const field = batch.fields[fieldIndex];
              return filter.actuallyFiltersPointsOut(field) ?
                  html`${numFilters++ > 0 ? ', ' : ''}${
                      this.renderFilter(field, filter)}` :
                  '';
            })}`;
    if (numFilters === 0) return html``;
    return html`<br><span class="filters">(${filters})</span>`;
  }

  private renderAbsoluteMetric(
      batch: Batch, metric: FieldMetric, stats: FieldMetricStats) {
    const field = batch.fields[metric.fieldIndices[batch.index]];
    const mean = stats.getAbsoluteMean().toFixed(2);

    switch (field.id) {
      case FieldId.ENCODED_SIZE:
        return html`weigh ${mean} bytes`;
      case FieldId.ENCODING_DURATION:
        return html`take ${mean} seconds to encode`;
      case FieldId.DECODING_DURATION:
        return html`take ${mean} seconds to decode`;
      case FieldId.RAW_DECODING_DURATION:
        return html`take ${
            mean} seconds to decode (exclusive of color conversion)`;
      default:
        const unit = fieldUnit(field.id);
        return html`result in ${mean}${unit} as ${field.displayName}`;
    }
  }

  private renderRelativeMetric(
      batch: Batch, metric: FieldMetric, stats: FieldMetricStats) {
    const field = batch.fields[metric.fieldIndices[batch.index]];
    const mean = stats.getRelativeMean(this.state.useGeometricMean);

    if (mean === 1) {
      switch (field.id) {
        case FieldId.ENCODED_SIZE:
        case FieldId.ENCODED_BITS_PER_PIXEL:
          return html`as big`;
        case FieldId.ENCODING_DURATION:
          return html`as fast to encode`;
        case FieldId.DECODING_DURATION:
          return html`as slow to decode`;
        case FieldId.RAW_DECODING_DURATION:
          return html`as slow to decode (exclusive of color conversion)`;
        default:
          return html`of the same ${field.displayName}`;
      }
    }

    const neg = mean < 1;
    const xTimes = String(
        neg ? (1 / mean).toFixed(2) + ' times' : mean.toFixed(2) + ' times');

    switch (field.id) {
      case FieldId.ENCODED_SIZE:
      case FieldId.ENCODED_BITS_PER_PIXEL:
        return html`${xTimes} ${neg ? 'smaller' : 'bigger'}`;
      case FieldId.ENCODING_DURATION:
        return html`${xTimes} ${neg ? 'faster' : 'slower'} to encode`;
      case FieldId.DECODING_DURATION:
        return html`${xTimes} ${neg ? 'faster' : 'slower'} to decode`;
      case FieldId.RAW_DECODING_DURATION:
        return html`${xTimes} ${
            neg ? 'faster' :
                  'slower'} to decode (exclusive of color conversion)`;
      default:
        return html`${xTimes} ${neg ? 'lower' : 'higher'} on the ${
            field.displayName} scale`;
    }
  }

  private renderBatch(batchSelection: BatchSelection) {
    const batch = batchSelection.batch;
    return html`
        <p>
        images encoded with <batch-name-ui .batch=${batch} @click=${() => {
      dispatch(EventType.BATCH_INFO_REQUEST, {batchIndex: batch.index});
    }}></batch-name-ui>
        ${this.renderFilters(batchSelection)}
        ${this.state.showRelativeRatios ? 'are' : ''}
        ${this.state.metrics.map((metric: FieldMetric, metricIndex: number) => {
      return metric.enabled ?
          html`<br>${
              this.state.showRelativeRatios ?
                  this.renderRelativeMetric(
                      batch, metric, batchSelection.stats[metricIndex]) :
                  this.renderAbsoluteMetric(
                      batch, metric, batchSelection.stats[metricIndex])},` :
          '';
    })}
        </p>`;
  }

  private renderBatches() {
    return html`${this.state.batchSelections.map((batchSelection, index) => {
      return this.state.referenceBatchSelectionIndex === index ||
              batchSelection.isDisplayed === false ||
              batchSelection.matchedDataPoints.rows.length === 0 ?
          '' :
          this.renderBatch(batchSelection);
    })}`;
  }

  // Reference

  private renderMatcherReference(referenceBatch: BatchSelection) {
    if (this.state.showRelativeRatios) {
      return html``;
    }
    const batch = referenceBatch.batch;
    return html`
      <p id="referenceBatch">
        as <batch-name-ui .batch=${batch} @click=${() => {
      dispatch(EventType.BATCH_INFO_REQUEST, {batchIndex: batch.index});
    }}></batch-name-ui>${this.renderFilters(referenceBatch)},
      </p>`;
  }

  private renderReference(referenceBatch: BatchSelection) {
    if (this.state.showRelativeRatios) {
      const batch = referenceBatch.batch;
      return html`
        <p id="referenceBatch">
          compared to <batch-name-ui .batch=${batch} @click=${() => {
        dispatch(EventType.BATCH_INFO_REQUEST, {batchIndex: batch.index});
      }}></batch-name-ui>${this.renderFilters(referenceBatch)}.</p>`;
    }
    return html`<p id="referenceBatch">on average.</p>`;
  }

  override render() {
    let referenceBatch: BatchSelection|undefined = undefined;
    if (this.state.referenceBatchSelectionIndex >= 0 &&
        this.state.referenceBatchSelectionIndex <
            this.state.batchSelections.length) {
      referenceBatch =
          this.state.batchSelections[this.state.referenceBatchSelectionIndex];
    }

    return html`
      <div id="matchers">
        ${this.renderMatchers()}
        ${referenceBatch ? this.renderMatcherReference(referenceBatch) : ''}
      </div>
      <div id="batches">
        ${this.renderBatches()}
      </div>
      ${referenceBatch ? this.renderReference(referenceBatch) : ''}`;
  }

  static override styles = css`
    :host {
      padding: 10px 0;
    }
    p {
      margin: 10px 0;
      color: var(--mdc-theme-text);
      font-size: 20px;
    }
    batch-name-ui:hover {
      cursor: pointer;
    }
    .filters{
      font-size: 14px;
    }
  `;
}
