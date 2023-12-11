/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * See http://karma-runner.github.io/6.4/config/files.html#loading-assets.
 * @param {!Object} config
 */
module.exports = (config) => {
  config.set({
    frameworks: ['jasmine', 'karma-typescript'],
    plugins: [
      'karma-jasmine', 'karma-chrome-launcher', 'karma-typescript',
      'karma-spec-reporter'
    ],
    karmaTypescriptConfig: {
      tsconfig: './tsconfig.json',
      bundlerOptions:
          {transforms: [require('karma-typescript-es6-transform')()]}
    },
    files: [
      {pattern: 'src/**/*.ts'},
      {pattern: 'assets/**', watched: false, included: false, served: true}
    ],
    proxies: {'/assets/': '/base/assets/'},
    preprocessors: {'src/**/*.ts': ['karma-typescript']},
    reporters: ['spec', 'karma-typescript'],
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ['ChromeHeadless'],
    // Makes "karma start" return. Avoids the need for Ctrl+C after "npm test".
    singleRun: true
  });
};