// Copyright 2025 Google LLC
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

import {FieldFilterWebBppJpeg} from './filter_ranges';

describe('FieldFilterWebBppJpeg', () => {
  it('filters out bpp values in the extreme deciles', async () => {
    const filter = new FieldFilterWebBppJpeg(/*mpFieldIndex=*/ 0);
    // bucket 0
    expect(filter.filtersOut([0], 0)).toBeTrue();
    expect(filter.filtersOut([0], 1)).toBeFalse();
    expect(filter.filtersOut([0.099], 11)).toBeFalse();
    expect(filter.filtersOut([0], 12345)).toBeTrue();
    // bucket 9
    expect(filter.filtersOut([0.901], 0.37)).toBeTrue();
    expect(filter.filtersOut([0.901], 0.38)).toBeFalse();
    expect(filter.filtersOut([1], 4.78)).toBeFalse();
    expect(filter.filtersOut([1], 4.79)).toBeTrue();
    // bucket 10
    expect(filter.filtersOut([1.001], 0.36)).toBeTrue();
    expect(filter.filtersOut([1.1], 0.37)).toBeFalse();
    expect(filter.filtersOut([1.002], 4.35)).toBeFalse();
    expect(filter.filtersOut([2], 4.36)).toBeTrue();
    // bucket 22
    expect(filter.filtersOut([14], 0.15)).toBeTrue();
    expect(filter.filtersOut([13.1], 0.16)).toBeFalse();
    expect(filter.filtersOut([12345], 1.2345)).toBeFalse();
  });
});
