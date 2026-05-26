import { faStar } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_COLORS = ["#16346d", "#2563eb", "#0f8a52", "#d97706", "#7c3aed", "#db2777", "#0f766e", "#64748b"];
const GRID_COLOR = "#d7dfeb";
const TICK_COLOR = "#5f6f84";
const PRIMARY_COLOR = "#16346d";
const SECONDARY_COLOR = "#2563eb";
const SUCCESS_COLOR = "#0f8a52";
const RATING_COLOR = "#f59e0b";
const DEFAULT_INITIAL_CHART_WIDTH = 480;
const TOOLTIP_STYLE = {
  borderRadius: "16px",
  border: "1px solid #d7dfeb",
  backgroundColor: "#ffffff",
  boxShadow: "0 18px 48px rgba(15, 23, 42, 0.12)",
};

function truncateLabel(value, maxLength = 18) {
  if (!value || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function buildPieData(items) {
  return items.map((item, index) => ({
    ...item,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));
}

function hasChartValues(items) {
  return items.some((item) => Number(item.value) > 0);
}

function EmptyChartState({ message }) {
  return <p className="flex min-h-[240px] items-center justify-center text-sm text-slate-500">{message}</p>;
}

function ResponsiveChartFrame({ height, minHeight, children }) {
  const resolvedHeight = height || minHeight || 280;
  const style = {};

  if (height) {
    style.height = `${height}px`;
  }

  if (minHeight) {
    style.minHeight = `${minHeight}px`;
  }

  return (
    <div className="min-w-0" style={style}>
      <ResponsiveContainer
        width="100%"
        height="100%"
        minWidth={0}
        initialDimension={{ width: DEFAULT_INITIAL_CHART_WIDTH, height: resolvedHeight }}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function ChartCard({ title, description, actions, children }) {
  return (
    <div className="panel min-w-0 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="section-title">{title}</h2>
          <p className="section-copy mt-1">{description}</p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-6 min-w-0">{children}</div>
    </div>
  );
}

export function PieDistributionChart({ title, description, items, emptyText }) {
  const chartData = buildPieData(items);

  return (
    <ChartCard title={title} description={description}>
      {hasChartValues(items) ? (
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
          <ResponsiveChartFrame height={260}>
            <PieChart>
              <Pie
                data={chartData.filter((item) => item.value > 0)}
                dataKey="value"
                nameKey="label"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={3}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {chartData
                  .filter((item) => item.value > 0)
                  .map((item) => (
                    <Cell key={item.label} fill={item.fill} />
                  ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, _name, entry) => [`${value} tiket`, entry?.payload?.label || "Jumlah"]}
              />
            </PieChart>
          </ResponsiveChartFrame>

          <div className="min-w-0 space-y-3">
            {chartData.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span>{item.label}</span>
                  </span>
                  <span className="font-semibold text-slate-950">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyChartState message={emptyText} />
      )}
    </ChartCard>
  );
}

export function VerticalBarDistributionChart({ title, description, items, emptyText, color = SECONDARY_COLOR }) {
  return (
    <ChartCard title={title} description={description}>
      {hasChartValues(items) ? (
        <ResponsiveChartFrame height={280}>
          <BarChart data={items} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: TICK_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
            <YAxis allowDecimals={false} tick={{ fill: TICK_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, _name, entry) => [`${value} tiket`, entry?.payload?.label || "Jumlah"]}
            />
            <Bar dataKey="value" fill={color} radius={[12, 12, 0, 0]} maxBarSize={56}>
              <LabelList dataKey="value" position="top" fill="#475569" fontSize={12} fontWeight={700} />
            </Bar>
          </BarChart>
        </ResponsiveChartFrame>
      ) : (
        <EmptyChartState message={emptyText} />
      )}
    </ChartCard>
  );
}

export function HorizontalBarDistributionChart({ title, description, items, emptyText, color = PRIMARY_COLOR }) {
  const chartData = [...items].sort((left, right) => right.value - left.value);
  const chartHeight = Math.max(chartData.length * 44, 240);

  return (
    <ChartCard title={title} description={description}>
      {hasChartValues(items) ? (
        <ResponsiveChartFrame height={chartHeight} minHeight={240}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 26, left: 18, bottom: 8 }}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: TICK_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: TICK_COLOR, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={118}
              tickFormatter={(value) => truncateLabel(value)}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, _name, entry) => [`${value} tiket`, entry?.payload?.label || "Jumlah"]}
            />
            <Bar dataKey="value" fill={color} radius={[0, 12, 12, 0]} maxBarSize={28}>
              <LabelList dataKey="value" position="right" fill="#475569" fontSize={12} fontWeight={700} />
            </Bar>
          </BarChart>
        </ResponsiveChartFrame>
      ) : (
        <EmptyChartState message={emptyText} />
      )}
    </ChartCard>
  );
}

export function RatingStarsChart({ title, description, items, averageRating, emptyText }) {
  const chartData = [...items]
    .map((item) => {
      const ratingValue = Number(item.label);

      return {
        ...item,
        ratingValue,
        stars: Array.from({ length: ratingValue }, () => "\u2605").join(""),
      };
    })
    .sort((left, right) => right.ratingValue - left.ratingValue);
  const roundedAverage = averageRating ? Math.round(averageRating) : 0;

  return (
    <ChartCard title={title} description={description}>
      {hasChartValues(items) ? (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-center gap-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((value) => (
                <FontAwesomeIcon key={value} icon={faStar} className={value <= roundedAverage ? "opacity-100" : "opacity-25"} />
              ))}
            </div>
            <p className="text-sm font-medium text-amber-900">
              {averageRating ? `${averageRating.toFixed(1)} / 5 rata-rata kepuasan user` : "Belum ada rating masuk"}
            </p>
          </div>

          <ResponsiveChartFrame height={280}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 26, left: 14, bottom: 8 }}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fill: TICK_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="stars"
                tick={{ fill: TICK_COLOR, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={86}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value, _name, entry) => [`${value} rating`, `${entry?.payload?.stars || ""} bintang`]}
              />
              <Bar dataKey="value" fill={RATING_COLOR} radius={[0, 12, 12, 0]} maxBarSize={28}>
                <LabelList dataKey="value" position="right" fill="#475569" fontSize={12} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveChartFrame>
        </>
      ) : (
        <EmptyChartState message={emptyText} />
      )}
    </ChartCard>
  );
}

export function TrendAreaChart({ title, description, items, emptyText, actions }) {
  return (
    <ChartCard title={title} description={description} actions={actions}>
      {hasChartValues(items) ? (
        <ResponsiveChartFrame height={320}>
          <AreaChart data={items} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: TICK_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} interval={0} />
            <YAxis allowDecimals={false} tick={{ fill: TICK_COLOR, fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, _name, entry) => [`${value} tiket`, entry?.payload?.label || "Jumlah"]}
            />
            <Area type="monotone" dataKey="value" stroke={SUCCESS_COLOR} fill={SUCCESS_COLOR} fillOpacity={0.18} strokeWidth={3} />
          </AreaChart>
        </ResponsiveChartFrame>
      ) : (
        <EmptyChartState message={emptyText} />
      )}
    </ChartCard>
  );
}
