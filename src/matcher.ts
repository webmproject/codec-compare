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

import {BatchSelection} from './batch_selection';
import {areFieldsComparable, Batch, DISTORTION_METRIC_FIELD_IDS, Field, FieldId} from './entry';

/** References two data points from two selected batches. */
export class Match {
  /** @param leftIndex Index in the left Batch.rows[]. */
  /** @param rightIndex Index in the right Batch.rows[]. */
  /** @param cumulativeRelativeError Small means the match can be trusted. */
  constructor(
      public leftIndex: number, public rightIndex: number,
      public cumulativeRelativeError: number) {}
}

/** A set of Matches and some aggregated stats. */
export class MatchedDataPoints {
  /** The maximum number of matching tests, limited for performance purposes. */
  static readonly MAX_NUM_COMPARISONS = 4096 * 4096;

  readonly averageRelativeError: number;
  readonly maximumRelativeError: number;

  /**
   * @param rows Union of a subset of the left Batch.rows[] and of a subset of
   *             the right Batch.rows[].
   */
  /** @param limited If some rows are missing because of MAX_NUM_COMPARISONS. */
  constructor(public rows: Match[] = [], public limited = false) {
    let sum = 0;
    let max = 0;
    for (const match of rows) {
      sum += match.cumulativeRelativeError;
      max = Math.max(max, match.cumulativeRelativeError);
    }
    this.averageRelativeError = sum / Math.max(1, rows.length);
    this.maximumRelativeError = max;
  }
}

/**
 * References two fields from two selected batches to select close data points
 * from.
 */
export class FieldMatcher {
  enabled = false;

  /**
   * @param fieldIndices As many indices as State.batches and in the same order.
   *                     Each index is used for Batch.fields[].
   * @param tolerance Threshold for the min value compared to the max value.
   *                  Example: A=80 and B=100 match a tolerance 0.2, not 0.19.
   *                  Example: A=100 and B=120 match a tolerance 0.17, not 0.16.
   *                  Can only be different from 0 if both fields are numbers.
   */
  constructor(public fieldIndices: number[], public tolerance: number) {}
}

/** Returns all possible matchers given batches. */
export function createMatchers(batches: Batch[]): FieldMatcher[] {
  const matchers: FieldMatcher[] = [];
  if (batches.length === 0) {
    return matchers;
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
    // Meaningless match criteria.
    if (field.id === FieldId.ENCODED_IMAGE_NAME) continue;
    if (field.id === FieldId.DECODED_IMAGE_NAME) continue;
    // Same source image, so these will always match. Remove them from the UI.
    if (field.id === FieldId.WIDTH || field.id === FieldId.HEIGHT) continue;
    // If bpp values are available, encoded sizes probably are too.
    // Skip the former which brings nothing as a matcher over the latter.
    if (field.id === FieldId.ENCODED_BITS_PER_PIXEL) continue;

    // Try to guess a good default tolerance.
    let defaultTolerance = 0;
    if (isNumber) {
      if (DISTORTION_METRIC_FIELD_IDS.includes(field.id)) {
        // Keep distortion metrics close for accurate means.
        defaultTolerance = 0.01;  // 1%
      } else if (field.id === FieldId.ENCODED_SIZE) {
        // Be more permissive than for distortion metrics as sizes vary more.
        defaultTolerance = 0.02;  // 2%
      } else if (
          field.id === FieldId.ENCODING_DURATION ||
          field.id === FieldId.DECODING_DURATION ||
          field.id === FieldId.RAW_DECODING_DURATION) {
        // These are not even deterministic. Be very permissive.
        defaultTolerance = 0.05;  // 5%
      } else if (field.id === FieldId.EFFORT || field.id === FieldId.QUALITY) {
        // These should not be used as matchers, especially for different
        // codecs. For the same codec, it may make sense for an exact match.
        defaultTolerance = 0;
      } else {
        // Unknown numerical field to compare batches with.
        defaultTolerance = 0.1;  // 10%
      }
    }
    matchers.push(new FieldMatcher(fieldIndices, defaultTolerance));
  }
  return matchers;
}

