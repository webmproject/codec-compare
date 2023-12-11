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

import {Button} from '@material/mwc-button';
import {customElement} from 'lit/decorators.js';

/** Same as <mwc-button> but with custom width and height. */
@customElement('mwc-button-fit')
export class MwcButtonFit extends Button {
  protected override firstUpdated() {
    const button = this.shadowRoot!.querySelector('button')!;
    button.style.minWidth = '0';
    button.style.height = 'auto';
    button.style.padding = '2px 4px';
  }
}