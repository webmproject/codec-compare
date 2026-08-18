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

import {css, html, LitElement} from 'lit';
import {customElement, query} from 'lit/decorators.js';
import {trustedResourceUrl, TrustedResourceUrl} from 'safevalues';
import {objectUrlFromSafeSource, setScriptSrc} from 'safevalues/dom';

import {getFilename} from './utils';

/**
 * The main component for visualizing a pair of compressed images and the
 * original picture.
 */
@customElement('image-visualizer')
export class ImageVisualizer extends LitElement {
  /** Elements used to crop overlays, to simulate an image slider. */
  @query('#verticalImageWindow')
  private readonly verticalImageWindow!: HTMLImageElement;
  @query('#horizontalImageWindow')
  private readonly horizontalImageWindow!: HTMLImageElement;

  /** <img></img> elements. */
  @query('#leftImage') private readonly leftImage!: HTMLImageElement;
  @query('#rightImage') private readonly rightImage!: HTMLImageElement;
  @query('#bottomImage') private readonly bottomImage!: HTMLImageElement;
  @query('#backgroundImage')
  private readonly backgroundImage!: HTMLImageElement;

  /** <p></p> elements. */
  @query('#leftText') private readonly leftText!: HTMLParagraphElement;
  @query('#rightText') private readonly rightText!: HTMLParagraphElement;
  @query('#bottomText') private readonly bottomText!: HTMLParagraphElement;
  @query('#loadingOverlay') private readonly loadingOverlay?: HTMLElement;

  private sliderIsLocked = false;
  private isLoaded = false;

  private renderBackground() {
    // Reuse the bottom image and blur it a lot to have a background with the
    // same tones as the images to compare. It should avoid perceptual
    // consequences of high contrast between the images to compare and the
    // background. See the somewhat related
    // https://en.wikipedia.org/wiki/ColorCodingInDataVisualization
    //  #Grayscale,AnImportantToolForVisualizationOfData
    return html` <div id="backgroundImageContainerContainer">
      <div id="backgroundImageContainer">
        <img id="backgroundImage" src="/rainbow.png" />
      </div>
    </div>`;
  }

