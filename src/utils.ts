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
