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

import 'jasmine';

import {FieldId} from './entry';
import {loadBatchJson, loadJsonContainingBatchJsonPaths} from './entry_loader';

describe('loadBatchJson', () => {
  it('loads a JSON file', async () => {
    const batch = await loadBatchJson('/assets/demo_batch_webp_installed.json');
    expect(batch).toBeDefined();
    expect(batch.name).toBe('libwebp');
    expect(batch.codec).toBe('WebP');
    expect(batch.constants.length).toBeGreaterThan(1);
    expect(batch.fields.length).toBeGreaterThan(1);
    expect(batch.rows.length).toBeGreaterThan(1);
    expect(batch.rows[0].length).toBe(batch.fields.length);
  });

  it('fails to load a missing JSON file', async () => {
    const batch = await loadBatchJson('/assets/missing.json').catch((error) => {
      expect(error).toEqual(new Error('/assets/missing.json (404)'));
    });
    expect(batch).toBeUndefined();
  });

  it('loads a JSON file with a bpp field', async () => {
    const response = await fetch('/assets/demo_batch_some_codec_effort0.json');
    expect(response.ok).toBeTrue();
    if (!response.ok) return;

    // There is bits-per-pixel data in the input file.
    const text = await response.text();
    expect(text).toContain('bpp');

    // Make sure the bpp field is extracted but not recomputed.
    const batch = await loadBatchJson(response.url);
    expect(batch.fields
               .filter((field) => field.id === FieldId.ENCODED_BITS_PER_PIXEL)
               .length)
        .toBe(1);
  });

  it('loads a JSON file without a bpp field but computes it', async () => {
    const response = await fetch('/assets/demo_batch_webp_installed.json');
    expect(response.ok).toBeTrue();
    if (!response.ok) return;

    // No bits-per-pixel data in the input file.
    const text = await response.text();
    expect(text).not.toContain('bpp');

    // The bits-per-pixel field still exists because it was computed.
    const batch = await loadBatchJson(response.url);
    const bppFieldIndex = batch.fields.findIndex(
        (field) => field.id === FieldId.ENCODED_BITS_PER_PIXEL);
    expect(bppFieldIndex).not.toBe(-1);
    expect(bppFieldIndex).toBeLessThan(batch.rows[0].length);
    if (bppFieldIndex !== -1 && bppFieldIndex < batch.rows[0].length) {
      expect(batch.rows[0][bppFieldIndex]).not.toBe(0);

      const field = batch.fields[bppFieldIndex];
      expect(field.isNumber).toBeTrue();
      expect(field.isInteger).toBeFalse();
      expect(field.uniqueValuesArray).not.toHaveSize(0);
      expect(field.rangeStart).toBeLessThan(field.rangeEnd);

      // Make sure the computation is correct.
      const encodedSizeFieldIndex =
          batch.fields.findIndex((field) => field.id === FieldId.ENCODED_SIZE);
      const widthFieldIndex =
          batch.fields.findIndex((field) => field.id === FieldId.WIDTH);
      const heightFieldIndex =
          batch.fields.findIndex((field) => field.id === FieldId.HEIGHT);
      expect(encodedSizeFieldIndex).not.toBe(-1);
      expect(widthFieldIndex).not.toBe(-1);
      expect(heightFieldIndex).not.toBe(-1);
      if (encodedSizeFieldIndex !== -1 && widthFieldIndex !== -1 &&
          heightFieldIndex !== -1) {
        for (const row of batch.rows) {
          expect(row[bppFieldIndex])
              .toBeCloseTo(
                  (row[encodedSizeFieldIndex] as number) * 8 /
                      ((row[widthFieldIndex] as number) *
                       (row[heightFieldIndex] as number)),
                  0.001);
        }
      }
    }
  });

  it('loads a JSON file where bpp cannot be computed', async () => {
    const response = await fetch('/assets/demo_batch_some_codec_exp.json');
    expect(response.ok).toBeTrue();
    if (!response.ok) return;

    // No pixel count data in the input file.
    const text = await response.text();
    expect(text).not.toContain('width');
    expect(text).not.toContain('height');

    // The bits-per-pixel field cannot be computed.
    const batch = await loadBatchJson(response.url);
    expect(batch.fields.find(
               (field) => field.id === FieldId.ENCODED_BITS_PER_PIXEL))
        .toBeUndefined();
  });
});

describe('loadJsonContainingBatchJsonPaths', () => {
  it('loads a JSON file', async () => {
    const paths =
        await loadJsonContainingBatchJsonPaths('/assets/demo_batches.json');
    expect(paths).toEqual(jasmine.arrayWithExactContents([
      '/assets/demo_batch_some_codec_exp.json',
      '/assets/demo_batch_some_codec_effort1.json',
      '/assets/demo_batch_some_codec_effort2.json',
      '/assets/demo_batch_other_codec_settingA.json',
      '/assets/demo_batch_other_codec_settingB.json',
      '/assets/demo_batch_other_codec_settingC.json',
    ]));
  });

  it('fails to load a missing JSON file', async () => {
    const paths =
        await loadJsonContainingBatchJsonPaths('/assets/missing.json')
            .catch((error) => {
              expect(error).toEqual(new Error('/assets/missing.json (404)'));
            });
    expect(paths).toBeUndefined();
  });
});
