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
 * The fields and constants that are recognized by the codec_compare framework.
 * Other custom fields may be used but there is no special behavior attached
 * (for example DATE being parsed to a human-readable day and hour).
 */
export enum FieldId {
  // Batch metadata (usually constants).
  BATCH_NAME,
  CODEC_NAME,
  CODEC_VERSION,
  DATE,
  SOURCE_DATA_SET,  // For example the URL to access the corpus assets.
  SOURCE_TAGS,      // Asset tags in the form "tag=[bitmask]&tag 2=[bitmask]".
  SOURCE_IMAGE_PATH,
  ENCODED_IMAGE_PATH,
  DECODED_IMAGE_PATH,
  PREVIEW_PATH,  // Thumbnail.
  ENCODING_COMMAND,
  DECODING_COMMAND,
  // Batch values (usually fields).
  SOURCE_IMAGE_NAME,
  ENCODED_IMAGE_NAME,
  DECODED_IMAGE_NAME,
  WIDTH,                   // Number of pixel columns in SOURCE_IMAGE_NAME.
  HEIGHT,                  // Number of pixel rows in SOURCE_IMAGE_NAME.
  FRAME_COUNT,             // Number of frames in SOURCE_IMAGE_NAME.
  EFFORT,                  // Encoding setting.
  QUALITY,                 // Encoding setting.
  PSNR,                    // Difference between original and decoded images.
  SSIM,                    // Difference between original and decoded images.
  DSSIM,                   // Difference between original and decoded images.
  MSSSIM,                  // Difference between original and decoded images.
  BUTTERAUGLI,             // Difference between original and decoded images.
  SSIMULACRA,              // Difference between original and decoded images.
  SSIMULACRA2,             // Difference between original and decoded images.
  CIEDE2000,               // Difference between original and decoded images.
  FLIP,                    // Difference between original and decoded images.
  LPIPS,                   // Difference between original and decoded images.
  P3NORM,                  // Difference between original and decoded images.
  ENCODED_SIZE,            // In bytes.
  ENCODED_BITS_PER_PIXEL,  // Should be ENCODED_SIZE / (WIDTH * HEIGHT).
  MEGAPIXELS,              // Should be (WIDTH * HEIGHT) / 1,000,000.
  ENCODING_DURATION,       // In seconds.
  DECODING_DURATION,       // In seconds.
  RAW_DECODING_DURATION,   // Should be DECODING_DURATION exclusive of the color
                           // conversion time.
  // Unknown.
  CUSTOM,
}

/**
 * Maps common constant/field keys as seen in raw JSON data to a FieldId.
 * The key is case-sensitive and compared to lower caps input, so make sure to
 * have at least one lower cap key per FieldId.
 */
