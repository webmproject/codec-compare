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

import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import {Tab} from './tab';

/** Returns the element at domPath or null. */
function getShadowElement(domPath: string[]): Element|null {
  let element: Element|null|undefined = null;
  for (const [i, selector] of domPath.entries()) {
    element = (i === 0) ? document.querySelector(selector) :
                          element!.shadowRoot?.querySelector(selector);
    if (!element) return null;
  }
  return element;
}

/** Overlay element describing the other elements behind it. */
@customElement('help-ui')
export class HelpUi extends LitElement {
  @property() displayedTab!: Tab;

  // Always returned by render() so cannot be null.
  @query('#closeButton') private readonly closeButton!: HTMLElement;

  // Containers of descriptive text blocks.
  @query('#numComparisonsDescription')
  private readonly numComparisonsDescription!: HTMLElement;
  @query('#matchersDescription')
  private readonly matchersDescription!: HTMLElement;
  @query('#metricsDescription')
  private readonly metricsDescription!: HTMLElement;
  @query('#batchSelectionsDescription')
  private readonly batchSelectionsDescription!: HTMLElement;
  @query('#graphDescription') private readonly graphDescription!: HTMLElement;
  @query('#galleryDescription')
  private readonly galleryDescription!: HTMLElement;

  onOpen() {
    // Position the closing button on top of the home page's help button
    // (the button opening this panel).
    const helpButton = getShadowElement(['codec-compare', '#helpButton']);
    if (helpButton) {
      const rect = helpButton.getBoundingClientRect();
      this.closeButton.style.top = `${rect.y}px`;
      this.closeButton.style.left = `${rect.x}px`;
    }

    const positionElementAtTheRightOf =
        (element: HTMLElement, domPath: string[]) => {
          const referenceElement = getShadowElement(domPath);
          if (referenceElement) {
            const rect = referenceElement.getBoundingClientRect();
            element.style.top = `${rect.y}px`;
            element.style.left = `${rect.x + rect.width}px`;
            element.style.right = '60px';
            element.style.height = `${rect.height}px`;
          }
        };

    // The main interactive user interface elements are on the fixed left menu.
    // Position the "tooltips" on the right of them to keep them visible.
    // The "tooltips" cover parts of the graph but this works visually.
    if (this.displayedTab === Tab.SUMMARY) {
      positionElementAtTheRightOf(
          this.matchersDescription,
          ['codec-compare', 'sentence-ui', '#matchers']);
      positionElementAtTheRightOf(
          this.batchSelectionsDescription,
          ['codec-compare', 'sentence-ui', '#batches']);
    } else if (this.displayedTab === Tab.STATS) {
      positionElementAtTheRightOf(
          this.numComparisonsDescription, ['codec-compare', '#numComparisons']);
      positionElementAtTheRightOf(
          this.matchersDescription, ['codec-compare', 'matchers-ui']);
      positionElementAtTheRightOf(
          this.metricsDescription, ['codec-compare', 'metrics-ui']);
      positionElementAtTheRightOf(
          this.batchSelectionsDescription,
          ['codec-compare', 'batch-selections-ui']);
    } else if (this.displayedTab === Tab.GALLERY) {
      positionElementAtTheRightOf(
          this.galleryDescription,
          ['codec-compare', 'gallery-ui', '#sourceDataSet']);
    }

    this.graphDescription.style.bottom = '60px';
    this.graphDescription.style.left = '600px';
    this.graphDescription.style.height = '';

    // Note that the positions above will be stale if the elements used as
    // anchors change. Fortunately their positions and sizes are fixed on window
    // resizing, and their content can only change by closing the Help panel.

    this.style.display = 'block';
    this.requestUpdate();
  }

  private renderSummaryHelp() {
    return html`
      <div class="descriptionHolder" id="numComparisonsDescription">
      </div>

      <div class="descriptionHolder" id="matchersDescription">
        <div class="bracket"></div>
        <p>
        This page compares image formats and codecs by matching each data point
        from a reference batch to a data point from another batch while
        respecting these constraints.
        </p>
      </div>

      <div class="descriptionHolder" id="metricsDescription">
      </div>

      <div class="descriptionHolder" id="batchSelectionsDescription">
        <div class="bracket"></div>
        <p>
        Each batch contains encode and decode data over a set of images for a
        given codec at a specified version and with specific settings.<br>
        See the ADVANCED tab for more information and to change the comparison
        reference, criteria and shown metrics.
        </p>
      </div>`;
  }

