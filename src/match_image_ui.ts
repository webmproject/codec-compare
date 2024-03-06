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

import '@material/mwc-fab';
import '@material/mwc-icon';
import './batch_name_ui';
import './filtered_images_ui';
import './filters_ui';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {BatchSelection} from './batch_selection';
import {getFinalValue} from './constant';
import {FieldId} from './entry';
import {State} from './state';

/** Component displaying the source image of one selected Match. */
@customElement('match-image-ui')
export class MatchImageUi extends LitElement {
  @property({attribute: false}) state!: State;

  /** The selected batch and the index of the Match. */
  @property({attribute: false}) batchSelection!: BatchSelection;
  @property({attribute: false}) matchIndex!: number;

  override render() {
    if (!this.batchSelection) return html``;
    const reference =
        this.state.batchSelections[this.state.referenceBatchSelectionIndex]
            .batch;
    const match = this.batchSelection.matchedDataPoints.rows[this.matchIndex];

    const sourceImagePath = getFinalValue(
        reference, reference.rows[match.rightIndex], FieldId.SOURCE_IMAGE_PATH);
    if (sourceImagePath === undefined) return html``;

    let referenceImagePath = getFinalValue(
        reference, reference.rows[match.rightIndex],
        FieldId.DECODED_IMAGE_PATH);
    if (referenceImagePath === undefined) {
      referenceImagePath = getFinalValue(
          reference, reference.rows[match.rightIndex],
          FieldId.ENCODED_IMAGE_PATH);
    }

    let selectionImagePath = getFinalValue(
        this.batchSelection.batch,
        this.batchSelection.batch.rows[match.leftIndex],
        FieldId.DECODED_IMAGE_PATH);
    if (selectionImagePath === undefined) {
      selectionImagePath = getFinalValue(
          this.batchSelection.batch,
          this.batchSelection.batch.rows[match.leftIndex],
          FieldId.ENCODED_IMAGE_PATH);
    }

    let link;
    const compare =
        referenceImagePath !== undefined && selectionImagePath !== undefined;
    if (compare) {
      const params = new URLSearchParams();
      params.set('bimg', String(sourceImagePath));
      params.set('btxt', 'original');
      params.set('rimg', String(referenceImagePath));
      params.set('rtxt', reference.name);
      params.set('limg', String(selectionImagePath));
      params.set('ltxt', this.batchSelection.batch.name);
      link = `visualizer.html?${params.toString()}`;
    } else {
      link = String(sourceImagePath);
    }

    return html`
      <a href="${link}" target="_blank">
        <img src="${String(sourceImagePath)}"/>
        <div id="imageOverlay">
          <mwc-icon>${compare ? 'compare' : 'image'}</mwc-icon>
          <mwc-icon>open_in_new</mwc-icon>
        </div>
      </a>`;
  }

  static override styles = css`
    :host {
      overflow: hidden;
      display: flex;
      justify-content: center;
    }
    a {
      box-shadow: rgba(0, 0, 0, 0.3) 0px 0px 6px 0px;
      transition: box-shadow 0.2s;
      margin: 7px;
      text-decoration: none;
      overflow: hidden;
      position: relative; /* For imageOverlay absolute position to work. */
    }
    a:hover {
      /* Elevate the image when the cursor hovers it. */
      box-shadow: rgba(0, 0, 0, 0.5) 0px 0px 6px 0px;
      cursor: zoom-in;
    }
    img {
      /* Expect a wider room than the image ratio, so try to fit on height. */
      min-height: 64px;
      max-height: 100%;
    }

    #imageOverlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 0;
      transition: opacity 0.2s;
    }
    #imageOverlay:hover{
      opacity: 1;
    }
    #imageOverlay > mwc-icon {
      color: var(--mdc-theme-background);
      font-size: 26px;
    }
  `;
}