const NAME_TO_FIELD_ID = new Map<string, FieldId>([
  ['name', FieldId.BATCH_NAME],
  ['codec', FieldId.CODEC_NAME],
  ['version', FieldId.CODEC_VERSION],
  ['time', FieldId.DATE],  // "date" is easier to distinguish from "duration"
                           // than "time" but "time" is shown to the user
                           // because it also contains the hour so it is more
                           // accurate than "date".
  ['source data set', FieldId.SOURCE_DATA_SET],
  ['source tags', FieldId.SOURCE_TAGS],
  ['source image path', FieldId.SOURCE_IMAGE_PATH],
  ['original path', FieldId.SOURCE_IMAGE_PATH],
  ['encoded image', FieldId.ENCODED_IMAGE_PATH],
  ['encoded path', FieldId.ENCODED_IMAGE_PATH],
  ['decoded image', FieldId.DECODED_IMAGE_PATH],
  ['decoded path', FieldId.DECODED_IMAGE_PATH],
  ['preview', FieldId.PREVIEW_PATH],
  ['thumbnail', FieldId.PREVIEW_PATH],
  ['encoding command', FieldId.ENCODING_COMMAND],
  ['encoding cmd', FieldId.ENCODING_COMMAND],
  ['decoding command', FieldId.DECODING_COMMAND],
  ['decoding cmd', FieldId.DECODING_COMMAND],
  ['source image', FieldId.SOURCE_IMAGE_NAME],
  ['original name', FieldId.SOURCE_IMAGE_NAME],
  ['encoded name', FieldId.ENCODED_IMAGE_NAME],
  ['encoded image name', FieldId.ENCODED_IMAGE_NAME],
  ['decoded name', FieldId.DECODED_IMAGE_NAME],
  ['decoded image name', FieldId.DECODED_IMAGE_NAME],
  ['width', FieldId.WIDTH],
  ['height', FieldId.HEIGHT],
  ['frame count', FieldId.FRAME_COUNT],
  ['effort', FieldId.EFFORT],
  ['quality', FieldId.QUALITY],
  ['psnr', FieldId.PSNR],
  ['ssim', FieldId.SSIM],
  ['dssim', FieldId.DSSIM],
  ['msssim', FieldId.MSSSIM],
  ['butteraugli', FieldId.BUTTERAUGLI],
  ['ssimulacra', FieldId.SSIMULACRA],
  ['ssimulacra2', FieldId.SSIMULACRA2],
  ['ciede2000', FieldId.CIEDE2000],
  ['flip', FieldId.FLIP],
  ['lpips', FieldId.LPIPS],
  ['p3-norm', FieldId.P3NORM],
  ['encoded size', FieldId.ENCODED_SIZE],
  ['bpp', FieldId.ENCODED_BITS_PER_PIXEL],
  ['megapixels', FieldId.MEGAPIXELS],
  ['encoding time', FieldId.ENCODING_DURATION],
  ['decoding time', FieldId.DECODING_DURATION],
  ['raw decoding time', FieldId.RAW_DECODING_DURATION],
]);

/**
 * The set of FieldIds corresponding to visual quality metrics. This is ordered
 * by decreasing preference of which matcher is enabled by default.
 */
export const DISTORTION_METRIC_FIELD_IDS = [
  FieldId.SSIM, FieldId.PSNR, FieldId.SSIMULACRA2, FieldId.DSSIM,
  FieldId.MSSSIM, FieldId.BUTTERAUGLI, FieldId.SSIMULACRA, FieldId.CIEDE2000,
  FieldId.FLIP, FieldId.LPIPS, FieldId.P3NORM
];

function fieldNameToFieldId(name: string): FieldId {
  return NAME_TO_FIELD_ID.get(name.toLowerCase().replaceAll('_', ' ')) ??
      FieldId.CUSTOM;
}

function fieldPrettyName(id: FieldId, name: string): string {
  // Consider the first occurrence of id in NAME_TO_FIELD_ID to be the
  // human-readable property name.
  for (const entry of Array.from(NAME_TO_FIELD_ID.entries())) {
    if (entry[1] === id) {
      if (DISTORTION_METRIC_FIELD_IDS.includes(id)) {
        // Display distortion metrics as uppercase.
        return entry[0].toUpperCase();
      }
      return entry[0];
    }
  }
  // Custom properties are displayed too.
  return name.replaceAll('_', ' ');
}

export function fieldUnit(id: FieldId): string {
  if (DISTORTION_METRIC_FIELD_IDS.includes(id)) {
    // Display distortion metrics as uppercase.
    return 'dB';
  }
  switch (id) {
    case FieldId.WIDTH:
    case FieldId.HEIGHT:
      return 'px';
    case FieldId.ENCODED_SIZE:
      return 'B';
    case FieldId.ENCODED_BITS_PER_PIXEL:
      return 'bpp';
    case FieldId.MEGAPIXELS:
      return 'MP';
    case FieldId.ENCODING_DURATION:
    case FieldId.DECODING_DURATION:
    case FieldId.RAW_DECODING_DURATION:
      return 's';
    default:
      return '';
  }
}