  private renderAdvancedHelp() {
    return html`
      <div class="descriptionHolder" id="numComparisonsDescription">
        <div class="bracket"></div>
        <p>
        This page compares image formats and codecs by matching each data point
        from a reference batch to a data point from another batch. Each data
        point is an image compressed then decompressed, with some codec settings
        and some measured information such as encoding duration, visual
        distortion etc. The number of comparisons is the number of matched pairs
        between a batch and the reference batch.
        </p>
      </div>

      <div class="descriptionHolder" id="matchersDescription">
        <div class="bracket"></div>
        <p>
        Pairs are selected so that these constraints are respected. When
        comparing lossy compression methods, objective visual distortion metrics
        such as PSNR and SSIM can be used as matchers to compare formats and
        codecs on other metrics such as compression rate and encoding duration.
        <br>
        Numerical fields can be matched with a relative tolerance. If so, pairs
        are selected to minimize the difference of the values of these fields.
        </p>
      </div>

      <div class="descriptionHolder" id="metricsDescription">
        <div class="bracket"></div>
        <p>
        Statistics are computed for these fields used as metrics.
        </p>
      </div>

      <div class="descriptionHolder" id="batchSelectionsDescription">
        <div class="bracket"></div>
        <p>
        The compared codecs are listed on the left. Data batches may represent
        different codecs, or the same codec with different settings. Each batch
        has an associated color.<br>
        Click the batch name to see batch metadata and data points. Some data
        points may be filtered out. When comparing lossy compression methods, it
        is recommended to filter based on
        <a href="https://github.com/webmproject/codec-compare/wiki/Bits-per-pixel-of-Internet-images"
          target="_blank">
          bits-per-pixel usually seen on the web
          <mwc-icon>open_in_new</mwc-icon></a>.<br>
        Click the visibility button to show or hide a specific batch in the plot
        and in the SUMMARY tab.<br>
        The statistics relative to the reference batch for the fields selected
        as metrics are displayed in the right-most columns. The aggregation
        method can be changed in the Settings.
        </p>
      </div>`;
  }

  private renderDatasetHelp() {
    return html`
      <div class="descriptionHolder" id="galleryDescription">
        <div class="bracket"></div>
        <p>
        These media assets were compressed and decompressed with the codecs
        presented here to compare their relative performance.<br>
        <br>
        The count associated with each asset corresponds to the number of
        matched pairs based on that asset accross all batches.<br>
        Each image can be toggled on or off across all batches.
        </p>
      </div>`;
  }

  override render() {
    const onClose = () => {
      this.style.display = 'none';
      this.requestUpdate();
    };

    return html`
      <div id="background" @click=${onClose}>
      </div>

      ${
        this.displayedTab === Tab.SUMMARY   ? this.renderSummaryHelp() :
            this.displayedTab === Tab.STATS ? this.renderAdvancedHelp() :
                                              this.renderDatasetHelp()}

      <div class="descriptionHolder" id="graphDescription">
        <p>
        The codecs are plotted on this graph as large disks, with the metric
        fields as axes. If any, batches sharing the same codec are linked with
        straight lines, usually to represent multiple encoding efforts.<br>
        If enabled in the Settings, each matched pair is displayed as a tiny
        dot. Click on any to display the details of the reference batch and of
        the compared batch.<br>
        <br>
        For an introduction to image file formats, please see this
        <a href="https://en.wikipedia.org/wiki/Image_file_format"
          target="_blank">
          Wikipedia article <mwc-icon>open_in_new</mwc-icon></a>.
        <br>
        For any question or comment on this tool, please open an issue on
        <a href="https://github.com/webmproject/codec-compare/issues"
          target="_blank">
          GitHub <mwc-icon>open_in_new</mwc-icon></a>.
        </p>
      </div>

      <mwc-fab mini id="closeButton" icon="close" title="Close"
        @click=${onClose}>
      </mwc-fab>
      `;
  }

  static override styles = css`
    :host {
      display: none;
      position: absolute;
      z-index: 8;
      left: 0;
      top: 0;
      bottom: 0;
      right: 0;
    }

    #background {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      right: 0;
      /* Translucid enough to see through, dark enough to read white text. */
      background: rgba(0,0,0,0.7);
    }

    #closeButton {
      position: absolute;
      top: 122px;
      left: 6px;
    }

    .descriptionHolder {
      position: absolute;
      padding-left: 20px;
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .bracket {
      width: 10px;
      height: 100%;
      border: 3px solid white;
      border-left: 0;
    }
    p {
      margin: 0;
      font-size: clamp(0.5em, 0.8vw, 1.2em);
      color: white;
      flex: 1;
    }

    #graphDescription {
      padding-left: 80px;
      padding-right: 20px;
      text-align: center;
    }
    a {
      color: white;
    }

    mwc-icon {
      font-size: 0.8em;
    }
  `;
}