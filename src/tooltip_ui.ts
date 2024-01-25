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

import '@material/mwc-icon';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

/**
 * Component displaying a tooltip with selectable text when an icon is hovered.
 */
@customElement('tooltip-ui')
export class TooltipUi extends LitElement {
  @property() icon: string = 'question_mark';
  @property() text: string = 'n/a';

  override render() {
    return html`
        <mwc-icon>${this.icon}</mwc-icon>
        <p>${this.text}</p>`;
  }

  static override styles = css`
    :host {
      position: relative; /* For "position: absolute;" below to work. */
    }

    mwc-icon {
      color: var(--mdc-theme-primary);
      font-size: 24px;
      vertical-align: middle;
    }

    p {
      position: absolute;
      left: -88px;
      top: 0;
      width: 200px;

      padding: 6px;
      border-radius: 6px;
      box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 6px 0px;
      background-color: var(--mdc-theme-background);
      color: var(--mdc-theme-text);
      font-size: 12px;
      text-align: justify;

      z-index: 2;
      display: none;
    }

    mwc-icon:hover~p, p:hover {
      display: block;
    }
  `;
}
