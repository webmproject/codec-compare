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

import {BatchSelection} from './batch_selection';
import {hexStringToRgb, rgbToHexString} from './color_setter';
import {Batch} from './entry';
import {GeometricMean} from './geometric_mean';
import {FieldMetricStats, SourceCount} from './metric';

function mergeBatchesWithSameCodec(batches: BatchSelection[]): BatchSelection|
    undefined {
  const mergedBatch =
      new Batch(batches[0].batch.url, batches[0].batch.folderPath);
  mergedBatch.index = batches[0].batch.index;  // Used to access fields through
                                               // FieldMetric.fieldIndices.
  mergedBatch.codec = batches[0].batch.codec;
  mergedBatch.name = mergedBatch.codec;
  mergedBatch.version = batches[0].batch.version;
  for (const batch of batches) {
    if (batch.batch.version !== batches[0].batch.version) return undefined;
  }

  // Use the time field as a way of signaling the aggregation.
  mergedBatch.time = undefined;
  mergedBatch.timeStringShort = 'aggregate of';
  for (const batch of batches) {
    mergedBatch.timeStringShort += ' ' + batch.batch.name;
  }
  mergedBatch.timeStringLong = mergedBatch.timeStringShort;

  // Shallow copy the fields and check their consistency accross the batches of
  // the same codec.
  mergedBatch.fields = batches[0].batch.fields;
  for (const batch of batches) {
    if (batch.batch.fields.length !== mergedBatch.fields.length) {
      return undefined;
    }
    for (let i = 0; i < mergedBatch.fields.length; i++) {
      if (batch.batch.fields[i].id !== mergedBatch.fields[i].id) {
        return undefined;
      }
    }
  }

  // Average the colors.
  let [rSum, gSum, bSum] = [0, 0, 0];
  for (const batch of batches) {
    const [r, g, b] = hexStringToRgb(batch.batch.color);
    rSum += r;
    gSum += g;
    bSum += b;
  }
  mergedBatch.color = rgbToHexString(
      rSum / batches.length, gSum / batches.length, bSum / batches.length);

  const mergedBatchSelection = new BatchSelection(mergedBatch);

  // Shallow copy the filters and check their consistency accross the batches of
  // the same codec.
  mergedBatchSelection.fieldFilters = batches[0].fieldFilters;
  for (const batch of batches) {
    if (batch.fieldFilters.length !==
        mergedBatchSelection.fieldFilters.length) {
      return undefined;
    }
    for (let i = 0; i < mergedBatchSelection.fieldFilters.length; i++) {
      const pointsAreFiltered =
          batch.fieldFilters[i].actuallyFiltersPointsOut(batch.batch.fields[i]);
      if (pointsAreFiltered !==
          mergedBatchSelection.fieldFilters[i].actuallyFiltersPointsOut(
              mergedBatch.fields[i])) {
        return undefined;
      }
      if (pointsAreFiltered) {
        if (batch.batch.fields[i].isNumber !== mergedBatch.fields[i].isNumber) {
          return undefined;
        }
        if (mergedBatch.fields[i].isNumber) {
          if (batch.fieldFilters[i].rangeStart !==
                  mergedBatchSelection.fieldFilters[i].rangeStart ||
              batch.fieldFilters[i].rangeEnd !==
                  mergedBatchSelection.fieldFilters[i].rangeEnd) {
            return undefined;
          }
        } else if (
            batch.fieldFilters[i].uniqueValues !==
            mergedBatchSelection.fieldFilters[i].uniqueValues) {
          return undefined;
        }
      }
    }
  }

  // Ignore all BatchSelection fields but the filters and the stats.
  for (const batch of batches) {
    if (batch.stats.length !== batches[0].stats.length) return undefined;
  }
  for (let stat = 0; stat < batches[0].stats.length; stat++) {
    const mergedStats = new FieldMetricStats();
    mergedStats.minRatio = batches[0].stats[stat].minRatio;
    mergedStats.maxRatio = batches[0].stats[stat].maxRatio;
    mergedStats.absoluteArithmeticMean = 0;
    mergedStats.relativeArithmeticMean = 0;

    const geometricMean = new GeometricMean();
    let weightSum = 0;
    for (const batch of batches) {
      // Weigh each batch by its match count.
      const weight = batch.matchedDataPoints.rows.length;
      // TODO: Check the validity of the aggregation methods.
      mergedStats.absoluteArithmeticMean +=
          batch.stats[stat].absoluteArithmeticMean * weight;
      for (let p = 0; p < batch.matchedDataPoints.rows.length; ++p) {
        geometricMean.add(batch.stats[stat].geometricMean);
      }
      mergedStats.minRatio =
          Math.min(mergedStats.minRatio, batch.stats[stat].minRatio);
      mergedStats.maxRatio =
          Math.max(mergedStats.maxRatio, batch.stats[stat].maxRatio);
      mergedStats.relativeArithmeticMean +=
          batch.stats[stat].relativeArithmeticMean * weight;
      weightSum += weight;
    }

    if (weightSum === 0) return undefined;
    mergedStats.absoluteArithmeticMean /= weightSum;
    mergedStats.geometricMean = geometricMean.get();
    mergedStats.relativeArithmeticMean /= weightSum;

    mergedBatchSelection.stats.push(mergedStats);
  }

  // No UI need for mergeHistograms() here. Skip it.

  return mergedBatchSelection;
}

