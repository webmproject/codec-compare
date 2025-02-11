# Changelog

## v0.5.2

- Replace placeholder comparison presets by generic resource links.

## v0.5.1

- Fix absolute asset paths in codec_compare npm run build.

## v0.5.0

- No longer merge similar batches in Summary tab to avoid confusion.
- Add a visibility toggle button per batch in Advanced tab.

## v0.4.0

- Improve navigation by refactoring the BatchUi, BatchSelectionUi, MatchesUi,
  and MatchUi components into a single PanelUi with tabs Metadata, Filtered
  rows, and Matches.

## v0.3.1

- Add setting for displaying 10th and 90th percentiles as error bars.

## v0.3.0

- Add absolute metrics mode. Default mode remains relative ratios.

## v0.2.6

- Fix cross-batch source asset filtering by tag.

## v0.2.5

- Add support for cross-batch individual source asset filtering.
- Add support for cross-batch source asset filtering by tag.
- Add button to set the batch as the reference batch in the batch info panel.
- Add link to view only two batches in the batch info panel.

## v0.2.4

- Add the megapixels field.
- Fix Help text.
- Add axis scale mode in Settings.

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
