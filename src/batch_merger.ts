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
