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

import './plot_overlay_ui';

import * as plotly from 'plotly.js-dist';

import {Batch, FieldId} from './entry';
import {dispatch, EventType, listen} from './events';
import {FieldMetric} from './metric';
import {State} from './state';

const PLOTLY_DIV_NAME = 'plotly_div';

/**
 * Rather than storing the whole mapping on the side and accessing it through
 * plotly.Data.curveNumber, store a smaller scope mapping per series.
 */
export type PlotlyData = plotly.Data&{
  /**
   * Indicates whether this series is a cloud point of compared image pairs
   * (false) or a curve where each point represents the mean of some metric for
   * a whole batch (true).
   */
  isAggregated: boolean;
  /** Only one batch index if !isAggregated. */
  batchIndices: number[];
};

/** Plot helper. */
export class PlotUi {
  /** Data to be plotted. */
  private readonly plotlyData: PlotlyData[] = [];

  /** @param state The root data object containing the full state. */
  constructor(public state: State) {}

  async setupPlot() {
    const xMetric = this.state.plotMetricHorizontal;
    const yMetric = this.state.plotMetricVertical;
    if (xMetric === undefined || yMetric === undefined) return;

    this.setPlotlyData(xMetric, yMetric);
    const xField = this.state.batches[0].fields[xMetric.fieldIndices[0]];
    const yField = this.state.batches[0].fields[yMetric.fieldIndices[0]];
    const axisType: plotly.AxisType = 'log';
    const layout = {
      xaxis: {title: xField.displayName},
      yaxis: {title: yField.displayName, type: axisType},
    };
    const config = {
      responsive: true,
      scrollZoom: true,
    };
    const plot =
        await plotly.newPlot(PLOTLY_DIV_NAME, this.plotlyData, layout, config);
    plot.on('plotly_click', (event: plotly.PlotMouseEvent) => {
      if (event.points.length !== 1) return;
      const series = event.points[0];
      // This is an instance of plotly.Data carried over from this.plotlyData.
      const plotlyData = series.data as PlotlyData;

      if (plotlyData.isAggregated) {
        const batchIndex = plotlyData.batchIndices[series.pointIndex];
        dispatch(
            batchIndex === this.state.referenceBatchSelectionIndex ?
                EventType.BATCH_INFO_REQUEST :
                EventType.MATCHES_INFO_REQUEST,
            {batchIndex});
      } else {
        dispatch(EventType.MATCH_INFO_REQUEST, {
          batchIndex: plotlyData.batchIndices[0],
          matchIndex: series.pointIndex
        });
      }
    });

    this.updateOverlay();

    listen(EventType.MATCHED_DATA_POINTS_CHANGED, () => {
      this.updatePlot();
    });
  }

  private updatePlot() {
    const xMetric = this.state.plotMetricHorizontal;
    const yMetric = this.state.plotMetricVertical;
    if (xMetric === undefined || yMetric === undefined) return;

    this.setPlotlyData(xMetric, yMetric);
    plotly.redraw(PLOTLY_DIV_NAME);  // Based on this.plotlyData, see newPlot().

    const xField = this.state.batches[0].fields[xMetric.fieldIndices[0]];
    const yField = this.state.batches[0].fields[yMetric.fieldIndices[0]];
    const linearAxisType: plotly.AxisType = 'linear';
    const logAxisType: plotly.AxisType = 'log';
    const layout = {
      xaxis: {
        title: xField.displayName,
        type: this.state.horizontalLogScale ? logAxisType : linearAxisType
      },
      yaxis: {
        title: yField.displayName,
        type: this.state.verticalLogScale ? logAxisType : linearAxisType
      },
    };
    // In case the enabled metrics changed.
    plotly.relayout(PLOTLY_DIV_NAME, layout);

    this.updateOverlay();
  }

  private updateOverlay() {
    const overlay = document.querySelector('plot-overlay-ui');
    if (overlay) {
      overlay.state = this.state;
      overlay.requestUpdate();
    }
  }

