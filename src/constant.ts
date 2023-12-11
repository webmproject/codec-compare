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

import {Batch, Entry, FieldId} from './entry';

function getFinalName(
    batch: Batch, entry: Entry, finalValues: string[],
    startedIndices: Set<number>, finishedIndices: Set<number>,
    constantIndex: number) {
  // Just take the final string in the cache.
  if (finishedIndices.has(constantIndex)) {
    return finalValues[constantIndex];
  }

  // Prevent infinite loops.
  if (startedIndices.has(constantIndex)) {
    return finalValues[constantIndex];
  }
  startedIndices.add(constantIndex);

  if (batch.constants[constantIndex].id === FieldId.DATE) {
    // Special case.
    finalValues[constantIndex] = batch.timeStringShort;
  } else {
    // Recursively find the final string.
    finalValues[constantIndex] = batch.constants[constantIndex].value.replace(
        /\$\{([a-zA-Z0-9_]+)\}/g, (match, arg) => {
          const fieldIndex = batch.fields.findIndex(
              (potentialField) => potentialField.name === arg);
          if (fieldIndex !== -1) {
            return entry[fieldIndex].toString();
          }

          const subConstantIndex = batch.constants.findIndex(
              (potentialSubConstant) => potentialSubConstant.name === arg);
          if (subConstantIndex !== -1) {
            return getFinalName(
                batch, entry, finalValues, startedIndices, finishedIndices,
                subConstantIndex);
          }
          return match;
        });
  }

  finishedIndices.add(constantIndex);
  return finalValues[constantIndex];
}

/**
 * Given a set of constants from a batch and a row of data, returns a set
 * containing one formatted string per constant. Any occurrence of another
 * constant or field under the form "${constant_or_field_name}" is replaced
 * with its formatted string. Loops are handled by skipping some replacements.
 */
export function getFinalConstantValues(batch: Batch, entry: Entry): string[] {
  const finalValues: string[] = [];  // As many as Batch.constants.
  const startedIndices = new Set<number>();
  const finishedIndices = new Set<number>();

  // Prefill with raw values.
  for (const [constantIndex, constant] of batch.constants.entries()) {
    finalValues[constantIndex] = constant.value;
  }

  for (const [constantIndex, _] of batch.constants.entries()) {
    getFinalName(
        batch, entry, finalValues, startedIndices, finishedIndices,
        constantIndex);
  }
  return finalValues;
}
