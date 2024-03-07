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

import {State} from './state';

function hslToHexString(
    hue: number, saturation: number, lightness: number): string {
  // From https://en.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB_alternative
  const f = (n: number, s: number, l: number) => {
    const k = (n + hue * 360 / 30.0) % 12.0;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  const r = f(0, saturation, lightness);
  const g = f(8, saturation, lightness);
  const b = f(4, saturation, lightness);
  return rgbToHexString(r * 255, g * 255, b * 255);
}

/**
 * Assign colors to batches.
 * @param state The struct containing the batches to assign the colors to.
 */
export function setColors(state: State) {
  for (const [groupIndex, group] of state.groups.entries()) {
    // Pick colors as distinct as possible on the color wheel.
    // Limit the maximum range to account for the skipped colors below.
    let hue = 0.85 * groupIndex / (state.groups.length + 1);
    // Skip pure red which looks ominous.
    hue += 0.05;
    // Skip colors close to --mdc-theme-primary.
    if (hue > 0.63) hue += 0.10;
    // Slightly greyish to avoid burning eyes.
    const saturation = 0.8;

    for (const [indexIndex, batchIndex] of group.entries()) {
      let lightness;
      if (group.length === 1) {
        lightness = 0.5;
      } else {
        lightness = 0.2 + indexIndex * 0.4 / group.length;
      }
      state.batches[batchIndex].color =
          hslToHexString(hue, saturation, lightness);
    }
  }
}

/* Hex color to number array. */
export function hexStringToRgb(hexString: string): [number, number, number] {
  return [
    parseInt(hexString.substring(1, 3), 16),
    parseInt(hexString.substring(3, 5), 16),
    parseInt(hexString.substring(5, 7), 16)
  ];
}

/* Numbers to hex string. */
export function rgbToHexString(r: number, g: number, b: number): string {
  return '#' +
      Math.min(Math.max(Math.round(r), 0), 255).toString(16).padStart(2, '0') +
      Math.min(Math.max(Math.round(g), 0), 255).toString(16).padStart(2, '0') +
      Math.min(Math.max(Math.round(b), 0), 255).toString(16).padStart(2, '0');
}
