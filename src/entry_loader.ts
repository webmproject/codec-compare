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

import {Batch, Constant, Entry, Field, FieldId} from './entry';

function getFormattedFailureString(response: Response): string {
  return new URL(response.url).pathname + ` (${response.status})`;
}

/**
 * Fetches and parses the JSON at batchJsonPath containing the data of a single
 * Batch.
 * @param batchJsonPath The path to the JSON to fetch.
 */
export async function loadBatchJson(batchJsonPath: string): Promise<Batch> {
  try {
    const response = await fetch(batchJsonPath);
    if (!response.ok) {
      throw new Error(getFormattedFailureString(response));
    }
    const json = await response.json();
    const folderPath =
        batchJsonPath.substring(0, batchJsonPath.lastIndexOf('/') + 1);
    return jsonToBatch(batchJsonPath, folderPath, json);
  } catch (error) {
    if (error instanceof Error && !error.message.includes(batchJsonPath)) {
      error.message += ' in ' + batchJsonPath;
    }
    throw error;
  }
}

/**
 * Fetches and parses the JSON containing the paths to JSONs containing Batch
 * data.
 * @param path The path to the JSON to fetch.
 */
export async function loadJsonContainingBatchJsonPaths(path: string):
    Promise<string[]> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(getFormattedFailureString(response));
  }
  const json = await response.json();
  let paths = jsonToBatches(json);
  const pathParent = path.substring(0, path.lastIndexOf('/'));
  if (pathParent.length > 1) {
    // Propagate the absolute or relative path prefix of the main JSON
    // to the child JSON paths with relative prefixes.
    const fixedPaths: string[] = [];
    for (const childPath of paths) {
      if (childPath.startsWith('/') || childPath.includes('://')) {
        // Absolute path.
        fixedPaths.push(childPath);
      } else {
        // Relative path. Consider it relative to pathParent.
        fixedPaths.push(`${pathParent}/${childPath}`);
      }
    }
    paths = fixedPaths;
  }
  return paths;
}

function jsonToBatches(json: unknown): string[] {
  if (!json || !Array.isArray(json)) {
    throw new TypeError('JSON payload cannot be cast to an array of strings');
  }

  const paths: string[] = [];
  for (const path of json) {
    paths.push(path.toString());
  }
  if (paths.length === 0) {
    throw new Error('JSON payload has no string content');
  }
  return paths;
}

