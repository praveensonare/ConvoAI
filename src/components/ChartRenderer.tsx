import { lazy, Suspense } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Lazy load Plotly
const Plot = lazy(() => import('react-plotly.js'));

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'radar' | 'composed' | 'heatmap' | '3d-scatter' | 'surface' | 'histogram';
  data: any[];
  xKey?: string;
  yKey?: string;
  zKey?: string;
  dataKey?: string;
  title?: string;
  colors?: string[];
  width?: number;
  height?: number;
  series?: Array<{
    name: string;
    dataKey: string;
    type?: 'line' | 'bar' | 'area';
  }>;
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export default function ChartRenderer({ config }: { config: ChartConfig }) {
  const {
    type,
    data,
    xKey = 'name',
    yKey = 'value',
    dataKey = 'value',
    title,
    colors = DEFAULT_COLORS,
    width,
    height = 300,
  } = config;

  if (!data || data.length === 0) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">No data available for chart</p>
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke={colors[0]}
                strokeWidth={2}
                dot={{ fill: colors[0] }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yKey} fill={colors[0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey={xKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey={yKey}
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis dataKey={yKey} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name="Data" data={data} fill={colors[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey={xKey} />
              <PolarRadiusAxis />
              <Radar
                name="Values"
                dataKey={yKey}
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.6}
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {series?.map((s, idx) => {
                if (s.type === 'line') {
                  return (
                    <Line
                      key={s.name}
                      type="monotone"
                      dataKey={s.dataKey}
                      stroke={colors[idx % colors.length]}
                      name={s.name}
                    />
                  );
                } else if (s.type === 'bar') {
                  return (
                    <Bar
                      key={s.name}
                      dataKey={s.dataKey}
                      fill={colors[idx % colors.length]}
                      name={s.name}
                    />
                  );
                } else if (s.type === 'area') {
                  return (
                    <Area
                      key={s.name}
                      type="monotone"
                      dataKey={s.dataKey}
                      fill={colors[idx % colors.length]}
                      stroke={colors[idx % colors.length]}
                      name={s.name}
                    />
                  );
                }
                return null;
              })}
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'heatmap':
        return (
          <Suspense fallback={<div className="p-4">Loading chart...</div>}>
            <Plot
              data={[
                {
                  z: data,
                  type: 'heatmap',
                  colorscale: 'Viridis',
                },
              ]}
              layout={{
                title: title || '',
                width: width,
                height: height,
                autosize: true,
              }}
              useResizeHandler
              style={{ width: '100%', height: '100%' }}
            />
          </Suspense>
        );

      case '3d-scatter':
        return (
          <Suspense fallback={<div className="p-4">Loading chart...</div>}>
            <Plot
              data={[
                {
                  x: data.map(d => d[xKey || 'x']),
                  y: data.map(d => d[yKey || 'y']),
                  z: data.map(d => d[zKey || 'z']),
                  mode: 'markers',
                  type: 'scatter3d',
                  marker: {
                    size: 5,
                    color: colors[0],
                  },
                },
              ]}
              layout={{
                title: title || '',
                width: width,
                height: height,
                autosize: true,
                scene: {
                  xaxis: { title: xKey || 'X' },
                  yaxis: { title: yKey || 'Y' },
                  zaxis: { title: zKey || 'Z' },
                },
              }}
              useResizeHandler
              style={{ width: '100%', height: '100%' }}
            />
          </Suspense>
        );

      case 'surface':
        return (
          <Suspense fallback={<div className="p-4">Loading chart...</div>}>
            <Plot
              data={[
                {
                  z: data,
                  type: 'surface',
                  colorscale: 'Viridis',
                },
              ]}
              layout={{
                title: title || '',
                width: width,
                height: height,
                autosize: true,
              }}
              useResizeHandler
              style={{ width: '100%', height: '100%' }}
            />
          </Suspense>
        );

      case 'histogram':
        return (
          <Suspense fallback={<div className="p-4">Loading chart...</div>}>
            <Plot
              data={[
                {
                  x: data.map(d => d[xKey || 'value']),
                  type: 'histogram',
                  marker: {
                    color: colors[0],
                  },
                },
              ]}
              layout={{
                title: title || '',
                width: width,
                height: height,
                autosize: true,
                xaxis: { title: xKey || 'Value' },
                yaxis: { title: 'Count' },
              }}
              useResizeHandler
              style={{ width: '100%', height: '100%' }}
            />
          </Suspense>
        );

      default:
        return (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700">Unsupported chart type: {type}</p>
          </div>
        );
    }
  };

  return (
    <div className="my-4 p-4 bg-white border border-slate-200 rounded-lg">
      {title && <h3 className="text-lg font-semibold text-slate-800 mb-3">{title}</h3>}
      {renderChart()}
    </div>
  );
}
