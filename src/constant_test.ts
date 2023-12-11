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

import {getFinalConstantValues} from './constant';
import {Batch, Constant, Field} from './entry';

describe('getFinalConstantValues', () => {
  let batch: Batch;
  beforeEach(() => {
    batch = new Batch('url', 'folder/path');
    batch.index = 0;
    // The descriptions of fields and constants are not used in this test.
    batch.fields = [
      new Field('fieldA', 'unused'),
      new Field('field_b', 'unused'),
    ];
  });

  it('replaces variables in constants by field values', () => {
    batch.constants = [
      new Constant(
          'constantForFieldA', 'unused', 'value of fieldA is ${fieldA}'),
      new Constant(
          'constantForField_b', 'unused', 'value of field_b is ${field_b}'),
    ];

    expect(getFinalConstantValues(batch, ['valueA', 42])).toEqual([
      'value of fieldA is valueA',
      'value of field_b is 42',
    ]);
  });

  it('leaves missing references as literal text', () => {
    batch.constants = [
      new Constant(
          'constantForMissingFieldC', 'unused', 'there is no ${fieldC}'),
    ];

    expect(getFinalConstantValues(batch, ['unused', 'unused'])).toEqual([
      'there is no ${fieldC}',
    ]);
  });

  it('replaces variables in constants by constant values', () => {
    batch.constants = [
      new Constant('a', 'unused', '${fieldA}'),
      new Constant('b', 'unused', 'c is "${c}"'),
      new Constant('c', 'unused', 'a is "${a}"'),
    ];

    expect(getFinalConstantValues(batch, ['valueA', 'unused'])).toEqual([
      'valueA',
      'c is "a is "valueA""',
      'a is "valueA"',
    ]);
  });

  it('replaces self references once', () => {
    batch.constants = [new Constant('a', 'unused', '${a} is ${a}')];

    expect(getFinalConstantValues(batch, ['unused', 'unused'])).toEqual([
      '${a} is ${a} is ${a} is ${a}',
    ]);
  });

  it('handles circular references partially', () => {
    batch.constants = [
      new Constant('a', 'unused', '${b} (b)'),
      new Constant('b', 'unused', '${c} (c)'),
      new Constant('c', 'unused', '${a} (a)'),
    ];

    expect(getFinalConstantValues(batch, ['unused', 'unused'])).toEqual([
      '${b} (b) (a) (c) (b)',
      '${b} (b) (a) (c)',
      '${b} (b) (a)',
    ]);
  });
});