/** Data column in a Batch. For example: source_image, encoding_time etc. */
export class Field {
  id: FieldId;
  displayName: string;
  uniqueValuesArray: string[] = [];
  isNumber = false;
  isInteger = false;
  rangeStart = 0;
  rangeEnd = 0;
  smallestAbsoluteNonZero = 1;

  /**
   * @param name Field name (example: "image_name").
   * @param description Field description (example: "Original file name").
   */
  constructor(public name: string, public description: string) {
    this.id = fieldNameToFieldId(name);
    this.displayName = fieldPrettyName(this.id, name);
  }

  /**
   * Registers the Field type and range of values. To be called for each input
   * row of the Batch data column.
   * @param value Textual or numerical value in the Batch data column.
   * @param uniqueValuesSet Other values seen so far in that column.
   */
  addValue(value: string, uniqueValuesSet: Set<string>) {
    if (uniqueValuesSet.has(value)) {
      return;
    }
    uniqueValuesSet.add(value);
    if (uniqueValuesSet.size === 1) {
      const valueNumber = Number(value);
      this.isNumber = !isNaN(valueNumber);
      if (this.isNumber) {
        this.rangeStart = valueNumber;
        this.rangeEnd = valueNumber;
        this.smallestAbsoluteNonZero = valueNumber;
      }
    } else if (this.isNumber) {
      const valueNumber = Number(value);
      this.isNumber = !isNaN(valueNumber);
      if (this.isNumber) {
        this.rangeStart = Math.min(this.rangeStart, valueNumber);
        this.rangeEnd = Math.max(this.rangeEnd, valueNumber);
        if (valueNumber !== 0) {
          this.smallestAbsoluteNonZero =
              Math.min(this.smallestAbsoluteNonZero, Math.abs(valueNumber));
        }
      } else {
        this.rangeStart = 0;
        this.rangeEnd = 0;
        this.smallestAbsoluteNonZero = 1;
      }
    }
  }

  /** Convenience function. Can be used for tests. */
  addValues(rows: Entry[], fieldIndex: number) {
    const uniqueValuesSet = new Set<string>();
    for (const row of rows) {
      this.addValue(String(row[fieldIndex]), uniqueValuesSet);
    }
    this.uniqueValuesArray = Array.from(uniqueValuesSet);
  }
}

/**
 * Same as a Field but its value is fixed or can only vary depending on another
 * constant or field.
 */
export class Constant {
  id: FieldId;
  displayName: string;

  /**
   * @param name Constant field name (example: "license").
   * @param description Constant field description
   *     (example: "The license associated with this generated data.").
   * @param value Constant field value (example: "Apache2").
   */
  constructor(
      public name: string, public description: string, public value = '') {
    this.id = fieldNameToFieldId(name);
    this.displayName = fieldPrettyName(this.id, name);
  }
}

/**
 * Returns true if the two fields or constants can be used as a matcher, a
 * metric or just displayed side-by-side because they have the same meaning.
 */
export function areFieldsComparable(
    a: Field|Constant, b: Field|Constant): boolean {
  if (a.id === FieldId.CUSTOM) {
    return a.displayName.toLowerCase() === b.displayName.toLowerCase();
  }
  return a.id === b.id;
}

/** One row of data in a Batch. */
export class Entry extends Array<string|number> {}

/** The results of a codec encoding/decoding experiment. */
export class Batch {
  index = -1;  // Index of this batch within State.batches.

  name = 'untitled';
  codec = 'unknown';
  version = '';
  time: number|undefined = undefined;
  timeStringShort = 'Unknown';
  timeStringLong = 'There is no information about the generation date.';
  constants: Constant[] = [];
  fields: Field[] = [];
  rows: Entry[] = [];

  color = '#000000';  // Each batch is assigned an arbitrary unique color.

  /**
   * @param url The url to the JSON data.
   * @param folderPath The path of the folder containing the JSON data.
   */
  constructor(public url: string, public folderPath: string) {}
}