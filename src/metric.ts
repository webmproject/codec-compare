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

import {getFinalValue} from './constant';
import {areFieldsComparable, Batch, Field, FieldId} from './entry';
import {GeometricMean} from './geometric_mean';
import {Match} from './matcher';
import {Quantile} from './quantile';

/** References two fields from two selected batches to compare data points. */
export class FieldMetric {
  enabled = false;

  /**
   * @param fieldIndices As many indices as State.batches and in the same order.
   *                     Each index is used for Batch.fields[].
   */
  constructor(public fieldIndices: number[]) {}
}

/** Aggregated stats for a FieldMetric. */
export class FieldMetricStats {
  // Absolute values
  absoluteArithmeticMean = 0;
  absoluteArithmeticLowQuantile = 0;
  absoluteArithmeticHighQuantile = 0;

  // Relative ratios
  geometricMean = 1;
  minRatio = 1;
  maxRatio = 1;
  relativeArithmeticMean = 1;
  relativeArithmeticLowQuantile = 1;
  relativeArithmeticHighQuantile = 1;

  getAbsoluteMean() {
    return this.absoluteArithmeticMean;
  }
  getAbsoluteLowQuantile() {
    return this.absoluteArithmeticLowQuantile;
  }
  getAbsoluteHighQuantile() {
    return this.absoluteArithmeticHighQuantile;
  }

  getRelativeMean(geometric: boolean): number {
    return geometric ? this.geometricMean : this.relativeArithmeticMean;
  }
  getRelativeLowQuantile() {
    return this.relativeArithmeticLowQuantile;
  }
  getRelativeHighQuantile() {
    return this.relativeArithmeticHighQuantile;
  }
}

/** Aggregated stats for a unique source media. */
export class SourceCount {
  sourceName: string = '';                    // FieldId.SOURCE_IMAGE_NAME
  sourcePath: string|undefined = undefined;   // FieldId.SOURCE_IMAGE_PATH
  previewPath: string|undefined = undefined;  // FieldId.PREVIEW_PATH

  count = 0;  // The number of data points with this value for the fieldId.
}

/** Returns all possible metrics given two batches. */
export function createMetrics(batches: Batch[]): FieldMetric[] {
  const metrics: FieldMetric[] = [];
  if (batches.length === 0) {
    return metrics;
  }

  for (const [fieldIndex, field] of batches[0].fields.entries()) {
    const fieldIndices: number[] = [];
    fieldIndices.push(fieldIndex);
    let isNumber = field.isNumber;
    for (let i = 1; i < batches.length; ++i) {
      const otherBatch = batches[i];
      const otherFieldIndex =
          otherBatch.fields.findIndex((otherField: Field) => {
            return areFieldsComparable(field, otherField);
          });
      if (otherFieldIndex === -1) {
        break;
      }
      fieldIndices.push(otherFieldIndex);
      const otherField = otherBatch.fields[otherFieldIndex];
      isNumber = isNumber && otherField.isNumber;
    }

    // At least one batch is missing that field.
    if (fieldIndices.length !== batches.length) continue;
    // Metrics can only be computed on numbers.
    if (!isNumber) continue;
    // Same source image, so same source image features. No need to compare.
    if (field.id === FieldId.WIDTH || field.id === FieldId.HEIGHT) continue;
    if (field.id === FieldId.FRAME_COUNT) continue;
    // Encoder settings should not be compared.
    if (field.id === FieldId.EFFORT) continue;

    metrics.push(new FieldMetric(fieldIndices));
  }
  return metrics;
}

/** Arbitrarily enable some metrics (focusing on lossy image comparison). */
export function enableDefaultMetrics(
    firstBatch: Batch, metrics: FieldMetric[]) {
  let foundDecodingDuration = false;
  for (const metric of metrics) {
    const field = firstBatch.fields[metric.fieldIndices[0]];
    if (field.id === FieldId.ENCODED_SIZE ||
        field.id === FieldId.ENCODING_DURATION ||
        field.id === FieldId.DECODING_DURATION) {
      metric.enabled = true;
    }
    if (field.id === FieldId.DECODING_DURATION) {
      foundDecodingDuration = true;
    }
  }

  if (!foundDecodingDuration) {
    // If DECODING_DURATION is unavailable, maybe RAW_DECODING_DURATION is.
    for (const metric of metrics) {
      if (firstBatch.fields[metric.fieldIndices[0]].id ===
          FieldId.RAW_DECODING_DURATION) {
        metric.enabled = true;
      }
    }
  }
}

