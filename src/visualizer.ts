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

  private sliderIsLocked = false;

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

  override render() {
    return html`${this.renderBackground()} ${this.renderSlider()}`;
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

  override firstUpdated() {
    const url = new URLSearchParams(window.location.search);
    setImageText(this.bottomImage, this.bottomText, url, 'bimg', 'btxt');
    setImageText(this.rightImage, this.rightText, url, 'rimg', 'rtxt');
    setImageText(this.leftImage, this.leftText, url, 'limg', 'ltxt');
    this.backgroundImage.src = this.bottomImage.src;

    if (url.get('rimg') === url.get('limg') &&
        url.get('rtxt') === url.get('ltxt')) {
      // Only compare one image with the bottom image because left and right are
      // identical.
      this.horizontalImageWindow.hidden = true;
    }
    this.addEventListener('mousemove', this.onMouseMove);
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

/**
 * Sets the image source and the paragraph content depending on the values of
 * the arguments keyImage and keyText extracted from the given url.
 */
function setImageText(
    image: HTMLImageElement, text: HTMLParagraphElement, url: URLSearchParams,
    keyImage: string, keyText: string) {
  const valueImage = url.get(keyImage);
  if (valueImage !== null) {
    image.src = valueImage;
    const valueText = url.get(keyText);
    if (valueText !== null) {
      text.textContent = valueText;
    } else {
      text.textContent = getFilename(image.src);
    }
  }
}