  private renderSlider() {
    return html` <div class="slider">
      <div class="verticalImageSlider" @click=${this.onMouseClick}>
        <div>
          <p id="bottomText">Original image</p>
          <img id="bottomImage" src="/rainbow.png" />
        </div>
        <div id="verticalImageWindow">
          <div class="horizontalImageSlider">
            <div>
              <p id="rightText">WebP quality 50 (50.1kB)</p>
              <img id="rightImage" src="/rainbow_q50.webp" />
            </div>
            <div id="horizontalImageWindow">
              <p id="leftText">WebP quality 0 (8.8kB)</p>
              <img id="leftImage" src="/rainbow_q0.webp" />
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  private renderLoading() {
    if (this.isLoaded) {
      return html``;
    }
    return html`
      <div id="loadingOverlay">
        <div class="spinner"></div>
      </div>
    `;
  }

  override render() {
    return html`${this.renderBackground()} ${this.renderSlider()} ${
        this.renderLoading()}`;
  }

  private onMouseMove(e: MouseEvent) {
    if (this.sliderIsLocked) {
      return;
    }
    const rect = this.rightImage.getBoundingClientRect();
    const widthPx = Math.max(
        0, Math.min(rect.width - 1, e.pageX - (rect.x + window.scrollX)));
    const heightPx = Math.max(
        0, Math.min(rect.height - 1, e.pageY - (rect.y + window.scrollY)));
    this.horizontalImageWindow.style.width = `${widthPx}px`;
    this.verticalImageWindow.style.height = `${heightPx}px`;
  }

  private onMouseClick(e: MouseEvent) {
    this.sliderIsLocked = !this.sliderIsLocked;
    this.onMouseMove(e);
  }

  override async firstUpdated() {
    const url = new URLSearchParams(window.location.search);
    await Promise.all([
      setImageText(
          this.bottomImage, this.bottomText, url.get('bimg'), url.get('btxt')),
      setImageText(
          this.rightImage, this.rightText, url.get('rimg'), url.get('rtxt')),
      setImageText(
          this.leftImage, this.leftText, url.get('limg'), url.get('ltxt')),
    ]);
    this.backgroundImage.src = this.bottomImage.src;

    if (url.has('rimg') && url.get('rimg') === url.get('limg') &&
        url.get('rtxt') === url.get('ltxt')) {
      // Only compare one image with the bottom image because left and right are
      // identical.
      this.horizontalImageWindow.hidden = true;
    }
    this.addEventListener('mousemove', this.onMouseMove);
    this.isLoaded = true;
    if (this.loadingOverlay) {
      this.loadingOverlay.style.opacity = '0';
      this.requestUpdate();
    }
  }

  static override styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #808080;
    }
    #loadingOverlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: #808080;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      cursor: wait;
      opacity: 1;
      transition: opacity 0.3s;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 5px solid #fff;
      border-bottom-color: transparent;
      border-radius: 50%;
      display: inline-block;
      box-sizing: border-box;
      animation: rotation 1s linear infinite;
    }
    @keyframes rotation {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }
    .slider img {
      background-color: #808080; /* fallback in case of image loading failure */
      background-image: url('/transparency_checkerboard.webp');
    }
    #backgroundImageContainerContainer {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
    }
    #backgroundImageContainer {
      position: absolute;
      top: -400px;
      left: -400px;
      right: -400px;
      bottom: -400px;
    }
    #backgroundImage {
      width: 100%;
      height: 100%;
      filter: blur(200px); /* Find another solution if this is too laggy */
    }

    .slider {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      line-height: 0;
    }

    .verticalImageSlider {
      position: relative;
      display: inline-block;
      box-shadow: 0 0 20px 0 rgba(0, 0, 0, 0.4);
    }
    .verticalImageSlider:hover {
      cursor: crosshair;
    }
    #verticalImageWindow {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      min-height: 0%;
      height: 50%;
      max-height: 100%;
      overflow: hidden;
      border-bottom: 1px dashed black;
    }

    .horizontalImageSlider {
      position: relative;
      display: inline-block;
    }
    #horizontalImageWindow {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      min-width: 0%;
      width: 50%;
      max-width: 100%;
      overflow: hidden;
      border-right: 1px dashed black;
    }

    img {
      user-select: none;
    }
    #bottomImage,
    #leftImage,
    #rightImage {
      /* Make sure the whole image is displayed by resizing it to at most 96% of
       * the canvas. This works because all three images have the same original
       * size and viewport dimensions are not parent-relative. */
      max-width: 96vw;
      max-height: 96vh;
    }

    #bottomText,
    #leftText,
    #rightText {
      padding: 4px 8px;
      margin: 0;
      position: absolute;
      color: black;
      text-shadow: white 0 0 6px, white 0 0 4px, white 0 0 2px;
      white-space: nowrap;
      line-height: 20px;
      user-select: none;
    }
    #bottomText {
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
    }
    #leftText {
      top: 0;
      left: 0;
    }
    #rightText {
      top: 0;
      right: 0;
      text-align: right;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'image-visualizer': ImageVisualizer;
  }
}

let wasmModulePromise: Promise<any>|undefined;

async function loadScript(url: TrustedResourceUrl): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    setScriptSrc(script, url);
    script.onload = () => resolve();
    script.onerror = () =>
        reject(new Error(`Failed to load script: ${url.toString()}`));
    document.head.appendChild(script);
  });
}

function findFactory(): any {
  const win = window as any;
  const glob = globalThis as any;
  const parent = window.parent as any;
  return win['loadCodecWasm'] || win['module']?.['exports']?.['default'] ||
      win['module']?.['exports'] || win['exports']?.['loadCodecWasm'] ||
      parent?.['loadCodecWasm'] ||
      parent?.['module']?.['exports']?.['default'] ||
      parent?.['module']?.['exports'] ||
      parent?.['exports']?.['loadCodecWasm'] || glob['loadCodecWasm'] ||
      glob['module']?.['exports']?.['default'] || glob['module']?.['exports'];
}


async function getWasmModule(): Promise<any> {
  if (!wasmModulePromise) {
    let factory = findFactory();
    if (typeof factory !== 'function') {
      const jsUrl = trustedResourceUrl`codec_wasm_bin.js`;
      const win = window as any;
      const glob = globalThis as any;
      const oldDefine = win['define'] || glob['define'];
      const oldModule = win['module'] || glob['module'];
      const oldExports = win['exports'] || glob['exports'];
      try {
        win['define'] = undefined;
        glob['define'] = undefined;
      } catch (e) {
      }
      if (!win['module']) win['module'] = {'exports': {}};
      if (!glob['module']) glob['module'] = win['module'];
      if (!win['exports']) win['exports'] = win['module']['exports'];
      if (!glob['exports']) glob['exports'] = glob['module']['exports'];

      await loadScript(jsUrl);

      const loadedFactory = findFactory();

      if (oldDefine !== undefined) {
        win['define'] = oldDefine;
        glob['define'] = oldDefine;
      } else {
        delete win['define'];
        delete glob['define'];
      }

      if (oldModule !== undefined) {
        win['module'] = oldModule;
        glob['module'] = oldModule;
      } else {
        delete win['module'];
        delete glob['module'];
      }

      if (oldExports !== undefined) {
        win['exports'] = oldExports;
        glob['exports'] = oldExports;
      } else {
        delete win['exports'];
        delete glob['exports'];
      }

      factory = loadedFactory;
      if (typeof factory !== 'function') {
        throw new Error(
            'loadCodecWasm is not a function on window after loading script.');
      }
    }
    wasmModulePromise = factory({
      'locateFile': (path: string) => {
        if (path.endsWith('.wasm')) {
          return 'codec_wasm_bin.wasm';
        }
        return path;
      }
    });
  }
  return wasmModulePromise;
}

function toByteVector(module: any, bytes: Uint8Array): any {
  const v = new module['ByteVector']();
  for (let i = 0; i < bytes.length; i++) {
    v['push_back'](bytes[i]);
  }
  return v;
}

function fromByteVector(vector: any): Uint8Array {
  const bytes = new Uint8Array(vector['size']());
  for (let i = 0; i < vector['size'](); i++) {
    bytes[i] = vector['get'](i);
  }
  return bytes;
}

async function encodeDecode(
    pngUrl: string, codecStr: string, effort: number, quality: number,
    subsamplingStr: string): Promise<any> {
  const module = await getWasmModule();
  let codecEnum: any;
  const codecs = module['Codec'];
  for (const key of Object.keys(codecs)) {
    if (key.toLowerCase() === codecStr.toLowerCase()) {
      codecEnum = codecs[key];
      break;
    }
  }
  if (codecEnum === undefined) {
    throw new Error(`Unknown codec: ${codecStr}`);
  }

  let subsamplingEnum: any;
  const subsamplings = module['Subsampling'];
  if (subsamplingStr !== undefined && subsamplingStr !== '') {
    for (const key of Object.keys(subsamplings)) {
      if (key.toLowerCase() === subsamplingStr.toLowerCase() ||
          key.toLowerCase() === `yuv${subsamplingStr}`.toLowerCase()) {
        subsamplingEnum = subsamplings[key];
        break;
      }
    }
  }
  if (subsamplingEnum === undefined) {
    subsamplingEnum = subsamplings['Default'];
  }

  const response = await fetch(pngUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${pngUrl}: ${response.statusText}`);
  }
  const pngBytes = new Uint8Array(await response.arrayBuffer());
  const pngVector = toByteVector(module, pngBytes);
  const stats = module['getEncodedBytesAndDecodeStats'](
      pngVector, codecEnum, subsamplingEnum, effort, quality);
  pngVector['delete']();
  return stats;
}

