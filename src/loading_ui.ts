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

import '@material/mwc-linear-progress';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

/** Full-window component with a loading bar and some text. */
@customElement('loading-ui')
export class LoadingUi extends LitElement {
  /** Displayed elements */
  @property() text = 'Loading';
  @property({type: Number}) progress = 0;

  override render() {
    const progressFirstHalf = Math.min(1, this.progress * 2);
    const progressSecondHalf = Math.max(0, this.progress * 2 - 1);
    return html`<div class="card">
      <p>${this.text}</p>
      <mwc-linear-progress
        progress="${progressSecondHalf}"
        buffer="${progressFirstHalf}">
      </mwc-linear-progress>
    </div>`;
  }

  static override styles = css`
    :host {
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      z-index: 10;
      background: var(--mdc-theme-surface);
      opacity: 1;
      transition: opacity 0.3s;
      cursor: wait;
    }

    .card {
      padding: 16px;
      background: var(--mdc-theme-background);
      box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.2);
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 0;
      min-width: 500px;
    }

    p {
      margin: 10px;
      padding: 0;
      color: var(--mdc-theme-text);
      font-size: 26px;
    }
  `;
}