/** Arbitrarily enables some matchers. */
export function enableDefaultMatchers(
    batches: Batch[], matchers: FieldMatcher[]) {
  const firstBatch = batches[0];

  // Comparing codec performance on different source images makes little sense.
  // This matcher is mandatory if it exists.
  const sourceImageMatcher = matchers.find(
      (matcher) => firstBatch.fields[matcher.fieldIndices[0]].id ===
          FieldId.SOURCE_IMAGE_NAME);
  if (sourceImageMatcher !== undefined) {
    sourceImageMatcher.enabled = true;
  }

  // Find distortion metrics suggesting that it is not a lossless comparison.
  let isLossless = true;
  for (const id of DISTORTION_METRIC_FIELD_IDS) {
    const distortionMatcher = matchers.find(
        (matcher) => firstBatch.fields[matcher.fieldIndices[0]].id === id);
    if (distortionMatcher === undefined) continue;
    const distortionField =
        firstBatch.fields[distortionMatcher.fieldIndices[0]];
    if (distortionField.isNumber &&
        distortionField.uniqueValuesArray.length > 1) {
      isLossless = false;
      break;
    }
  }
  if (isLossless) return;

  // To be somewhat fair, enable the distortion metrics that the compared codecs
  // usually optimize for.
  const wantedDistortionMetrics = new Set<FieldId>();
  for (const batch of batches) {
    const codec = batch.codec.toLowerCase();
    if (codec === 'jpg' || codec === 'jpeg' || codec === 'webp') {
      wantedDistortionMetrics.add(FieldId.PSNR);
    } else if (codec === 'avif') {
      wantedDistortionMetrics.add(FieldId.SSIM);
    } else if (codec === 'jxl' || codec === 'jpegxl') {
      wantedDistortionMetrics.add(FieldId.BUTTERAUGLI);
    }
  }
  // Enabling too many metrics will result in confusion and too few points.
  if (wantedDistortionMetrics.size === 1 ||
      wantedDistortionMetrics.size === 2) {
    let anyMissingDistortionMetric = false;
    for (const id of wantedDistortionMetrics) {
      const distortionMatcher = matchers.find(
          (matcher) => firstBatch.fields[matcher.fieldIndices[0]].id === id);
      if (distortionMatcher === undefined ||
          !firstBatch.fields[distortionMatcher.fieldIndices[0]].isNumber ||
          !firstBatch.fields[distortionMatcher.fieldIndices[0]]
               .uniqueValuesArray.length) {
        anyMissingDistortionMetric = true;
        break;
      }
      const distortionField =
          firstBatch.fields[distortionMatcher.fieldIndices[0]];
      if (!distortionField.isNumber ||
          distortionField.uniqueValuesArray.length < 2) {
        anyMissingDistortionMetric = true;
        break;
      }
    }
    if (!anyMissingDistortionMetric) {
      for (const matcher of matchers) {
        if (wantedDistortionMetrics.has(
                firstBatch.fields[matcher.fieldIndices[0]].id)) {
          matcher.enabled = true;
          if (wantedDistortionMetrics.size === 2) {
            // Use a high enough tolerance so that the two matchers still select
            // a good amount of data points, for better reprenstation at the
            // expanse of precision.
            matcher.tolerance = Math.max(matcher.tolerance, 0.05);  // 5%
          }
        }
      }
      return;
    }
  }

  // Enabling metrics based on codecs did not work. Fall back to enabling some
  // widely used metric.
  for (const id of DISTORTION_METRIC_FIELD_IDS) {
    const distortionMatcher = matchers.find(
        (matcher) => firstBatch.fields[matcher.fieldIndices[0]].id === id);
    if (distortionMatcher === undefined) continue;
    const distortionField =
        firstBatch.fields[distortionMatcher.fieldIndices[0]];
    if (distortionField.isNumber &&
        distortionField.uniqueValuesArray.length > 1) {
      distortionMatcher.enabled = true;
      break;
    }
  }
}

