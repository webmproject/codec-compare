#!/bin/bash

# Copyright 2025 Google LLC
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

set -eu

sed -i'' -e 's|"/\([/a-z0-9_-]*\).json"|"\1.json"|' dist/assets/main*.js
sed -i'' -e 's|load=/\([/a-z0-9_-]*\).json|load=\1.json|' dist/assets/main*.js
sed -i'' -e 's|batch=/\([/a-z0-9_-]*\).json|batch=\1.json|g' dist/assets/main*.js
sed -i'' -e 's|/transparency_checkerboard.webp|transparency_checkerboard.webp|' dist/assets/*.js
sed -i'' -e 's|"/rainbow|"rainbow|' dist/assets/visualizer*.js
sed -i'' -e 's|"assets/rainbow|"rainbow|' dist/demo_batch*.json
sed -i'' -e 's|"/rainbow|"rainbow|' dist/demo_batch*.json
sed -i'' -e 's|"/favicon.ico"|"favicon.ico"|' dist/*.html
sed -i'' -e 's|"/assets/|"assets/|' dist/*.html

echo "postbuild.sh success"
