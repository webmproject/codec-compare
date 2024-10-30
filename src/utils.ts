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
 * Removes or add the array elements from/to the set depending on the bitmask.
 * Returns false in case of invalid bitmask.
 */
export function applyBitmaskToStringArray(
    elements: string[], bitmask: string, set: Set<string>): boolean {
  for (const [i, element] of elements.entries()) {
    const hexCharIndex = Math.floor(i / 4);

    // "Code must not use parseInt except for non-base-10" but base-16 is
    // not recognized by the linter.
    // tslint:disable-next-line:ban
    const hexChar = parseInt(bitmask[hexCharIndex], 16);
    if (!isFinite(hexChar)) return false;

    if ((hexChar & (1 << (i % 4))) === 0) {
      set.delete(element);
    } else {
      set.add(element);
    }
  }
  return true;
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
