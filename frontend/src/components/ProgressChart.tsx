import React from 'react';

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface ProgressChartProps {
  data: DataPoint[];
  title: string;
  color?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({
  data,
  title,
  color = '#0ea5e9',
  height = 200,
  valueFormatter = (v) => v.toString(),
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
        <div className="text-center py-8 text-slate-400">No data available</div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const valueRange = maxValue - minValue || 1;

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = 800;
  const chartHeight = height;
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  // Calculate points for the line
  const points = data.map((point, index) => {
    const x = padding.left + (index / (data.length - 1 || 1)) * graphWidth;
    const y =
      padding.top +
      graphHeight -
      ((point.value - minValue) / valueRange) * graphHeight;
    return { x, y, ...point };
  });

  // Create path for the line
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Create path for the area under the line
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${chartHeight - padding.bottom} L ${padding.left} ${chartHeight - padding.bottom} Z`;

  // Y-axis labels
  const yAxisSteps = 4;
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => {
    const value = minValue + (valueRange * (yAxisSteps - i)) / yAxisSteps;
    const y = padding.top + (i / yAxisSteps) * graphHeight;
    return { value, y };
  });

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <svg
          width={chartWidth}
          height={chartHeight}
          className="w-full"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {yAxisLabels.map((label, i) => (
            <line
              key={i}
              x1={padding.left}
              y1={label.y}
              x2={chartWidth - padding.right}
              y2={label.y}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Area under the line */}
          <path d={areaPath} fill={color} fillOpacity="0.1" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={color}
              className="hover:r-6 transition-all cursor-pointer"
            >
              <title>{`${formatDate(point.date)}: ${valueFormatter(point.value)}`}</title>
            </circle>
          ))}

          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={chartHeight - padding.bottom}
            stroke="#64748b"
            strokeWidth="2"
          />

          {/* Y-axis labels */}
          {yAxisLabels.map((label, i) => (
            <text
              key={i}
              x={padding.left - 10}
              y={label.y}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#94a3b8"
              fontSize="12"
            >
              {valueFormatter(label.value)}
            </text>
          ))}

          {/* X-axis */}
          <line
            x1={padding.left}
            y1={chartHeight - padding.bottom}
            x2={chartWidth - padding.right}
            y2={chartHeight - padding.bottom}
            stroke="#64748b"
            strokeWidth="2"
          />

          {/* X-axis labels (show subset if too many) */}
          {points
            .filter((_, i) => {
              const step = Math.ceil(points.length / 8);
              return i % step === 0 || i === points.length - 1;
            })
            .map((point, i) => (
              <text
                key={i}
                x={point.x}
                y={chartHeight - padding.bottom + 20}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="12"
              >
                {formatDate(point.date)}
              </text>
            ))}
        </svg>
      </div>
    </div>
  );
};
