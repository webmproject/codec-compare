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

import '@material/web/fab/fab';
import '@material/web/menu/menu';
import '@material/web/menu/menu-item';
import '@material/web/icon/icon';
import './metric_ui';

import {MdFab} from '@material/web/fab/fab';
import {MdMenu} from '@material/web/menu/menu';
import {MenuItem} from '@material/web/menu/menu-item';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {dispatch, EventType, listen} from './events';
import {FieldMetric} from './metric';
import {State} from './state';

/** Component displaying each enabled MetricUi. */
@customElement('metrics-ui')
export class MetricsUi extends LitElement {
  @property({attribute: false}) state!: State;

  @query('#addMetricMenu') private readonly addMetricMenu!: MdMenu;
  @query('#addMetricButton') private readonly addMetricButton!: MdFab;

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
      return metric.enabled ? html`<md-menu-item disabled>
            ${fieldName}</md-menu-item>` :
                              html`<md-menu-item
            @click=${() => {
                                metric.enabled = true;
                                dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
                              }}>${fieldName}</md-menu-item>`;
    })}`;
  }

  private renderAddMetricMenu() {
    // md-menu and its anchor need a parent with position set to relative.
    return html`<span class="cornered" style="position: relative;">
      <md-fab
        @click=${() => {
      this.addMetricMenu.open = !this.addMetricMenu.open;
    }}
        id="addMetricButton">
        <md-icon slot="icon">add</md-icon>
      </md-fab>
      <md-menu
        anchor="addMetricButton"
        positioning="popover"
        id="addMetricMenu">
        ${this.renderAddMetricMenuItems()}
      </md-menu>
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
      background: var(--md-sys-color-background);
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

    #addMetricButton {
      --md-fab-container-width: 32px;
      --md-fab-container-height: 32px;
      --md-fab-icon-size: 20px;
    }

    md-menu-item {
      --md-menu-item-one-line-container-height: 20px;
      --md-menu-item-top-space: 0;
      --md-menu-item-bottom-space: 0;
    }
  `;
}
