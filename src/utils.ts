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

/**
 * Tries to guess if the browser can display the image or if it will download
 * it instead.
 */
export function isNativelySupported(imagePath: string): boolean {
  const path = imagePath.toLowerCase();
  return (
      path.endsWith('.png') || path.endsWith('.jpeg') ||
      path.endsWith('.jpg') || path.endsWith('.webp') ||
      path.endsWith('.avif'));
}

/** Returns the filename part of a path. */
export function getFilename(path: string): string {
  return path.substring(path.lastIndexOf('/') + 1);
}

/**
 * Applies a function to each element depending on a base-16 bitmask.
 * Returns false in case of invalid bitmask.
 */
export function applyBase16Bitmask(
    bitmask: string, numElements: number,
    effect: (elementIndex: number, on: boolean) => void): boolean {
  for (let elementIndex = 0; elementIndex < numElements; ++elementIndex) {
    const hexCharIndex = Math.floor(elementIndex / 4);
    if (hexCharIndex >= bitmask.length) return false;

    // "Code must not use parseInt except for non-base-10" but base-16 is
    // not recognized by the linter.
    // tslint:disable-next-line:ban
    const hexChar = parseInt(bitmask[hexCharIndex], 16);
    if (!isFinite(hexChar)) return false;

    if ((hexChar & (1 << (elementIndex % 4))) === 0) {
      effect(elementIndex, false);
    } else {
      effect(elementIndex, true);
    }
  }
  return true;
}

/** Returns a base-16 bitmask for the given number of elements. */
export function getBase16Bitmask(
    numElements: number,
    isElementOn: (elementIndex: number) => boolean): string {
  let hexValue = '';
  let incompleteHexDigit = 0;
  let i = 0;
  for (let elementIndex = 0; elementIndex < numElements; ++elementIndex) {
    if (isElementOn(elementIndex)) {
      incompleteHexDigit |= 1 << i;
    }
    ++i;
    if (i === 4) {
      hexValue += incompleteHexDigit.toString(16);
      incompleteHexDigit = 0;
      i = 0;
    }
  }
  if (i !== 0) {
    hexValue += incompleteHexDigit.toString(16);
  }
  return hexValue;
}

/**
 * Removes or add the array elements from/to the set depending on the bitmask.
 * Returns false in case of invalid bitmask.
 */
export function applyBitmaskToStringArray(
    elements: string[], bitmask: string, set: Set<string>): boolean {
  return applyBase16Bitmask(
      bitmask, elements.length, (elementIndex: number, on: boolean) => {
        if (on) {
          set.add(elements[elementIndex]);
        } else {
          set.delete(elements[elementIndex]);
        }
      });
}

export function reverseMap(map: Map<string, Set<string>>):
    Map<string, Set<string>> {
  const reverseMap = new Map<string, Set<string>>();
  for (const [key, value] of map.entries()) {
    for (const element of value) {
      const oldSet = reverseMap.get(element);
      if (oldSet === undefined) {
        reverseMap.set(element, new Set([key]));
      } else {
        oldSet.add(key);
      }
    }
  }
  return reverseMap;
}
