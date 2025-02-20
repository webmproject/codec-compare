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

import '@material/mwc-button';
import '@material/mwc-icon';
import '@material/mwc-menu';
import '@material/mwc-tab-bar';
import '@material/mwc-tab';
import './batch_name_ui';
import './batch_selections_ui';
import './help_ui';
import './gallery_ui';
import './loading_ui';
import './matchers_ui';
import './metrics_ui';
import './mwc_button_fit';
import './panel_ui';
import './sentence_ui';
import './settings_ui';

import {ActionDetail} from '@material/mwc-list';
import {Menu} from '@material/mwc-menu';
import {css, html, LitElement} from 'lit';
import {customElement, query} from 'lit/decorators.js';

import {sourceTagsFromBatchesAndCommonFields} from './common_field';
import {Batch} from './entry';
import {loadBatchJson, loadJsonContainingBatchJsonPaths} from './entry_loader';
import {dispatch, EventType, listen} from './events';
import {HelpUi} from './help_ui';
import {LoadingUi} from './loading_ui';
import {PlotUi} from './plot_ui';
import {SettingsUi} from './settings_ui';
import {State} from './state';
import {Tab} from './tab';
import {UrlState} from './url_state';
import {reverseMap} from './utils';

/** Main component of the codec comparison static viewer. */
@customElement('codec-compare')
export class CodecCompare extends LitElement {
  /** The root data object containing the full state. */
  private readonly state = new State();
  private readonly urlState = new UrlState();
  /** Maps asset tags to the set of source asset names that have them. */
  private tagToAssetNames = new Map<string, Set<string>>();
  private assetNameToTags = new Map<string, Set<string>>();
  /** True if all batches are loaded into the state. */
  private isLoaded = false;
  /** True if at least one batch failed to load. */
  private failure = false;
  /** Set once the top-level JSON has been parsed. */
  private numExpectedBatches = 0;
  /** Currently displayed component. */
  private currentTab = Tab.SUMMARY;
  /** The object rendering the state into a plot. */
  private readonly plotUi = new PlotUi(this.state);

  @query('settings-ui') private readonly settingsUi!: SettingsUi;
  @query('help-ui') private readonly helpUi!: HelpUi;
  @query('loading-ui') private readonly loadingUi!: LoadingUi;

  @query('#referenceMenu') private readonly referenceMenu!: Menu;

  private renderReference(referenceBatch: Batch) {
    return html`
      <mwc-button icon="arrow_drop_down" trailingIcon raised
          title="Change the reference batch to compare other codecs with"
          id="referenceButton" @click=${() => {
      this.referenceMenu.show();
    }}>
        <batch-name-ui .batch=${referenceBatch}></batch-name-ui>
      </mwc-button>
      <mwc-menu
        .anchor=${this.referenceMenu}
        corner="BOTTOM_LEFT"
        menuCorner="START"
        id="referenceMenu"
        @action=${(e: CustomEvent<ActionDetail>) => {
      this.state.referenceBatchSelectionIndex = e.detail.index;
      dispatch(EventType.REFERENCE_CHANGED);
    }}>
        ${
        this.state.batches.map(
            (batch) => html`
        <mwc-list-item ?activated=${batch.index === referenceBatch.index}>
          <batch-name-ui .batch=${batch}></batch-name-ui>
          ${
                batch.index === referenceBatch.index ?
                    html`<span class="referenceBatchChip">reference</span>` :
                    html``}
        </mwc-list-item>`)}
      </mwc-menu>`;
  }

  private renderSentence() {
    return html`
      <div id="sentenceContainer">
        <sentence-ui .state=${this.state}></sentence-ui>
      </div>`;
  }

  private renderGallery() {
    return html`
      <div id="galleryContainer">
        <gallery-ui
          .state=${this.state}
          .tagToAssetNames=${this.tagToAssetNames}
          .assetNameToTags=${this.assetNameToTags}>
        </gallery-ui>
      </div>`;
  }

