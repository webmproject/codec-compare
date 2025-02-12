// Copyright 2025 Google LLC
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

import '@material/mwc-icon-button';
import '@material/mwc-snackbar';

import {Snackbar} from '@material/mwc-snackbar';
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

/** Component that copies text to the clipboard when clicked. */
@customElement('copy-button')
export class CopyButton extends LitElement {
  @property() textToCopyInClipboard!: string;

  // There should be only one snackbar per page but one snackbar per CopyButton
  // is easier to reference.
  @query('mwc-snackbar') private readonly snackbar!: Snackbar;

  override render() {
    return html`
      <mwc-icon-button title="Copy to clipboard" icon="content_copy"
        @click=${() => {
      if (window.isSecureContext) {
        navigator.clipboard.writeText(this.textToCopyInClipboard);
        this.snackbar.labelText = 'Copied to clipboard';
        this.snackbar.show();
      } else {
        this.snackbar.labelText = 'Copy to clipboard failed';
        this.snackbar.show();
      }
    }}>
      </mwc-icon-button>
      <mwc-snackbar></mwc-snackbar>`;
  }

  static override styles = css`
    :host {
      float: right;
    }
    mwc-icon-button {
      color: var(--mdc-theme-text);
      /* Make the background disk that appears when hovered slightly bigger
       * than the icon itself, which is 24px. */
      --mdc-icon-button-size: 28px;
      /* Tighten the buttons to save space. */
      margin: -2px;
    }
  `;
}
