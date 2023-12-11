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

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {styleMap} from 'lit/directives/style-map.js';

import {Batch} from './entry';

/** A dot colored according to the batch, followed by the batch name. */
@customElement('batch-name-ui')
export class BatchNameUi extends LitElement {
  @property() batch!: Batch;

  override render() {
    const description = `${this.batch.codec} ${this.batch.version} (${
        this.batch.timeStringShort})`;
    const diskColor = {'background-color': this.batch.color};
    return html`
        <span title="${description}">
          <span class="disk" style=${styleMap(diskColor)}></span>
          <span class="mono">${this.batch.name}</span>
        </span>`;
  }

  static override styles = css`
    .disk {
      display: inline-block;
      width: 0.7em;
      height: 0.7em;
      border-radius: 0.7em;
      vertical-align: middle;
    }
    .mono {
      background: var(--mdc-theme-background);
      font-family: monospace;
      vertical-align: middle;
    }
  `;
}