  private renderTruncatedResults() {
    return html`
      <div id="truncatedResults">
        <mwc-icon>warning</mwc-icon>
        <p>
        The results are partial because there are too many possible comparisons.
        Consider filtering input rows out.
        </p>
      </div>`;
  }

  override render() {
    let minNumComparisons = -1;
    let maxNumComparisons = -1;
    let truncatedResults = false;
    let hasHistograms = false;
    for (const [index, batchSelection] of this.state.batchSelections
             .entries()) {
      if (index !== this.state.referenceBatchSelectionIndex) {
        const numComparisons = batchSelection.matchedDataPoints.rows.length;
        minNumComparisons = minNumComparisons === -1 ?
            numComparisons :
            Math.min(minNumComparisons, numComparisons);
        maxNumComparisons = maxNumComparisons === -1 ?
            numComparisons :
            Math.max(maxNumComparisons, numComparisons);
        truncatedResults ||= batchSelection.matchedDataPoints.limited;
      }
      hasHistograms ||= batchSelection.histogram.length > 0;
    }
    const numComparisonsStr = minNumComparisons === maxNumComparisons ?
        `${Math.max(0, maxNumComparisons)}` :
        `${minNumComparisons} to ${maxNumComparisons}`;

    let referenceBatch: Batch|undefined = undefined;
    if (this.state.referenceBatchSelectionIndex >= 0 &&
        this.state.referenceBatchSelectionIndex <
            this.state.batchSelections.length) {
      referenceBatch =
          this.state.batchSelections[this.state.referenceBatchSelectionIndex]
              .batch;
    }

    const activeIndex: number = this.currentTab;
    const displaySentence = this.currentTab === Tab.SUMMARY;
    const displayGallery = this.currentTab === Tab.GALLERY;
    // The advanced interface is always displayed, hidden by the other
    // components, because drop-down menu anchors are messed up otherwise.

    // The nested divs below seem necessary to have proper scroll bars.
    // Feel free to fix them.

    return html`
      <div id="advancedInterfaceContainerContainer">
        <div id="advancedInterfaceContainer">
          <div id="advancedInterface">
            <div class="scrollFriendlyPadding"></div>
            ${truncatedResults ? this.renderTruncatedResults() : ''}
            <p id="numComparisons" style="position: relative;">
              Based on ${numComparisonsStr} comparisons
              ${
        referenceBatch ? html`with ${this.renderReference(referenceBatch)}` :
                         ''},
            </p>
            <matchers-ui .state=${this.state} id="matchers"></matchers-ui>
            <metrics-ui .state=${this.state} id="metrics"></metrics-ui>
            <batch-selections-ui .state=${this.state}></batch-selections-ui>
            <div class="scrollFriendlyPadding"></div>
          </div>
        </div>
      </div>
      ${displaySentence ? this.renderSentence() : ''}
      ${displayGallery ? this.renderGallery() : ''}

      <mwc-tab-bar activeIndex=${activeIndex}
        @MDCTabBar:activated=${(event: CustomEvent<{index: number}>) => {
      this.currentTab = event.detail.index;
      this.requestUpdate();
    }}>
        <mwc-tab label="Summary" icon="short_text" id="summaryTab"></mwc-tab>
        <mwc-tab label="Advanced" icon="tune" id="advancedTab"></mwc-tab>
        <mwc-tab label="Data set" icon="photo_library" id="galleryTab">
        </mwc-tab>
      </mwc-tab-bar>

      <div id="leftBar">
        <div id="leftBarContent">
          <mwc-button-fit @click=${() => {
      navigator.clipboard.writeText(window.location.href);
    }}>
            <mwc-icon>share</mwc-icon> Copy URL to clipboard
          </mwc-button-fit>

          <mwc-button-fit disabled>
            <mwc-icon>settings</mwc-icon> Settings
          </mwc-button-fit>

          <settings-ui .state=${this.state}></settings-ui>

          <mwc-button-fit id="helpButton" @click=${() => {
      this.helpUi.onOpen();
    }}>
            <mwc-icon>help</mwc-icon> Help
          </mwc-button-fit>

          <mwc-button-fit disabled>
            <mwc-icon>open_in_new</mwc-icon> Resources
          </mwc-button-fit>

          <p id="presets">
            <a target="_blank" href="https://storage.googleapis.com/demos.webmproject.org/webp/cmp/index.html">
              Image format comparison homepage
            </a><br>
            <a target="_blank" href="https://github.com/webmproject/codec-compare/wiki/Bits-per-pixel-of-Internet-images">
              Bits per pixel of Internet images
            </a><br>
            <a target="_blank" href="https://storage.googleapis.com/avif-comparison/index.html">
              Another study of AVIF/WebP/JPG/JXL
            </a><br>
            <!-- Other links can be inserted here. -->
          </p>

          <p id="credits">
            Codec Compare version 0.5.5<br>
            <a href="https://github.com/webmproject/codec-compare">
              Sources on GitHub
            </a>
          </p>
        </div>
      </div>

      <panel-ui .state=${this.state}></panel-ui>
      <help-ui .displayedTab=${this.currentTab}></help-ui>
      ${this.isLoaded ? html`` : html`<loading-ui></loading-ui>`}
    `;
  }

