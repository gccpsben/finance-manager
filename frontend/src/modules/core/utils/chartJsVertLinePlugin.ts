import { type Plugin } from "chart.js";

export function createVertLinePlugin(lineColor: string)
{
    let lastMouseLocation = { x:0, y:0 };
    let lastNearestDatumIndex = undefined as undefined | number;
    let lastNearestDatasetIndex = undefined as undefined | number;

    const vertLinePlugin: Plugin<'line', {}> =
    (
        {
            id: 'vertLine',
            beforeDraw: function(chart, args, options)
            {
                const context = chart.canvas.getContext('2d')!;
                const chartBounds = chart.canvas.getBoundingClientRect();

                // Check if mouse is within bound, return if not
                const isMouseWithinChartArea = (() =>
                {
                    const relativeX = lastMouseLocation.x - chartBounds.x - chart.chartArea.left;
                    const relativeY = lastMouseLocation.y - chartBounds.y - chart.chartArea.top;
                    const isWithinLeftBorder = relativeX >= 0;
                    const isWithinRightBorder = relativeX <= chart.chartArea.width;
                    const isWithinTopBorder = relativeY >= 0;
                    const isWithinBottomBorder = relativeY <= chart.chartArea.height;
                    return isWithinLeftBorder && isWithinRightBorder && isWithinTopBorder && isWithinBottomBorder;
                })();

                if (!isMouseWithinChartArea) return;

                let beforeStrokeStyle = context.strokeStyle;
                context.strokeStyle = lineColor;
                context.beginPath();
                context.moveTo(lastMouseLocation.x - chartBounds.x, chart.chartArea.top);
                context.lineTo(lastMouseLocation.x - chartBounds.x, chart.chartArea.height + chart.chartArea.top);

                if (lastNearestDatumIndex !== undefined && lastNearestDatasetIndex !== undefined)
                {
                    const activeElements = [ { datasetIndex: lastNearestDatasetIndex, index: lastNearestDatumIndex } ];
                    if (chart.tooltip) chart.tooltip.setActiveElements(activeElements, { x: lastMouseLocation.x, y: lastMouseLocation.y });
                    chart.setActiveElements(activeElements);
                }
                else
                {
                    if (chart.tooltip) chart.tooltip.setActiveElements([], { x: lastMouseLocation.x, y: lastMouseLocation.y });
                    chart.setActiveElements([]);
                }

                context.stroke();
                context.closePath();
                context.strokeStyle = beforeStrokeStyle;
            },
            afterInit: function(chart, args, options)
            {
                chart.canvas.onmouseleave = (e:MouseEvent) =>
                {
                    lastMouseLocation.x = -1;
                    lastMouseLocation.y = -1;
                };
                chart.canvas.onmousemove = (e: MouseEvent) =>
                {
                    const nearestMouseItems = chart.getElementsAtEventForMode
                    (
                        e,
                        'index',
                        { intersect: false },
                        true
                    );

                    lastMouseLocation.x = e.clientX;
                    lastMouseLocation.y = e.clientY;
                    lastNearestDatumIndex = nearestMouseItems[0]?.index;
                    lastNearestDatasetIndex = nearestMouseItems[0]?.datasetIndex;
                    chart.update();
                };
            }
        }
    );

    return vertLinePlugin;
}