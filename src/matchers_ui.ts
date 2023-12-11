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
import './matcher_ui';

import {Fab} from '@material/mwc-fab';
import {ActionDetail} from '@material/mwc-list';
import {Menu} from '@material/mwc-menu';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {dispatch, EventType, listen} from './events';
import {FieldMatcher} from './matcher';
import {State} from './state';

/** Component displaying each enabled MatcherUi. */
@customElement('matchers-ui')
export class MatchersUi extends LitElement {
  @property({attribute: false}) state!: State;

  @query('#addMatcherMenu') private readonly addMatcherMenu!: Menu;
  @query('#addMatcherButton') private readonly addMatcherButton!: Fab;

  override connectedCallback() {
    super.connectedCallback();
    listen(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      this.requestUpdate();
    });
  }

  private renderAddMatcherMenuItems() {
    return html`${this.state.matchers.map((matcher: FieldMatcher) => {
      const fieldName =
          this.state.batches[0].fields[matcher.fieldIndices[0]].displayName;
      return matcher.enabled ?
          html`<mwc-list-item disabled class="menuItemDisabled"
            >${fieldName}</mwc-list-item
          >` :
          html`<mwc-list-item>${fieldName}</mwc-list-item>`;
    })}`;
  }

  private renderAddMatcherMenu() {
    // mwc-menu and its anchor need a parent with position set to relative.
    return html`<span class="cornered" style="position: relative;">
      <mwc-fab
        mini
        icon="add"
        title="Add matcher"
        @click=${() => {
      this.addMatcherMenu.show();
    }}
        id="addMatcherButton"></mwc-fab>
      <mwc-menu
        .anchor=${this.addMatcherButton}
        menuCorner="END"
        id="addMatcherMenu"
        @action=${(e: CustomEvent<ActionDetail>) => {
      this.state.matchers[e.detail.index].enabled = true;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
    }}>
        ${this.renderAddMatcherMenuItems()}
      </mwc-menu>
    </span>`;
  }

  private renderMatcher(
      matcher: FieldMatcher, index: number, numEnabledMatchers: number) {
    let isNumber = true;
    let displayName = '';
    let description = '';
    const fieldId = this.state.batches[0].fields[matcher.fieldIndices[0]].id;
    for (const batch of this.state.batches) {
      const field = batch.fields[matcher.fieldIndices[batch.index]];
      isNumber = isNumber && field.isNumber;
      if (displayName === '') displayName = field.displayName;
      if (description === '') description = field.description;
    }
    const isFirst = index === 0;
    const isLast = index === numEnabledMatchers - 1;

    return html`<matcher-ui
      .isNumber=${isNumber}
      .displayName=${displayName}
      .description=${description}
      .fieldId=${fieldId}
      .matcher=${matcher}
      .isFirst=${isFirst}
      .isLast=${isLast}></matcher-ui>`;
  }

  override render() {
    const numEnabledMatchers =
        this.state.matchers.filter(matcher => matcher.enabled).length;
    let index = 0;
    return html`
        ${
        this.state.matchers.map(
            matcher => matcher.enabled ?
                this.renderMatcher(matcher, index++, numEnabledMatchers) :
                '')}
        ${this.renderAddMatcherMenu()}`;
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

    #addMatcherButton {
      /* Save screen space. */
      margin: -6px;
    }
  `;
}
