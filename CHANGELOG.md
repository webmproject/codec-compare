# Changelog

## v0.2.3

- No longer limit JPEG XL input quality range to [75:99] by default (introduced
  at v0.2.1). Expect custom bpp or quality filters to be defined in the presets
  instead.
- Add lazy row loading setting for more reactive table panels.
- Add animation frame count support.
- Fade unused images in the gallery tab.
- Hide matched pairs in the graph by default if there are more than two
  experiments.

## v0.2.2

- Add DSSIM distortion metric recognition.

## v0.2.1

- Display the URL of the batch JSON on load failure.
- Display a warning when using effort or quality encoding setting as a match
  criterion.
- Display enabled filters in the Summary tab.
- Do not group batches with different filters in the Summary tab.
- Add built-in support for raw decoding duration (same as decoding duration but
  exclusive of any color conversion).
- Limit JPEG XL input quality range to [75:99] by default.
- Rename "quality metric" to "distortion metric" in the code to avoid confusing
  it with "encoder quality setting".
- Select default distortion metrics based on what the codecs optimize for.
- Fix NaN issue with mwc-slider handling non-integer ranges.

## v0.2.0

- Show a simple sentence by default. Keep the advanced interface in another tab.
- Add the source asset gallery in a tab.

## v0.1.10

- Fix swapped data point display toggle setting when off by default.
- Improve matches table presentation.

## v0.1.9

- Use bits-per-pixel instead of bytes-per-pixel for the "bpp" metric.

## v0.1.8

- Add matcher warning display capability.
- Add metric warning display capability.
- Replace the Settings page by a Settings section in the left menu.
- Fix various scroll bars.
- Hide the bits-per-pixel matcher.
- Hide the bits-per-pixel metric.
- Pick two objective quality metrics by default.
- The two plot axis can be set directly.
- Fit the image to the viewport in the visualizer.

## v0.1.2

Initial release of the Codec-Compare static front-end framework.
