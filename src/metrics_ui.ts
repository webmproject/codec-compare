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

import '@material/mwc-fab';
import '@material/mwc-menu';
import './metric_ui';

import {Fab} from '@material/mwc-fab';
import {Menu} from '@material/mwc-menu';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {dispatch, EventType, listen} from './events';
import {FieldMetric} from './metric';
import {State} from './state';

/** Component displaying each enabled MetricUi. */
@customElement('metrics-ui')
export class MetricsUi extends LitElement {
  @property({attribute: false}) state!: State;

  @query('#addMetricMenu') private readonly addMetricMenu!: Menu;
  @query('#addMetricButton') private readonly addMetricButton!: Fab;

  override connectedCallback() {
    super.connectedCallback();
    listen(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      this.requestUpdate();
    });
  }

  private renderAddMetricMenuItems() {
    return html`${this.state.metrics.map((metric: FieldMetric) => {
      const fieldName =
          this.state.batches[0].fields[metric.fieldIndices[0]].displayName;
      return metric.enabled ?
          html`<mwc-list-item disabled class="menuItemDisabled"
            >${fieldName}</mwc-list-item
          >` :
          html`<mwc-list-item>${fieldName}</mwc-list-item>`;
    })}`;
  }

  private renderAddMetricMenu() {
    // mwc-menu and its anchor need a parent with position set to relative.
    return html`<span class="cornered" style="position: relative;">
      <mwc-fab
        mini
        icon="add"
        title="Add metric"
        @click=${() => {
      this.addMetricMenu.show();
    }}
        id="addMetricButton"></mwc-fab>
      <mwc-menu
        .anchor=${this.addMetricButton}
        menuCorner="END"
        id="addMetricMenu"
        @action=${(e: CustomEvent) => {
      this.state.metrics[e.detail.index].enabled = true;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
    }}>
        ${this.renderAddMetricMenuItems()}
      </mwc-menu>
    </span>`;
  }

  private renderMetric(
      metric: FieldMetric, index: number, numEnabledMetrics: number) {
    const batch = this.state.batchSelections[0].batch;
    const field = batch.fields[metric.fieldIndices[batch.index]];
    const isFirst = index === 0;
    const isLast = index === numEnabledMetrics - 1;

    return html`<metric-ui
      .displayName=${field.displayName}
      .description=${field.description}
      .metric=${metric}
      .isFirst=${isFirst}
      .isLast=${isLast}></metric-ui>`;
  }

  override render() {
    const numEnabledMetrics =
        this.state.metrics.filter(metric => metric.enabled).length;
    let index = 0;
    return html`
        ${
        this.state.metrics.map(
            metric => metric.enabled ?
                this.renderMetric(metric, index++, numEnabledMetrics) :
                '')}
        ${this.renderAddMetricMenu()}`;
  }

  static override styles = css`
    :host {
      background: var(--mdc-theme-background);
      padding: 6px;
      box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.2);
      border-radius: 16px;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 6px;
    }
    .cornered {
      align-self: flex-end;
      margin-left: auto;
    }
    .menuItemDisabled {
      color: grey;
    }

    #addMetricButton {
      /* Save screen space. */
      margin: -6px;
    }
  `;
}
