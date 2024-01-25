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

import '@material/mwc-menu';
import './mwc_button_fit';
import './tooltip_ui';

import {Button} from '@material/mwc-button';
import {Menu} from '@material/mwc-menu';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {FieldId} from './entry';
import {dispatch, EventType} from './events';
import {FieldMatcher} from './matcher';

/** Component displaying one FieldMatcher. */
@customElement('matcher-ui')
export class MatcherUi extends LitElement {
  /** Field info from multiple batches and the matcher linking them. */
  @property() isNumber!: boolean;
  @property() displayName!: string;
  @property() description!: string;
  @property() fieldId!: FieldId;
  @property() matcher!: FieldMatcher;
  @property() isFirst!: boolean;
  @property() isLast!: boolean;

  /** The tolerance values that the user can assign to a matcher. */
  private readonly AVAILABLE_TOLERANCE =
      [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.10, 0.20];

  @query('#toleranceButton') private readonly toleranceButton!: Button;
  @query('#toleranceMenu') private readonly toleranceMenu!: Menu;

  private renderToleranceButton() {
    if (!this.isNumber) {
      return html``;
    }

    // mwc-menu and its anchor need a parent with position set to relative.
    return html`<span style="position: relative;">
      <mwc-button-fit
        raised
        dense
        label="${toleranceRangePercent(this.matcher.tolerance)}"
        title="The images are matched if they have a ratio of ${
        this.displayName} within ${
        toleranceRange(
            this.matcher
                .tolerance)}. Click to set the tolerance to a different value."
        @click=${() => {
      this.toleranceMenu.show();
    }}
        id="toleranceButton"></mwc-button-fit>
      <mwc-menu
        .anchor=${this.toleranceButton}
        @action=${(e: CustomEvent) => {
      this.matcher.tolerance = this.AVAILABLE_TOLERANCE[e.detail.index];
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
      this.requestUpdate();
    }}
        id="toleranceMenu">
        ${this.AVAILABLE_TOLERANCE.map((availableTolerance: number) => html`
        <mwc-list-item>
          Set tolerance to ${toleranceRangePercent(availableTolerance)}
        </mwc-list-item>`)}
      </mwc-menu>
    </span>`;
  }

  private renderDeleteButton() {
    if (this.fieldId === FieldId.SOURCE_IMAGE_NAME) {
      // title on a disabled mwc-button-fit does not work. Encapsulate in a div.
      return html`<div
        title="This matcher cannot be deleted. Two codecs can only be compared when encoding the same source image.">
        <mwc-button-fit raised dense disabled
          ><mwc-icon>delete</mwc-icon></mwc-button-fit
        >
      </div>`;
    }

    return html`
      <mwc-button-fit
        raised
        dense
        @click=${() => {
      this.matcher.enabled = false;
      dispatch(EventType.MATCHER_OR_METRIC_CHANGED);
    }}
        title="Delete matcher">
        <mwc-icon>delete</mwc-icon>
      </mwc-button-fit>`;
  }

  override render() {
    const tokens = this.description.split('Warning:', /*limit=*/ 2);
    const description = tokens[0].trim();
    const tooltip = tokens.length === 1 ?
        '' :
        html` <tooltip-ui icon="warning" .text="${
            tokens[1].trim()}"></tooltip-ui>`;
    return html`
      ${this.renderDeleteButton()}
      <p>
        ${this.isFirst ? 'for' : ''} the same
        <strong title="${description}">${this.displayName}</strong>${
        this.renderToleranceButton()}${tooltip}${this.isLast ? ',' : ' and'}
      </p>`;
  }

  static override styles = css`
    :host {
      background-color: var(--mdc-theme-surface);
      margin: 0;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }
    p {
      margin: 0;
      color: var(--mdc-theme-text);
      font-size: 20px;
    }

    mwc-icon {
      font-size: 20px;
    }
  `;
}

/**
 * Returns a user-friendly string of the range of values accepted by a
 * tolerance. See Matcher.tolerance.
 */
function toleranceRange(tolerance: number) {
  return `[${(1 - tolerance).toFixed(4)}:${
      (1 + tolerance / (1 - tolerance)).toFixed(4)}]`;
}

function toleranceRangePercent(tolerance: number) {
  return `[-${(tolerance * 100).toFixed(1)}%:+${
      (100 * tolerance / (1 - tolerance)).toFixed(1)}%]`;
}