  private onNumBatchesKnown(numBatches: number) {
    if (this.failure) {
      return;
    }

    this.numExpectedBatches = numBatches;
    this.loadingUi.text = `Loading: Found ${numBatches} batches`;
    this.loadingUi.progress = 0.4;
  }

  private onBatchLoaded(numLoadedBatches: number) {
    if (this.failure) {
      return;
    }

    this.loadingUi.text = `Loading: Downloaded batch ${numLoadedBatches} / ${
        this.numExpectedBatches}`;
    this.loadingUi.progress =
        0.4 + 0.6 * (numLoadedBatches / this.numExpectedBatches);
  }

  private async onAllBatchesLoaded() {
    this.state.initialize();
    this.tagToAssetNames = sourceTagsFromBatchesAndCommonFields(
        this.state.batches, this.state.commonFields);
    this.assetNameToTags = reverseMap(this.tagToAssetNames);
    this.urlState.setDefaultValues(this.state);
    this.state.initializePostUrlStateDefaultValues();
    this.urlState.load(this.state);
    this.state.initializePostUrlStateLoad();
    listen(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      this.urlState.save(this.state);
      this.requestUpdate();
    });
    this.settingsUi.requestUpdate();  // Settings may have changed.
    // Trigger the computation of matches and stats.
    dispatch(EventType.REFERENCE_CHANGED);

    await this.plotUi.setupPlot();
    this.loadingUi.style.opacity = '0';

