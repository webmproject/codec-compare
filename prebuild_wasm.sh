#!/bin/bash

# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -eux

if [[ "$#" -ge 1 ]]; then
  # Existing source directory is passed as an argument.
  SOURCE_DIR="${1}"
else
  # Clone the source directory from head to a temporary directory.
  SOURCE_DIR="$(mktemp -d)"
  git clone https://github.com/webmproject/codec-compare-gen.git "${SOURCE_DIR}"
fi

BUILD_DIR="${SOURCE_DIR}/build_WASM"

/bin/bash "${SOURCE_DIR}/wasm/build.sh" \
  "${SOURCE_DIR}" \
  "${BUILD_DIR}" \
  OFF

cp "${BUILD_DIR}/codec_wasm_bin.js" assets/
cp "${BUILD_DIR}/codec_wasm_bin.wasm" assets/
