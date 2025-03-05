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
import {areFieldsComparable, Batch, DISTORTION_METRIC_FIELD_IDS, Entry, Field, FieldId} from './entry';
import {createFilter, FieldFilter} from './filter';
import {applyBitmaskToStringArray} from './utils';

/** Field that is common to all batches. */
export class CommonField {
  /** Merged range or set of possible values.*/
  field: Field;
  /** Filter applied to all batches.*/
  filter: FieldFilter;

  /**
   * @param batches All State.batches.
   * @param fieldIndices As many indices as State.batches and in the same order.
   *                     Each index is used for Batch.fields[].
   */
  constructor(batches: Batch[], public fieldIndices: number[]) {
    // Arbitrarily use the name and description of the field of the first batch.
    this.field = new Field(
        batches[0].fields[fieldIndices[0]].name,
        batches[0].fields[fieldIndices[0]].description);

    // Merge the unique values from all batches.
    const uniqueValuesSet = new Set<string>();
    for (const batch of batches) {
      const field = batch.fields[fieldIndices[batch.index]];
      for (const uniqueValue of field.uniqueValuesArray) {
        this.field.addValue(uniqueValue, uniqueValuesSet);
      }
    }
    this.field.uniqueValuesArray = Array.from(uniqueValuesSet);
    this.field.uniqueValuesArray.sort();
    if (this.field.isNumber) {
      this.field.isInteger = true;
      for (const value of this.field.uniqueValuesArray) {
        this.field.isInteger &&= Number.isInteger(Number(value));
      }
    }

    // Initialize the filter. It is disabled by default.
    this.filter = createFilter(this.field);
  }
}

/** Returns the fields common to all batches. */
export function createCommonFields(batches: Batch[]): CommonField[] {
  const commonFields: CommonField[] = [];
  if (batches.length === 0) {
    return commonFields;
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
    // Common fields are only used for filtering source images for now.
    if (field.id !== FieldId.SOURCE_IMAGE_NAME) continue;

    commonFields.push(new CommonField(batches, fieldIndices));
  }
  return commonFields;
}

function sourceTagsFromBatchesAndAssetNames(
    batches: Batch[], assetNames: string[]): Map<string, Set<string>> {
  const tagToAssetNames = new Map<string, Set<string>>();
  const tagToBitmask = new Map<string, string>();

  for (const batch of batches) {
    const constant =
        batch.constants.find(constant => constant.id === FieldId.SOURCE_TAGS);
    if (!constant) continue;
    const tagAndBitmasks = constant.value.split('&');
    for (const tagAndBitmask of tagAndBitmasks) {
      const tagAndBitmaskSplit = tagAndBitmask.split('=');
      if (tagAndBitmaskSplit.length !== 2) {
        // Badly formatted source tag.
        return new Map<string, Set<string>>();
      }
      const tag = tagAndBitmaskSplit[0];
      const bitmask = tagAndBitmaskSplit[1];

      const otherBitmask = tagToBitmask.get(tag);
      if (otherBitmask === undefined) {
        const taggedAssetNames = new Set<string>();
        if (!applyBitmaskToStringArray(assetNames, bitmask, taggedAssetNames)) {
          // Mismatch between the asset names and a bitmask.
          return new Map<string, Set<string>>();
        }
        tagToAssetNames.set(tag, taggedAssetNames);
        tagToBitmask.set(tag, bitmask);
      } else if (otherBitmask !== bitmask) {
        // Mismatch between batches about the meaning of a tag.
        return new Map<string, Set<string>>();
      }
    }
  }
  return tagToAssetNames;
}

/**
 * Returns the source asset tags and for each tag, the tagged source assets.
 * Silently returns an empty map in case of error.
 */
export function sourceTagsFromBatchesAndCommonFields(
    batches: Batch[], commonFields: CommonField[]): Map<string, Set<string>> {
  const assetNames = commonFields.find(
      commonField => commonField.field.id === FieldId.SOURCE_IMAGE_NAME);
  if (assetNames === undefined) {
    return new Map<string, Set<string>>();
  }
  return sourceTagsFromBatchesAndAssetNames(
      batches, assetNames.field.uniqueValuesArray);
}