/* Combine Batch stats based on same codec.
 * Returns partial data with shallow copies of members.
 * Returns an empty array in case of error or if there is nothing to merge. */
export function mergeBatches(
    batches: BatchSelection[], skipIndex: number): BatchSelection[] {
  const map = new Map<string, BatchSelection[]>();
  for (const batch of batches) {
    const batchesWithSameCodec = map.get(batch.batch.codec);
    if (batchesWithSameCodec === undefined) {
      map.set(batch.batch.codec, [batch]);
    } else {
      batchesWithSameCodec.push(batch);
    }
  }

  const skipCodec = (skipIndex >= 0 && skipIndex < batches.length) ?
      batches[skipIndex].batch.codec :
      undefined;
  let atLeastOneMerge = false;
  const mergedBatches: BatchSelection[] = [];
  for (const [codec, batches] of map) {
    if (codec === skipCodec) continue;

    if (batches.length === 1) {
      mergedBatches.push(batches[0]);
    } else {
      const mergedBatch = mergeBatchesWithSameCodec(batches);
      if (mergedBatch === undefined) {
        return [];
      }
      mergedBatches.push(mergedBatch);
      atLeastOneMerge = true;
    }
  }
  return atLeastOneMerge ? mergedBatches : [];
}

/** Aggregates histograms by sourceName. */
export function mergeHistograms(histograms: SourceCount[][]): SourceCount[] {
  const aggHisto = new Map<string, SourceCount>();
  for (const histogram of histograms) {
    for (const sourceCount of histogram) {
      let aggSourceCount = aggHisto.get(sourceCount.sourceName);
      if (aggSourceCount === undefined) {
        aggSourceCount = new SourceCount();
        aggSourceCount.sourceName = sourceCount.sourceName;
        aggSourceCount.sourcePath = sourceCount.sourcePath;
        aggSourceCount.previewPath = sourceCount.previewPath;
        aggSourceCount.count = sourceCount.count;
        aggHisto.set(aggSourceCount.sourceName, aggSourceCount);
      } else {
        // Keep the first set field/constant values and make sure they are
        // consistent across batches.
        if (aggSourceCount.sourcePath === undefined) {
          aggSourceCount.sourcePath = sourceCount.sourcePath;
        } else if (
            sourceCount.sourcePath !== undefined &&
            aggSourceCount.sourcePath !== sourceCount.sourcePath) {
          return [];  // Should not happen.
        }
        if (aggSourceCount.previewPath === undefined) {
          aggSourceCount.previewPath = sourceCount.previewPath;
        } else if (
            sourceCount.previewPath !== undefined &&
            aggSourceCount.previewPath !== sourceCount.previewPath) {
          return [];  // Should not happen.
        }

        aggSourceCount.count += sourceCount.count;
      }
    }
  }

  // Sort by name to have a deterministic order that is independent of the
  // histogram values which can change depending on the comparison parameters.
  return Array.from(aggHisto.values())
      .sort(
          (a, b) => a.sourceName > b.sourceName ? 1 :
              b.sourceName > a.sourceName       ? -1 :
                                                  0);
}
