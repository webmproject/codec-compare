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

import '@material/mwc-icon';
import '@material/mwc-fab';
import './batch_name_ui';
import './batch_selection_ui';
import './batch_selections_ui';
import './batch_ui';
import './loading_ui';
import './match_ui';
import './matchers_ui';
import './matches_ui';
import './metrics_ui';
import './mwc_button_fit';
import './settings_ui';
import './help_ui';

import {css, html, LitElement} from 'lit';
import {customElement, query} from 'lit/decorators.js';

import {Batch} from './entry';
import {loadBatchJson, loadJsonContainingBatchJsonPaths} from './entry_loader';
import {dispatch, EventType, listen} from './events';
import {HelpUi} from './help_ui';
import {LoadingUi} from './loading_ui';
import {PlotUi} from './plot_ui';
import {SettingsUi} from './settings_ui';
import {State} from './state';
import {UrlState} from './url_state';

/** Main component of the codec comparison static viewer. */
@customElement('codec-compare')
export class CodecCompare extends LitElement {
  /** The root data object containing the full state. */
  private readonly state = new State();
  private readonly urlState = new UrlState();
  /** True if all batches are loaded into the state. */
  private isLoaded = false;
  /** True if at least one batch failed to load. */
  private failure = false;
  /** Set once the top-level JSON has been parsed. */
  private numExpectedBatches = 0;
  /** The object rendering the state into a plot. */
  private readonly plotUi = new PlotUi(this.state);

  @query('settings-ui') private readonly settingsUi!: SettingsUi;
  @query('help-ui') private readonly helpUi!: HelpUi;
  @query('loading-ui') private readonly loadingUi!: LoadingUi;

  override render() {
    let numComparisons = 0;
    let truncatedResults = false;
    for (const [index, batchSelection] of this.state.batchSelections
             .entries()) {
      if (index !== this.state.referenceBatchSelectionIndex) {
        numComparisons += batchSelection.matchedDataPoints.rows.length;
        truncatedResults ||= batchSelection.matchedDataPoints.limited;
      }
    }
    let referenceBatch: Batch|undefined = undefined;
    if (this.state.referenceBatchSelectionIndex >= 0 &&
        this.state.referenceBatchSelectionIndex <
            this.state.batchSelections.length) {
      referenceBatch =
          this.state.batchSelections[this.state.referenceBatchSelectionIndex]
              .batch;
    }
    return html`
      <div id="comparisons">
        ${
        truncatedResults ? html`
        <div id="truncatedResults">
          <mwc-icon>warning</mwc-icon>
          <p>
          The results are partial because there are too many possible comparisons.
          Consider filtering input rows out.
          </p>
        </div>` :
                           ''}

        <p id="numComparisons">Based on ${numComparisons} comparisons,</p>
        <matchers-ui .state=${this.state}></matchers-ui>
        <metrics-ui .state=${this.state}></metrics-ui>
        <batch-selections-ui .state=${this.state}></batch-selections-ui>
        ${
        referenceBatch ? html`
        <p id="referenceBatch">
          compared to <batch-name-ui .batch=${referenceBatch}></batch-name-ui>.
        </p>` :
                         ''}
      </div>

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
            <mwc-icon>open_in_new</mwc-icon> Comparison presets
          </mwc-button-fit>

          <p id="presets">
            <!-- Open in new tab to avoid handling location hash changes. -->
            <a target="_blank" href="?batch=/demo_batch_some_codec_effort2.json&batch=/demo_batch_other_codec_settingC.json">
              Some codec effort 2 vs setting C
            </a><br>
            <a target="_blank" href="?batch=/demo_batch_other_codec_settingA.json&batch=/demo_batch_some_codec_exp.json">
              Some codec setting A vs experiment
            </a><br>
            <a target="_blank" href="#">
              Encoding time and encoded size metrics
            </a><br>
            <a target="_blank" href="#matcher_encoded_size=0.01&metric_decoding_time=on&metric_encoded_size=off">
              Time metrics for same encoded size
            </a>
          </p>

          <p id="credits">
            Codec Compare beta version 0.1.9<br>
            <a href="https://github.com/webmproject/codec-compare">
              Sources on GitHub
            </a>
          </p>
        </div>
      </div>

      <batch-ui .state=${this.state}></batch-ui>
      <batch-selection-ui .state=${this.state}></batch-selection-ui>
      <matches-ui .state=${this.state}></matches-ui>
      <match-ui .state=${this.state}></match-ui>
      <help-ui></help-ui>
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
    this.urlState.setDefaultValues(this.state);
    this.state.initializePostUrlStateDefaultValues();
    this.urlState.load(this.state);
    this.state.initializePostUrlStateLoad();
    listen(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      this.urlState.save(this.state);
      this.requestUpdate();
    });
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
          const pathOfJsonContaingJsonPaths =
              decodeURIComponent(url.get('load') ?? '/demo_batches.json');
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
      padding: 20px 0;
      background: var(--mdc-theme-surface);
      /* Simulate the shadow of the plot on the right. */
      box-shadow: inset -4px 0 8px 0 rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }
    p {
      margin: 0;
      color: var(--mdc-theme-text);
      font-size: 20px;
    }

    #comparisons {
      min-height: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 0px 20px 0px 74px;
      overflow-y: auto;
      overflow-x: hidden;
    }
    batch-selections-ui {
      overflow-x: auto;
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
    #leftBar:hover {
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
      font-size: 20px;
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