/** Selects two metrics no matter what. Prefers enabled metrics. */
export function selectPlotMetrics(firstBatch: Batch, metrics: FieldMetric[]):
    [FieldMetric|undefined, FieldMetric|undefined] {
  let xMetric: FieldMetric|undefined = undefined;
  let yMetric: FieldMetric|undefined = undefined;

  const metricToFieldId = (metric: FieldMetric) => {
    return firstBatch.fields[metric.fieldIndices[0]].id;
  };

  // Try ENCODED_SIZE as x and ENCODING_DURATION as y (or DECODING_DURATION as
  // y otherwise) if they are enabled.
  xMetric = metrics.find(
      m => m.enabled && metricToFieldId(m) === FieldId.ENCODED_SIZE);
  yMetric = metrics.find(
      m => m.enabled && metricToFieldId(m) === FieldId.ENCODING_DURATION);
  if (yMetric === undefined) {
    yMetric = metrics.find(
        m => m.enabled && metricToFieldId(m) === FieldId.DECODING_DURATION);
    if (yMetric === undefined) {
      yMetric = metrics.find(
          m => m.enabled &&
              metricToFieldId(m) === FieldId.RAW_DECODING_DURATION);
    }
  }
  if (xMetric !== undefined && yMetric !== undefined) {
    return [xMetric, yMetric];
  }

  // Try the first two enabled metrics.
  xMetric = metrics.find(m => m.enabled);
  yMetric = metrics.find(m => m.enabled && m !== xMetric);
  if (xMetric !== undefined) {
    return [xMetric, yMetric ?? xMetric];
  }
  xMetric = yMetric = undefined;

  // Fallback to whatever.
  return metrics.length > 0 ? [metrics[0], metrics[0]] : [undefined, undefined];
}

/** Returns a/b with some arbitrary real definition if both a and b are 0. */
export function getRatio(a: number, b: number) {
  return b === 0 ? (a === 0 ? 1 : Infinity) : a / b;
}

/**
 * Returns FieldMetricStats for each of the metrics, computed on the matched
 * filtered dataPoints from the leftBatch and rightBatch.
 */
export function computeStats(
    leftBatch: Batch, rightBatch: Batch, dataPoints: Match[],
    metrics: FieldMetric[]): FieldMetricStats[] {
  const stats: FieldMetricStats[] = [];
  for (const metric of metrics) {
    const leftFieldIndex = metric.fieldIndices[leftBatch.index];
    const rightFieldIndex = metric.fieldIndices[rightBatch.index];

    const fieldStats = new FieldMetricStats();
    let numDataPoints = 0;
    const leftQuantile = new Quantile();
    const rightQuantile = new Quantile();
    const geometricMean = new GeometricMean();
    let leftSum = 0;
    let rightSum = 0;
    for (const dataPoint of dataPoints) {
      const leftValue =
          leftBatch.rows[dataPoint.leftIndex][leftFieldIndex] as number;
      const rightValue =
          rightBatch.rows[dataPoint.rightIndex][rightFieldIndex] as number;
      const ratio = getRatio(leftValue, rightValue);
      // Note: A ratio of 0 would set the entire geometric mean to 0, but
      //       it is safer to surface that in the final user interface than
      //       silently skipping that data point here.

      leftQuantile.add(leftValue);
      rightQuantile.add(rightValue);
      if (numDataPoints === 0) {
        fieldStats.minRatio = ratio;
        fieldStats.maxRatio = ratio;
      } else {
        fieldStats.minRatio = Math.min(fieldStats.minRatio, ratio);
        fieldStats.maxRatio = Math.max(fieldStats.maxRatio, ratio);
      }
      geometricMean.add(ratio);
      leftSum += leftValue;
      rightSum += rightValue;
      ++numDataPoints;
    }
    if (numDataPoints > 0) {
      fieldStats.absoluteArithmeticMean = leftSum / numDataPoints;
      // TODO(yguyon): Do not hardcode quantiles but use State fields.
      fieldStats.absoluteArithmeticLowQuantile = leftQuantile.get(0.1);
      fieldStats.absoluteArithmeticHighQuantile = leftQuantile.get(0.9);
      fieldStats.geometricMean = geometricMean.get();
      fieldStats.relativeArithmeticMean = getRatio(leftSum, rightSum);
      fieldStats.relativeArithmeticLowQuantile =
          getRatio(leftQuantile.get(0.1), rightQuantile.get(0.1));
      fieldStats.relativeArithmeticHighQuantile =
          getRatio(leftQuantile.get(0.9), rightQuantile.get(0.9));
    }
    stats.push(fieldStats);
  }
  return stats;
}

/** Returns the histogram of unique source media. */
export function computeHistogram(
    batch: Batch, dataPoints: Match[]): SourceCount[] {
  const sourceNameFieldIndex =
      batch.fields.findIndex(field => field.id === FieldId.SOURCE_IMAGE_NAME);
  if (sourceNameFieldIndex === -1) return [];

  // Maps FieldId.SOURCE_IMAGE_NAME to SourceCount.
  const histogram = new Map<string, SourceCount>();

  // Start by referencing all unique source media values.
  for (const row of batch.rows) {
    const sourceName = String(row[sourceNameFieldIndex]);

    let sourceCount = histogram.get(sourceName);
    if (sourceCount === undefined) {
      sourceCount = new SourceCount();
      sourceCount.sourceName = sourceName;
      const sourcePath = getFinalValue(batch, row, FieldId.SOURCE_IMAGE_PATH);
      sourceCount.sourcePath =
          sourcePath === undefined ? undefined : String(sourcePath);
      const previewPath = getFinalValue(batch, row, FieldId.PREVIEW_PATH);
      sourceCount.previewPath =
          previewPath === undefined ? undefined : String(previewPath);
      sourceCount.count = 0;
      histogram.set(sourceName, sourceCount);
    }
  }

  // Just count matches now.
  for (const dataPoint of dataPoints) {
    let sourceCount = histogram.get(
        String(batch.rows[dataPoint.leftIndex][sourceNameFieldIndex]));
    if (sourceCount === undefined) {
      return [];  // Should not happen.
    }
    sourceCount.count++;
  }

  return Array.from(histogram.values());
}
