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
import './batch_name_ui';
import './matcher_ui';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {mergeHistograms} from './batch_merger';
import {FieldId} from './entry';
import {EventType, listen} from './events';
import {SourceCount} from './metric';
import {State} from './state';

/** Component displaying a grid of unique source media input. */
@customElement('gallery-ui')
export class GalleryUi extends LitElement {
  @property({attribute: false}) state!: State;

  override connectedCallback() {
    super.connectedCallback();
    listen(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      this.requestUpdate();
    });
  }

  private renderSourceDataSet() {
    // Assume all batches share the same source data set.
    for (const batch of this.state.batches) {
      const constant = batch.constants.find(
          constant => constant.id === FieldId.SOURCE_DATA_SET);
      if (constant) {
        return html`
          <table id="sourceDataSet">
            <tr>
              <th title="${constant.description}">${constant.displayName}</th>
            </tr>
            <tr>
              <td>${constant.value}</td>
            </tr>
          </table>`;
      }
    }
    return '';
  }

  private renderAsset(asset: SourceCount) {
    const title = `${asset.sourceName} used in ${asset.count} matches`;
    if (asset.previewPath !== undefined) {
      // Use a preview image tag.

      if (asset.sourcePath !== undefined) {
        // Use a link to open the image in a new tab.
        return html`
          <a href="${asset.sourcePath}" target="_blank" title="${title}">
            <img src="${asset.previewPath}" class="constrainedSize"
              alt="${asset.sourceName}">
            <span class="countBubble">${asset.count}</span>
            <div class="linkOverlay"><mwc-icon>open_in_new</mwc-icon></div>
          </a>`;
      }

      return html`
        <div class="constrainedSize" title="${title}">
          <img src="${asset.previewPath}" alt="${asset.sourceName}">
          <span class="countBubble">${asset.count}</span>
        </div>`;
    }

    if (asset.sourcePath !== undefined) {
      // Use a link to open the image in a new tab.
      return html`
        <a href="${asset.sourcePath}" target="_blank" class="constrainedSize"
          title="${title}">
          ${asset.sourceName}
          <span class="countBubble">${asset.count}</span>
          <div class="linkOverlay"><mwc-icon>open_in_new</mwc-icon></div>
        </a>`;
    }
    return html`
      <span class="constrainedSize" title="${title}">
        ${asset.sourceName}
        <span class="countBubble">${asset.count}</span>
      </span>`;
  }

  override render() {
    const histogram = mergeHistograms(this.state.batchSelections.map(
        batchSelection => batchSelection.histogram));

    return html`
      ${this.renderSourceDataSet()}
      <div id="gallery">
        ${histogram.map(source => this.renderAsset(source))}
      </div>`;
  }

  static override styles = css`
    :host {
      padding: 20px 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    table {
      color: var(--mdc-theme-text);
      border-collapse: collapse;
      box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.2);
    }
    th,
    td {
      padding: 3px;
      border-width: 1px;
      border-style: solid;
    }
    th {
      border-color: var(--mdc-theme-background);
      background: var(--mdc-theme-surface);
    }
    td {
      border-color: var(--mdc-theme-surface);
      font-family: monospace;
      word-break: break-word;
    }
    tr {
      background: var(--mdc-theme-background);
    }

    #gallery {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 5px;
    }
    .constrainedSize {
      max-width: 90px;
      max-height: 90px;
    }
    #gallery > * {
      overflow: hidden;
      overflow-wrap: break-word;
      text-align: center;
      color: var(--mdc-theme-text);
      box-shadow: rgba(0, 0, 0, 0.2) 0px 0px 4px 0px;
    }
    #gallery > a {
      transition: box-shadow 0.2s;
      text-decoration: none;
      position: relative; /* For linkOverlay absolute position to work. */
    }
    #gallery > a:hover {
      /* Elevate the image when the cursor hovers it. */
      box-shadow: rgba(0, 0, 0, 0.4) 0px 0px 4px 0px;
      cursor: zoom-in;
    }
    #gallery img {
      display: block; /* Fix blank space below img. */
      background-image: url('/transparency_checkerboard.webp');
    }

    .linkOverlay {
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
    .linkOverlay:hover{
      opacity: 1;
    }
    .linkOverlay > mwc-icon {
      color: var(--mdc-theme-background);
      font-size: 16px;
    }

    .countBubble {
      position: absolute;
      top: 5px;
      right: 5px;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 12px;
      color: var(--mdc-theme-background);
      background: var(--mdc-theme-primary);
    }
  `;
}
