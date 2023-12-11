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

/**
 * Accumulates values and computes the geometric mean.
 * See https://en.wikipedia.org/wiki/Geometric_mean.
 */
export class GeometricMean {
  /** Add a value to be part of the geometric mean. */
  add(value: number) {
    this.product *= value;
    ++this.numValues;

    // A large number of small or big values may lead to floating point
    // underflow or overflow. Avoid that by regularly dumping part of the
    // computation to a side accumulator.
    if (this.product < this.minProduct || this.product > this.maxProduct) {
      this.productLogSum += Math.log(this.product);
      this.product = 1;
    }
  }

  /** Computes and returns the geometric mean of all the added values so far. */
  get() {
    if (this.numValues === 0) return 1;
    return Math.exp(
        (this.productLogSum + Math.log(this.product)) / this.numValues);
  }

  private numValues = 0;
  private product = 1;

  /** Used when the product underflows or overflows the thresholds below. */
  private productLogSum = 0;

  /**
   * Arbitrary thresholds. Higher absolute exponent means faster computation,
   * lower absolute exponent means more precision.
   */
  private readonly minProduct = 1e-16;
  private readonly maxProduct = 1e16;
}
