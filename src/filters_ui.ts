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

import '@material/web/menu/menu';
import '@material/web/menu/menu-item';
import '@material/web/icon/icon';
import '@material/web/button/filled-button';
import './filter_generic_ui';
import './filter_range_ui';
import './filter_string_set_ui';
import './filter_web_bpp_ui';

import {MdFilledButton} from '@material/web/button/filled-button';
import {MdMenu} from '@material/web/menu/menu';
import {MenuItem} from '@material/web/menu/menu-item';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {BatchSelection} from './batch_selection';
import {Field, FieldId} from './entry';
import {dispatch, EventType, FilterChanged, listen} from './events';
import {FieldFilter, FieldFilterRange, FieldFilterStringSet, FieldFilterWithIndex} from './filter';
import {FieldFilterWebBpp} from './filter_ranges';
import {State} from './state';

/** Component displaying filters. */
@customElement('filters-ui')
export class FiltersUi extends LitElement {
  @property({attribute: false}) state!: State;
  @property() batchSelection!: BatchSelection;

  @query('#addFilterMenu') private readonly addFilterMenu!: MdMenu;
  @query('#addFilterButton') private readonly addFilterButton!: MdFilledButton;

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
      <md-filled-button raised
        @click=${() => {
      this.addFilterMenu.open = !this.addFilterMenu.open;
    }}
        title="Add filter"
        id="addFilterButton">
        <md-icon>add</md-icon>
        <md-icon>filter_alt</md-icon>
      </md-filled-button>
      <md-menu
        anchor="addFilterButton"
        id="addFilterMenu">
        ${
        this.batchSelection.fieldFilters.map(
            (filter: FieldFilterWithIndex) => filter.fieldFilter.enabled ?
                html`<md-menu-item disabled class="menuItemDisabled">
                ${
                    filter.fieldFilter.displayName(
                        batch.fields[filter.fieldIndex])}
              </md-menu-item>` :
                html`<md-menu-item
        @click=${() => {
                  filter.fieldFilter.enabled = true;
                  dispatch(
                      EventType.FILTER_CHANGED,
                      {batchIndex: this.batchSelection.batch.index});
                }}>
                ${
                    filter.fieldFilter.displayName(
                        batch.fields[filter.fieldIndex])}
              </md-menu-item>`)}
      </md-menu>
    </span>`;
  }

  private renderFilter(field: Field, fieldFilter: FieldFilter) {
    if (!fieldFilter.enabled) return html``;
    const pointsAreFilteredOut = fieldFilter.actuallyFiltersPointsOut(field);
    if (fieldFilter instanceof FieldFilterRange) {
      return html`
        <filter-ui-range
          .batchIndex=${this.batchSelection.batch.index}
          .field=${field}
          .filter=${fieldFilter}
          class="${pointsAreFilteredOut ? 'opaque' : 'translucent'}">
        </filter-ui-range>`;
    } else if (fieldFilter instanceof FieldFilterStringSet) {
      return html`
        <filter-ui-string-set
          .batchIndex=${this.batchSelection.batch.index}
          .field=${field}
          .filter=${fieldFilter}
          class="${pointsAreFilteredOut ? 'opaque' : 'translucent'}">
        </filter-ui-string-set>`;
    } else if (fieldFilter instanceof FieldFilterWebBpp) {
      return html`
        <filter-ui-web-bpp
          .batchIndex=${this.batchSelection.batch.index}
          .field=${field}
          .filter=${fieldFilter}
          class="${pointsAreFilteredOut ? 'opaque' : 'translucent'}">
        </filter-ui-web-bpp>`;
    } else {
      return html`
        <filter-ui-generic
          .batchIndex=${this.batchSelection.batch.index}
          .field=${field}
          .filter=${fieldFilter}
          class="${pointsAreFilteredOut ? 'opaque' : 'translucent'}">
        </filter-ui-generic>`;
    }
  }

  override render() {
    const batch = this.batchSelection.batch;
    const numEnabledFilters =
        this.batchSelection.fieldFilters
            .filter(
                (fieldFilter) => fieldFilter.fieldFilter.enabled &&
                    fieldFilter.fieldFilter.actuallyFiltersPointsOut(
                        batch.fields[fieldFilter.fieldIndex]))
            .length;
    return html`
        <div class="horizontalFlex">
          <div id="filterChip">
            <md-icon>filter_alt</md-icon>
            ${numEnabledFilters}
          </div>
          <h2>active filters</h2>
          ${this.renderAddFilterMenu()}
        </div>
        <div class="filter-uis-parent">
          <div class="filter-uis">
            ${
        this.batchSelection.fieldFilters.map(
            (fieldFilter: FieldFilterWithIndex) => this.renderFilter(
                batch.fields[fieldFilter.fieldIndex], fieldFilter.fieldFilter))}
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
      background: var(--md-sys-color-primary);
      color: var(--md-sys-color-background);
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 20px;
    }
    h2 {
      margin: 0;
      color: var(--md-sys-color-text);
    }

    #addFilterParent {
      /* md-menu and its anchor need a parent with position set to relative. */
      position: relative;
    }
    #addFilterButton {
      --md-filled-button-label-text-line-height: 1em;
      --md-filled-button-container-height: 32px;
    }
    md-menu {
      /* Otherwise the menu is clipped by the parent's overflow:hidden.
       * Unfortunately this prevents the menu from properly reducing in height
       * when there is not enough space to display all items.
       */
      position: fixed;
      /* This way all items should fit on screen. */
      --md-menu-item-one-line-container-height: 20px;
      --md-menu-item-top-space: 0;
      --md-menu-item-bottom-space: 0;
      /* Otherwise the menu is rendered under the md checkboxes. */
      z-index: 6;
      white-space: nowrap;
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