/** Returns true if the input data sets are likely lossless. */
export function isLossless(firstBatch: Batch, matchers: FieldMatcher[]) {
  for (const matcher of matchers) {
    if (matcher.enabled &&
        DISTORTION_METRIC_FIELD_IDS.includes(
            firstBatch.fields[matcher.fieldIndices[0]].id)) {
      return false;
    }
  }
  return true;
}

/**
 * Returns a new Match if the given data point (row leftIndex from leftBatch)
 * is close enough to the other given data point (row rightIndex from
 * rightBatch) under the specified tolerances of the enabled matchers.
 * Otherwise returns undefined.
 */
function findMatch(
    leftBatch: Batch, leftIndex: number, rightBatch: Batch, rightIndex: number,
    matchers: FieldMatcher[]): Match|undefined {
  let cumulativeRatio = 1;
  for (let i = 0; i < matchers.length; ++i) {
    const matcher = matchers[i];
    if (!matcher.enabled) {
      continue;
    }

    const leftFieldIndex = matcher.fieldIndices[leftBatch.index];
    const rightFieldIndex = matcher.fieldIndices[rightBatch.index];
    const leftField = leftBatch.fields[leftFieldIndex];
    const rightField = rightBatch.fields[rightFieldIndex];

    const leftEntry = leftBatch.rows[leftIndex][leftFieldIndex];
    const rightEntry = rightBatch.rows[rightIndex][rightFieldIndex];

    if (leftEntry !== rightEntry) {
      if (matcher.tolerance > 0) {
        if (!leftField.isNumber || !rightField.isNumber) {
          throw new Error('tolerance > 0 for nonNumber values');
        }
        const left = leftEntry as number;
        const right = rightEntry as number;

        // Arbitrarily and conveniently discard any pair with opposite signs.
        if (Math.sign(left) !== Math.sign(right)) {
          return undefined;
        }
        let relativeError;
        if (left === right) {
          relativeError = 0;
        } else if (Math.abs(left) > Math.abs(right)) {
          relativeError = 1 - right / left;
        } else {
          relativeError = 1 - left / right;
        }
        // relativeError is in [0:1], 0 meaning equality.

        if (relativeError > matcher.tolerance) {
          return undefined;
        }

        // Some arbitrary way of aggregating the relativeErrors of one point.
        // The mean would be misleading because it would be lower when adding
        // a matcher that does not change the set of matched points.
        cumulativeRatio *= 1 + relativeError;
      } else {
        return undefined;
      }
    }
  }
  const cumulativeRelativeError = cumulativeRatio - 1;
  return new Match(leftIndex, rightIndex, cumulativeRelativeError);
}

/**
 * Returns the set of all data points from the left selected batch that are
 * close enough to data points from the right selected batch, given the
 * matchers.
 */