function jsonToBatch(
    url: string, batchJsonFolderPath: string, json: unknown): Batch {
  if (!json || typeof json !== 'object') {
    throw new TypeError('JSON payload is not of type object');
  }

  const batch = new Batch(url, batchJsonFolderPath);
  // batch.index is set in State.initialize().

  // Register the names and descriptions of constants and fields.
  for (const [key, maybeDescriptions] of Object.entries(json)) {
    if (key === 'constant_descriptions') {
      for (const constantDescription of maybeDescriptions) {
        const entries = Object.entries(constantDescription);
        if (entries.length === 1) {
          const [name, description] = entries[0];
          if (typeof description === 'string') {
            batch.constants.push(new Constant(name, description));
          }
        }
      }
    }
    if (key === 'field_descriptions') {
      for (const fieldDescription of maybeDescriptions) {
        const entries = Object.entries(fieldDescription);
        if (entries.length === 1) {
          const [name, description] = entries[0];
          if (typeof description === 'string') {
            batch.fields.push(new Field(name, description));
          }
        }
      }
    }
  }

  if (batch.fields.length < 1) {
    throw new Error('JSON payload has no field');
  }
  const uniqueValuesSets: Set<string>[] = [];
  for (const _ of batch.fields) uniqueValuesSets.push(new Set<string>());

  // Copy the values of constants and raw data.
  for (const [key, values] of Object.entries(json)) {
    if (key === 'constant_values') {
      let constantIndex = 0;
      for (const constantValue of values) {
        if (constantIndex >= batch.constants.length) {
          throw new Error(`There are more constant_values than ${
              batch.constants.length} constant_descriptions`);
        }
        const constant = batch.constants[constantIndex];
        constant.value = constantValue;
        if (constant.id === FieldId.BATCH_NAME) {
          batch.name = constant.value;
        } else if (constant.id === FieldId.CODEC_NAME) {
          batch.codec = constant.value;
        } else if (constant.id === FieldId.CODEC_VERSION) {
          batch.version = constant.value;
        } else if (constant.id === FieldId.DATE) {
          registerTime(batch, constant.value);
        }
        ++constantIndex;
      }
      if (constantIndex !== batch.constants.length) {
        throw new Error(`There are fewer constant_values than ${
            batch.constants.length} constant_descriptions`);
      }
    }
    if (key === 'field_values') {
      for (const entryIndex in values) {
        if (values.hasOwnProperty(entryIndex)) {
          const row = values[entryIndex];
          const entry = new Entry();
          let fieldIndex = 0;
          for (const value of row) {
            if (fieldIndex >= batch.fields.length) {
              throw new Error(
                  `${row} has more than ${batch.fields.length} fields`);
            }
            batch.fields[fieldIndex].addValue(
                value, uniqueValuesSets[fieldIndex]);
            entry.push(value);
            ++fieldIndex;
          }
          if (fieldIndex !== batch.fields.length) {
            throw new Error(
                `${row} has not exactly ${batch.fields.length} fields`);
          }
          batch.rows.push(entry);
        }
      }
    }
  }

  // Convert
  const processField = (field: Field, fieldIndex: number) => {
    field.uniqueValuesArray = Array.from(uniqueValuesSets[fieldIndex]);
    field.uniqueValuesArray.sort();
    if (field.isNumber) {
      for (const row of batch.rows) {
        row[fieldIndex] = Number(row[fieldIndex]);
      }
      field.isInteger = true;
      // Iterate through uniqueValuesArray instead of uniqueValuesSet to avoid
      // the TS2802 error (requires --downlevelIteration or --target es2015+).
      for (const value of field.uniqueValuesArray) {
        field.isInteger &&= Number.isInteger(Number(value));
      }
    }
  };
  for (const [fieldIndex, field] of batch.fields.entries()) {
    processField(field, fieldIndex);
  }

  // Compute bits-per-pixel if possible.
  const bppField =
      batch.fields.find(field => field.id === FieldId.ENCODED_BITS_PER_PIXEL);
  if (bppField === undefined) {
    const widthFieldIndex =
        batch.fields.findIndex(field => field.id === FieldId.WIDTH);
    const heightFieldIndex =
        batch.fields.findIndex(field => field.id === FieldId.HEIGHT);
    const frameCountFieldIndex =
        batch.fields.findIndex(field => field.id === FieldId.FRAME_COUNT);
    const encodedSizeFieldIndex =
        batch.fields.findIndex(field => field.id === FieldId.ENCODED_SIZE);
    if (widthFieldIndex !== -1 && heightFieldIndex !== -1 &&
        encodedSizeFieldIndex !== -1 &&
        batch.fields[widthFieldIndex].isInteger &&
        batch.fields[heightFieldIndex].isInteger &&
        batch.fields[encodedSizeFieldIndex].isInteger) {
      const fieldIndex = batch.fields.length;
      const field = new Field('bpp', 'encoded bits per pixel');
      batch.fields.push(field);
      uniqueValuesSets.push(new Set<string>());
      for (const row of batch.rows) {
        let bpp = (row[encodedSizeFieldIndex] as number) * 8 /
            ((row[widthFieldIndex] as number) *
             (row[heightFieldIndex] as number));
        if (frameCountFieldIndex !== -1 &&
            batch.fields[frameCountFieldIndex].isInteger) {
          bpp /= (row[frameCountFieldIndex] as number);
        }
        row.push(bpp);
        field.addValue(String(bpp), uniqueValuesSets[fieldIndex]);
      }
      processField(field, fieldIndex);
    }
  }
  return batch;
}

function registerTime(batch: Batch, time: string) {
  batch.time = Date.parse(time);
  if (isNaN(batch.time)) {
    batch.time = undefined;  // Failure to parse the date.
  } else {
    const date = new Date(batch.time);

    batch.timeStringShort = `${date.getFullYear()}/`;
    // getMonth() starts at 0.
    if (date.getMonth() < 9) batch.timeStringShort += '0';
    batch.timeStringShort += `${date.getMonth() + 1}/`;
    // getDate() starts at 1.
    if (date.getDate() < 10) batch.timeStringShort += '0';
    batch.timeStringShort += date.getDate();

    batch.timeStringLong = date.toLocaleString();
  }
}
