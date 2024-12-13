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

/** Accumulates values and computes the given quantile. */
export class Quantile {
  /**
   * Adds a value to be part of the points on which the quantile is computed.
   */
  add(value: number) {
    this.values.push(value);
    this.valuesAreSorted = false;
  }

  /** Computes and returns the quantile of all the added values so far. */
  get(quantile: number) {
    if (this.values.length === 0) {
      return 0;
    }
    if (!this.valuesAreSorted) {
      this.values.sort((a: number, b: number) => a - b);
      this.valuesAreSorted = true;
    }
    // Naive quantile computation for now.
    return this.values[Math.floor((this.values.length - 1) * quantile)];
  }

  private values = new Array<number>();
  private valuesAreSorted = true;
}