export function getDataPoints(
    left: BatchSelection, right: BatchSelection,
    matchers: FieldMatcher[]): MatchedDataPoints {
  const numEnabledMatchers =
      matchers.filter((matcher) => matcher.enabled).length;
  if (numEnabledMatchers === 0) {
    // No active matcher means no matched point.
    return new MatchedDataPoints();
  }

  // For each point, find the "best" match.
  const matches: Match[] = [];

  // Put the row indices from the right batch into buckets for faster left/right
  // row matching.
  const buckets = new Map<string, number[]>();

  // Find the most suitable field that can be used as a bucket map key.
  // This is likely the source image name.
  let rightFieldIndexForBucketKey = -1;
  let leftFieldIndexForBucketKey = -1;
  for (const matcher of matchers) {
    if (!matcher.enabled) continue;
    const rightFieldIndex = matcher.fieldIndices[right.batch.index];
    const rightField = right.batch.fields[rightFieldIndex];

    // There is no point in creating a bucket with a unique possible key value.
    if (rightField.uniqueValuesArray.length < 2) continue;

    // Fields with a non-zero tolerance would spread over multiple buckets.
    // For simplicity, these cannot be used as bucket keys.
    if (matcher.tolerance !== 0) continue;

    // Pick the field splittable into the largest number of buckets.
    if (rightFieldIndexForBucketKey === -1 ||
        rightField.uniqueValuesArray.length >
            right.batch.fields[rightFieldIndexForBucketKey]
                .uniqueValuesArray.length) {
      rightFieldIndexForBucketKey = rightFieldIndex;
      leftFieldIndexForBucketKey = matcher.fieldIndices[left.batch.index];
    }
  }

  // Fill the buckets with the indices of the rows from the right batch.
  if (rightFieldIndexForBucketKey === -1) {
    buckets.set('', [...right.filteredRowIndices]);
  } else {
    for (const rightIndex of right.filteredRowIndices) {
      const key =
          String(right.batch.rows[rightIndex][rightFieldIndexForBucketKey]);

      const bucket = buckets.get(key);
      if (bucket === undefined) {
        buckets.set(key, [rightIndex]);
      } else {
        bucket.push(rightIndex);
      }
    }
  }

  let numComparisons = 0;
  for (const leftIndex of left.filteredRowIndices) {
    const key = leftFieldIndexForBucketKey === -1 ?
        '' :
        String(left.batch.rows[leftIndex][leftFieldIndexForBucketKey]);

    const bucket = buckets.get(key);
    if (bucket === undefined || bucket.length === 0) continue;
    let bestIndexInBucket = -1;
    let bestMatch: Match|undefined = undefined;

    for (const [indexInBucket, rightIndex] of bucket.entries()) {
      const match =
          findMatch(left.batch, leftIndex, right.batch, rightIndex, matchers);
      if (match !== undefined) {
        // There is a match!
        if (bestMatch === undefined) {
          // It is the first match using leftIndex.
          bestIndexInBucket = indexInBucket;
          bestMatch = match;
        } else if (
            match.cumulativeRelativeError < bestMatch.cumulativeRelativeError) {
          // It is the best match so far using leftIndex.
          bestIndexInBucket = indexInBucket;
          bestMatch = match;
        } else if (
            match.cumulativeRelativeError ===
                bestMatch.cumulativeRelativeError &&
            match.leftIndex + match.rightIndex <
                bestMatch.leftIndex + bestMatch.rightIndex) {
          // Break ties in a symmetric way, so that swapping left and right
          // input data points lead to the same set of matched points.
          bestIndexInBucket = indexInBucket;
          bestMatch = match;
        }
        // If there is still a tie, well, too bad. It should not happen often
        // nor be a big issue.
      }

      if (++numComparisons >= MatchedDataPoints.MAX_NUM_COMPARISONS) {
        // Stop the comparisons for UI performance reasons.
        const limited = true;  // This must be communicated to the user.
        return new MatchedDataPoints(matches, limited);
      }
    }

    if (bestMatch !== undefined) {
      bucket[bestIndexInBucket] = bucket[bucket.length - 1];
      bucket.pop();
      matches.push(bestMatch);
    }
  }
  return new MatchedDataPoints(matches);
}

/**
 * Same as getDataPoints() but with similar output no matter the order of the
 * input selected batches.
 */
export function getDataPointsSymmetric(
    left: BatchSelection, right: BatchSelection,
    matchers: FieldMatcher[]): MatchedDataPoints {
  const matchedDataPoints = getDataPoints(left, right, matchers);

  // Unfortunately getDataPoints() can return a different set of matched
  // points depending on the order of left and right. The following hacky fix
  // tries swapping left and right input images, and keeps the solution with
  // the lowest averageRelativeError. Ties should be rare but additional
  // choice conditions can be added to make it as deterministic as possible.
  const swappedMatchedDataPoints = getDataPoints(right, left, matchers);
  if (swappedMatchedDataPoints.averageRelativeError <
      matchedDataPoints.averageRelativeError) {
    for (const row of swappedMatchedDataPoints.rows) {
      [row.leftIndex, row.rightIndex] = [row.rightIndex, row.leftIndex];
    }
    return swappedMatchedDataPoints;
  }

  return matchedDataPoints;
}