  /** Clears then fills this.plotlyData. */
  private setPlotlyData(xMetric: FieldMetric, yMetric: FieldMetric) {
    // Keep the plotlyData object because it will be used by any further call to
    // plotly.redraw().
    // this.plotlyData = [] would create a new object and loose the reference.
    this.plotlyData.length = 0;

    if (this.state.metrics.length === 0) return;
    const referenceBatch =
        this.state.batchSelections[this.state.referenceBatchSelectionIndex]
            .batch;

    let numMatches = 0;
    for (const batchSelection of this.state.batchSelections) {
      if (batchSelection.batch.index !==
          this.state.referenceBatchSelectionIndex) {
        numMatches += batchSelection.matchedDataPoints.rows.length;
      }
    }
    const matchDotSize = Math.max(1, Math.min(5, 5000 / (numMatches + 1)));
    const MEAN_DOT_SIZE = 15;
    const showRelativeRatios = this.state.showRelativeRatios;
    const useGeometricMean = showRelativeRatios && this.state.useGeometricMean;

    if (this.state.showEachPoint) {
      for (const batchSelection of this.state.batchSelections) {
        if (batchSelection.matchedDataPoints.rows.length === 0) continue;
        const batch = batchSelection.batch;

        const xFieldIndex = xMetric.fieldIndices[batch.index];
        const xReferenceFieldIndex = xMetric.fieldIndices[referenceBatch.index];
        const yFieldIndex = yMetric.fieldIndices[batch.index];
        const yReferenceFieldIndex = yMetric.fieldIndices[referenceBatch.index];
        const textFieldIndex = findImageNameFieldIndex(batch);
        const xField = batch.fields[xFieldIndex];
        const yField = batch.fields[yFieldIndex];
        const xAxis = xField.displayName;
        const yAxis = yField.displayName;

        // No need to display a lot of points exactly at 1,1.
        if (batch.index !== this.state.referenceBatchSelectionIndex ||
            !showRelativeRatios) {
          // Map matched indices to relative values.
          const x: number[] = [];
          const y: number[] = [];
          const text: string[] = [];
          for (const match of batchSelection.matchedDataPoints.rows) {
            const entry = batch.rows[match.leftIndex];
            const referenceEntry = referenceBatch.rows[match.rightIndex];

            const xValue = entry[xFieldIndex];
            const yValue = entry[yFieldIndex];
            const xReferenceValue = referenceEntry[xReferenceFieldIndex];
            const yReferenceValue = referenceEntry[yReferenceFieldIndex];

            // Metrics only exist for Fields with isNumber=true.
            if (showRelativeRatios) {
              const xRatio = (xValue as number) / (xReferenceValue as number);
              const yRatio = (yValue as number) / (yReferenceValue as number);
              x.push(xRatio);
              y.push(yRatio);
            } else {
              x.push(xValue as number);
              y.push(yValue as number);
            }
            text.push(entry[textFieldIndex] as string);
          }

          let hovertemplate = '%{text}<br>';
          hovertemplate += batch.name + ' vs ' + referenceBatch.name + '<br>';
          hovertemplate += xAxis + ': %{x:.2f}<br>';
          hovertemplate += yAxis + ': %{y:.2f}';

          const pointCloud: PlotlyData = {
            x,
            y,
            text,
            mode: 'markers',
            type: 'scatter',
            name: batch.name,
            marker: {color: batch.color, size: matchDotSize},
            hoverlabel: {namelength: -1},
            hovertemplate,
            showlegend: false,
            isAggregated: false,
            batchIndices: [batch.index],
          };
          this.plotlyData.push(pointCloud);
        }
      }
    }

    // Display means after individual matches so that they appear in front and
    // are not hidden behind a mass of points.
    for (const group of this.state.groups) {
      const xMeans: number[] = [];
      const yMeans: number[] = [];
      const meanTexts: string[] = [];
      const colors: string[] = [];
      const batchIndices: number[] = [];
      let codec = '';
      let xAxis = '';
      let yAxis = '';

      for (const batchIndex of group) {
        if (this.state.batchSelections.length <= batchIndex ||
            this.state.batchSelections[batchIndex].batch.index !== batchIndex) {
          console.error('Batch/BatchSelection mishap');
          continue;
        }

        const batchSelection = this.state.batchSelections[batchIndex];
        if (batchSelection.matchedDataPoints.rows.length === 0) continue;
        const batch = batchSelection.batch;
        xAxis = batch.fields[xMetric.fieldIndices[batch.index]].displayName;
        yAxis = batch.fields[yMetric.fieldIndices[batch.index]].displayName;

        const xMetricIndex =
            this.state.metrics.findIndex((metric) => metric === xMetric);
        const yMetricIndex =
            this.state.metrics.findIndex((metric) => metric === yMetric);
        if (showRelativeRatios) {
          xMeans.push(batchSelection.stats[xMetricIndex].getRelativeMean(
              useGeometricMean));
          yMeans.push(batchSelection.stats[yMetricIndex].getRelativeMean(
              useGeometricMean));
        } else {
          xMeans.push(batchSelection.stats[xMetricIndex].getAbsoluteMean());
          yMeans.push(batchSelection.stats[yMetricIndex].getAbsoluteMean());
        }
        meanTexts.push(batch.name);
        colors.push(batch.color);
        batchIndices.push(batchIndex);
        codec = batch.codec;
      }

      if (xMeans.length > 0 && yMeans.length > 0) {
        let hovertemplate = '%{text} vs ' + referenceBatch.name + '<br>';
        hovertemplate += xAxis + ': %{x:.2f}<br>';
        hovertemplate += yAxis + ': %{y:.2f}';
        const geomeans: PlotlyData = {
          x: xMeans,
          y: yMeans,
          text: meanTexts,
          textposition: 'top right',
          mode: 'text+lines+markers',
          type: 'scatter',
          name: codec,
          marker: {color: colors, size: MEAN_DOT_SIZE},
          line: {color: colors[0]},
          hovertemplate,
          showlegend: false,
          isAggregated: true,
          batchIndices,
        };
        this.plotlyData.push(geomeans);
      }
    }
  }
}

function findImageNameFieldIndex(batch: Batch): number {
  let i = 0;
  for (const field of batch.fields) {
    if (field.id === FieldId.SOURCE_IMAGE_NAME) return i;
    ++i;
  }
  i = 0;
  for (const field of batch.fields) {
    if (!field.isNumber) return i;
    ++i;
  }
  return 0;
}
