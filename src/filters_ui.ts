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

import '@material/mwc-menu';
import '@material/mwc-icon';
import '@material/mwc-button';
import './filter_ui';

import {Button} from '@material/mwc-button';
import {ActionDetail} from '@material/mwc-list';
import {Menu} from '@material/mwc-menu';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {BatchSelection} from './batch_selection';
import {Field} from './entry';
import {dispatch, EventType, FilterChanged, listen} from './events';
import {FieldFilter} from './filter';
import {State} from './state';

/** Component displaying filters. */
@customElement('filters-ui')
export class FiltersUi extends LitElement {
  @property({attribute: false}) state!: State;
  @property() batchSelection!: BatchSelection;

  @query('#addFilterMenu') private readonly addFilterMenu!: Menu;
  @query('#addFilterButton') private readonly addFilterButton!: Button;

  private readonly onFilterChanged = (event: CustomEvent<FilterChanged>) => {
    if (event.detail.batchIndex === this.batchSelection.batch.index) {
      this.requestUpdate();
    }
  };
  override connectedCallback() {
    super.connectedCallback();
    listen(EventType.FILTER_CHANGED, this.onFilterChanged);
  }
  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener(EventType.FILTER_CHANGED, this.onFilterChanged);
  }

  private renderAddFilterMenu() {
    const batch = this.batchSelection.batch;
    return html`<span id="addFilterParent">
      <mwc-button
        raised
        dense
        @click=${() => {
      this.addFilterMenu.show();
    }}
        title="Add filter"
        id="addFilterButton">
        <mwc-icon>add</mwc-icon>
        <mwc-icon>filter_alt</mwc-icon>
      </mwc-button>
      <mwc-menu
        .anchor=${this.addFilterButton}
        id="addFilterMenu"
        @action=${(e: CustomEvent<ActionDetail>) => {
      this.batchSelection.fieldFilters[e.detail.index].enabled = true;
      dispatch(
          EventType.FILTER_CHANGED,
          {batchIndex: this.batchSelection.batch.index});
    }}>
        ${
        this.batchSelection.fieldFilters.map(
            (filter: FieldFilter, fieldIndex: number) => filter.enabled ?
                html`<mwc-list-item disabled class="menuItemDisabled">
                ${batch.fields[fieldIndex].displayName}
              </mwc-list-item>` :
                html`<mwc-list-item>
                ${batch.fields[fieldIndex].displayName}
              </mwc-list-item>`)}
      </mwc-menu>
    </span>`;
  }

  private renderFilter(field: Field, fieldFilter: FieldFilter) {
    if (!fieldFilter.enabled) return html``;
    return html`
      <filter-ui
        .batchIndex=${this.batchSelection.batch.index}
        .field=${field}
        .filter=${fieldFilter}
        class="${
        fieldFilter.actuallyFiltersPointsOut(field) ? 'opaque' :
                                                      'translucent'}">
      </filter-ui>`;
  }

  override render() {
    const batch = this.batchSelection.batch;
    const numEnabledFilters =
        this.batchSelection.fieldFilters
            .filter(
                (fieldFilter, index) =>
                    fieldFilter.actuallyFiltersPointsOut(batch.fields[index]))
            .length;
    return html`
        <div class="horizontalFlex">
          <div id="filterChip">
            <mwc-icon>filter_alt</mwc-icon>
            ${numEnabledFilters}
          </div>
          <h2>active filters</h2>
          ${this.renderAddFilterMenu()}
        </div>
        <div class="filter-uis-parent">
          <div class="filter-uis">
            ${
        batch.fields.map(
            (field: Field, fieldIndex: number) => this.renderFilter(
                field, this.batchSelection.fieldFilters[fieldIndex]))}
          </div>
          <div class="filter-uis-inner-shadow"></div>
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
    #filterChip {
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
      margin: 0;
      color: var(--mdc-theme-text);
    }

    #addFilterParent {
      /* mwc-menu and its anchor need a parent with position set to relative. */
      position: relative;
    }
    mwc-menu {
      /* Otherwise the menu is clipped by the parent's overflow:hidden.
       * Unfortunately this prevents the menu from properly reducing in height
       * when there is not enough space to display all items.
       */
      position: fixed;
      /* Otherwise the menu is rendered under the mwc checkboxes. */
      z-index: 6;
    }
    .menuItemDisabled {
      color: grey;
    }

    .filter-uis {
      display: flex;
      flex-grow: 1;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 20px;
      overflow: auto;
      border-radius: 16px;
      /* Necessary for the filter-ui shadow to not be clipped by overflow. */
      padding: 7px;
    }
    /* Not gorgeous but helps for readability when scrollbars are shown. */
    .filter-uis-parent {
      display: flex;
      position: relative;
      overflow: hidden;
    }
    .filter-uis-inner-shadow {
      border-radius: 16px;
      box-shadow: inset 0 0 7px rgba(0, 0, 0, 0.3);
      position: absolute;
      pointer-events: none;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .opaque {
      opacity: 1;
      transition: all 0.2s;
    }
    .translucent {
      opacity: 0.5;
      transition: all 0.2s;
    }
    .opaque,
    .translucent {
      box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 6px 0px;
    }
    .opaque:hover,
    .translucent:hover {
      box-shadow: rgba(0, 0, 0, 0.5) 0px 0px 6px 0px;
    }
  `;
}