    setTimeout(
        () => {
          this.isLoaded = true;
          this.requestUpdate();
        },
        300  // Shall match "transition: opacity" in LoadingUi css.
    );
  }

  override firstUpdated() {
    this.updateComplete.then(async () => {
      // Load the UI to register all the callbacks first, then fetch the data.
      // updateComplete is used to make sure all override firstUpdated() were
      // called before.
      const url = new URLSearchParams(window.location.search);
      let jsonPaths = url.getAll('batch');
      try {
        if (jsonPaths.length === 0) {
          const pathOfJsonContaingJsonPaths = decodeURIComponent(
              url.get('load') ?? '/default_batches.json');
          jsonPaths = await loadJsonContainingBatchJsonPaths(
              pathOfJsonContaingJsonPaths);
        }
        this.onNumBatchesKnown(jsonPaths.length);
        let numLoadedBatches = 0;
        const promises = jsonPaths.map(async (jsonPath) => {
          const batch = await loadBatchJson(jsonPath);
          this.onBatchLoaded(++numLoadedBatches);
          return batch;
        });
        this.state.batches = await Promise.all(promises);
      } catch (error) {
        this.failure = true;
        this.loadingUi.text = String(error);
        this.loadingUi.progress = 0.5;
        return;
      }

      await this.onAllBatchesLoaded();
    });
  }

  static override styles = css`
    :host {
      margin: 0;
      padding: 0 0;
      overflow: hidden;
    }
    p {
      margin: 0;
      color: var(--mdc-theme-text);
      font-size: 20px;
    }

    mwc-tab-bar {
      position: absolute;
      top: 0;
      left: 60px;  /* Width of #leftBar. */
      width: 540px; /* = 600px from index.html - 60px. */
      height: 50px;
    }

    #sentenceContainer, #galleryContainer, #advancedInterfaceContainerContainer {
      position: absolute;
      top: 50px;
      bottom: 0;
      left: 0;
    }
    #sentenceContainer, #galleryContainer {
      width: 506px;  /* = 600px (from index.html) - 20 - 74 (padding below).
                      * width:100% would require host's position:relative
                      * but it messes with the leftBar's overflow. */
    }
    #advancedInterfaceContainerContainer {
      width: 600px;
    }
    #advancedInterfaceContainer {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
    }
    #advancedInterface {
      width: 506px;
      min-height: 100%;
    }
    .scrollFriendlyPadding { height: 8px; }
    #sentenceContainer, #galleryContainer, #advancedInterface {
      padding: 0px 20px 0px 74px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      overflow-y: auto;
      overflow-x: hidden;
    }
    mwc-tab-bar, #sentenceContainer, #galleryContainer, #advancedInterfaceContainerContainer {
      background: var(--mdc-theme-surface);
      /* Simulate the shadow of the plot on the right. */
      box-shadow: inset -4px 0 8px 0 rgba(0, 0, 0, 0.2);
    }
    batch-selections-ui {
      overflow-x: auto;
    }
    batch-name-ui:hover {
      cursor: pointer;
    }
    #referenceButton {
      --mdc-theme-primary: white;
      --mdc-theme-on-primary: var(--mdc-theme-text);
      /* Align the following comma to the bottom of the button. */
      vertical-align: bottom;
    }
    #referenceButton batch-name-ui {
      color: var(--mdc-theme-text);
      font-size: 16px;
      white-space: nowrap;
      text-transform: none;
    }
    #referenceMenu {
      --mdc-menu-item-height: 20px;
    }
    .referenceBatchChip {
      background: var(--mdc-theme-primary);
      color: var(--mdc-theme-background);
      border-radius: 16px;
      padding: 2px 8px;
      font-size: 12px;
      margin-left: 8px;
    }
    #truncatedResults {
      background: orange;
      border-radius: 16px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      --mdc-icon-size: 64px;
    }
    #truncatedResults mwc-icon, #truncatedResults p {
      color: white;
    }

    #leftBar {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 60px;
      overflow: hidden;
      box-shadow: 4px 0 8px rgba(0, 0, 0, 0.2);
      transition: width 0.1s;
    }
    #leftBar:hover,
    #leftBar:has(settings-ui:focus-within) {
      width: 500px;
    }
    #leftBarContent {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      width: 500px;
      background: var(--mdc-theme-primary);
      padding: 6px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    #leftBarContent > mwc-button-fit {
      --mdc-theme-primary: var(--mdc-theme-background);
      --mdc-typography-button-font-size: 20px;
    }
    #leftBarContent > mwc-button-fit > mwc-icon {
      font-size: 42px;
      margin-right: 16px;
    }

    #presets {
      margin-left: 70px;
      color: var(--mdc-theme-background);
      font-family: Roboto, sans-serif;
      font-size: 16px;
    }
    #presets > a {
      color: var(--mdc-theme-background);
    }

    #credits {
      margin-left: 70px;
      margin-top: auto;
      font-size: 16px;
      color: var(--mdc-theme-background);
    }
    #credits > a {
      color: var(--mdc-theme-background);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'codec-compare': CodecCompare;
  }
}
