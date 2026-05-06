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
import './matcher_ui';

import {MdFab} from '@material/web/fab/fab';
import {MdMenu} from '@material/web/menu/menu';
import {MenuItem} from '@material/web/menu/menu-item';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {FieldId} from './entry';
import {dispatch, EventType, listen} from './events';
import {FieldMatcher} from './matcher';
import {State} from './state';

/** Component displaying each enabled MatcherUi. */
@customElement('matchers-ui')
export class MatchersUi extends LitElement {
  @property({attribute: false}) state!: State;

  @query('#addMatcherMenu') private readonly addMatcherMenu!: MdMenu;
  @query('#addMatcherButton') private readonly addMatcherButton!: MdFab;

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
          html`<md-menu-item disabled>
            ${fieldName}</md-menu-item>` :
          html`<md-menu-item @click=${(e: CustomEvent<{item: MenuItem}>) => {
            matcher.enabled = true;
            dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
          }}>${fieldName}</md-menu-item>`;
    })}`;
  }

  private renderAddMatcherMenu() {
    // md-menu and its anchor need a parent with position set to relative.
    return html`<span class="cornered" style="position: relative;">
      <md-fab
        @click=${() => {
      this.addMatcherMenu.open = !this.addMatcherMenu.open;
    }}
        id="addMatcherButton">
        <md-icon slot="icon">add</md-icon>
      </md-fab>
      <md-menu
        anchor="addMatcherButton"
        positioning="popover"
        id="addMatcherMenu">
        ${this.renderAddMatcherMenuItems()}
      </md-menu>
    </span>`;
  }

  private renderMatcher(
      matcher: FieldMatcher, index: number, numEnabledMatchers: number) {
    const fieldId = this.state.batches[0].fields[matcher.fieldIndices[0]].id;
    if (this.state.rdMode && fieldId === FieldId.SOURCE_IMAGE_NAME) {
      return html``;
    }

    let isNumber = true;
    let displayName = '';
    let description = '';
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

    #addMatcherButton {
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