/**
 * Sets the image source and the paragraph content depending on the values of
 * the arguments keyImage and keyText extracted from the given url.
 */
async function setImageText(
    image: HTMLImageElement, text: HTMLParagraphElement,
    valueImage: string|null, valueText: string|null): Promise<void> {
  if (valueImage === null) return;
  if (image.src.startsWith('blob:')) {
    URL.revokeObjectURL(image.src);
    image.src = '';
  }

  if (valueImage.startsWith('ccgen')) {
    const tokens = valueImage.split('-');
    // Expect a string "ccgen-$codec-$effort-$quality-$subsampling-$pngUrl".
    const codec = tokens[1];
    const effort = Number(tokens[2]);
    const quality = Number(tokens[3]);
    const subsampling = tokens[4];
    const pngUrl = tokens.slice(5).join('-');
    const stats =
        await encodeDecode(pngUrl, codec, effort, quality, subsampling);
    const encodedBytes = fromByteVector(stats['encoded_bytes']);
    stats['encoded_bytes']['delete']();
    const blob =
        new Blob([encodedBytes], {type: stats['encoded_bytes_mime_type']});
    image.src = objectUrlFromSafeSource(blob);
    if (valueText !== null) {
      text.textContent = valueText;
    } else {
      const numBytes = stats['encoded_size'];
      const sizeStr = numBytes < 10000 ?
          `${numBytes}B` :
          numBytes < 1024 * 10000 ?
          `${Math.round(numBytes / 1024).toFixed(2)}kB` :
          `${Math.round(numBytes / 1024 / 1024).toFixed(2)}MB`;
      text.textContent = stats['description'] + ` (${stats['encoded_size']}B)`;
    }
  } else {
    image.src = valueImage;
    if (valueText !== null) {
      text.textContent = valueText;
    } else {
      text.textContent = getFilename(valueImage);
    }
  }
}
