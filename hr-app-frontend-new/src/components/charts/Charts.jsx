// Small dependency-free charts for the System Analysis page.
// Follows the dataviz rules: one hue per single-series chart (no legend box),
// thin marks with a 4px rounded data end, 1px recessive gridlines, text in text
// tokens (never the data colour), hover + keyboard-focus tooltips, and a table
// view for every chart. Series colours come from the theme's chart tokens
// (--chart-1 … --chart-5), so they follow light and dark mode.
import React, { useLayoutEffect, useRef, useState } from 'react';
import { BarChart3, CloudOff, Table as TableIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { niceTicks } from '../../pages/analytics/analyticsData';

const fmtNumber = (v) => (typeof v === 'number' ? v.toLocaleString() : v);

// Hover/focus feedback shared by every interactive mark.
const MARK = 'outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none';

// Measured container width, so SVG text renders at real pixel size.
const useWidth = (fallback = 600) => {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setWidth(Math.round(w));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
};

// One tooltip per chart, positioned relative to the chart container.
const useTooltip = () => {
  const containerRef = useRef(null);
  const [tip, setTip] = useState(null);
  const place = (x, y, value, label) => setTip({ x, y, value, label });
  const fromPointer = (e, value, label) => {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box) return;
    place(e.clientX - box.left, e.clientY - box.top, value, label);
  };
  const fromElement = (el, value, label) => {
    const box = containerRef.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!box) return;
    place(r.left - box.left + r.width / 2, r.top - box.top, value, label);
  };
  const hide = () => setTip(null);
  const markProps = (value, label) => ({
    tabIndex: 0,
    'aria-label': `${label}: ${value}`,
    onPointerMove: (e) => fromPointer(e, value, label),
    onPointerLeave: hide,
    onFocus: (e) => fromElement(e.currentTarget, value, label),
    onBlur: hide,
  });
  const node = tip ? (
    <div
      className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-[calc(100%_+_10px)] flex-col gap-px whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
      role="presentation"
      style={{ left: tip.x, top: tip.y }}
    >
      <strong className="text-sm font-semibold tabular-nums">{tip.value}</strong>
      <span className="text-muted-foreground">{tip.label}</span>
    </div>
  ) : null;
  return { containerRef, markProps, node };
};

export const DataTable = ({ columns, rows }) => (
  <Table className="[&_tr>*:last-child]:text-right [&_tr>*:last-child]:tabular-nums">
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        {columns.map((c) => (
          <TableHead key={c} scope="col" className="h-9 text-xs text-muted-foreground">{c}</TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((row, i) => (
        <TableRow key={i}>
          {row.map((cell, j) => (
            <TableCell key={j}>{fmtNumber(cell)}</TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const ChartMessage = ({ icon: Icon, children }) => (
  <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
    <Icon className="size-4" aria-hidden="true" /> {children}
  </div>
);

// Card wrapper with a Chart/Table toggle. `table` = { columns, rows }.
export const ChartCard = ({ title, subtitle, table, unavailable = false, empty = false, children }) => {
  const [showTable, setShowTable] = useState(false);
  const canToggle = !unavailable && !empty && table;
  return (
    // overflow-visible: tooltips near the top of a chart may extend past the card edge.
    <Card className="h-full overflow-visible">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
        {canToggle && (
          <CardAction>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => setShowTable((v) => !v)}
              aria-pressed={showTable}
            >
              {showTable ? <BarChart3 aria-hidden="true" /> : <TableIcon aria-hidden="true" />}
              {showTable ? 'Chart' : 'Table'}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {unavailable && <ChartMessage icon={CloudOff}>Data unavailable</ChartMessage>}
        {!unavailable && empty && <ChartMessage icon={BarChart3}>No data for this period</ChartMessage>}
        {!unavailable && !empty && (showTable ? <DataTable {...table} /> : children)}
      </CardContent>
    </Card>
  );
};

// Horizontal bars, one series. Value sits at the bar tip.
export const BarList = ({ data, unit = '' }) => {
  const { containerRef, markProps, node } = useTooltip();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="relative" ref={containerRef}>
      <ul className="m-0 list-none space-y-1.5 p-0" aria-label="Bar chart">
        {data.map((d) => {
          const valueText = `${fmtNumber(d.value)}${unit}`;
          return (
            <li
              key={d.label}
              className="grid min-h-[30px] grid-cols-[minmax(70px,38%)_1fr] items-center gap-3 sm:grid-cols-[minmax(80px,34%)_1fr]"
            >
              <span className="truncate text-sm" title={d.label}>{d.label}</span>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`block h-3.5 min-w-0 cursor-default rounded-r-[4px] bg-chart-1 ${MARK}`}
                  style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)}%` }}
                  {...markProps(valueText, d.label)}
                />
                <span className="shrink-0 text-sm font-semibold tabular-nums">{valueText}</span>
              </span>
            </li>
          );
        })}
      </ul>
      {node}
    </div>
  );
};

// Rounded-top column path: square at the baseline, 4px radius at the data end.
const columnPath = (x, y, w, h, r = 4) => {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
};

// Vertical columns, one series. Only the tallest column is labelled; the rest
// are in the tooltip and the table view.
export const ColumnChart = ({ data, height = 220, unit = '' }) => {
  const [sizeRef, width] = useWidth();
  const { containerRef, markProps, node } = useTooltip();
  const setRefs = (el) => {
    sizeRef.current = el;
    containerRef.current = el;
  };

  const pad = { top: 22, right: 8, bottom: 26, left: 34 };
  const innerW = Math.max(width - pad.left - pad.right, 50);
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(0, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const band = innerW / Math.max(data.length, 1);
  const colW = Math.min(24, Math.max(band - 2, 2) * 0.6);
  const labelEvery = band < 34 ? 2 : 1;
  const maxIndex = max > 0 ? data.findIndex((d) => d.value === max) : -1;
  const yOf = (v) => pad.top + innerH - (v / top) * innerH;

  return (
    <div className="relative" ref={setRefs}>
      <svg
        className="block overflow-visible"
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Column chart"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              className="stroke-border"
              strokeWidth={1}
              shapeRendering="crispEdges"
              x1={pad.left}
              x2={width - pad.right}
              y1={yOf(t)}
              y2={yOf(t)}
            />
            <text className="fill-muted-foreground text-[11px] tabular-nums" x={pad.left - 6} y={yOf(t)} dy="0.32em" textAnchor="end">
              {fmtNumber(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + band * i + band / 2;
          const h = (d.value / top) * innerH;
          const valueText = `${fmtNumber(d.value)}${unit}`;
          return (
            <g key={d.fullLabel || d.label} className="group/col">
              <path
                className="pointer-events-none fill-chart-1 transition-opacity group-hover/col:opacity-80 motion-reduce:transition-none"
                d={columnPath(cx - colW / 2, yOf(d.value), colW, h)}
              />
              {/* Hit target: the whole band, bigger than the painted mark. */}
              <rect
                className="cursor-default fill-transparent outline-none focus-visible:stroke-ring focus-visible:stroke-3"
                x={pad.left + band * i}
                y={pad.top}
                width={band}
                height={innerH}
                {...markProps(valueText, d.fullLabel || d.label)}
              />
              {i === maxIndex && (
                <text className="fill-foreground text-[11px] font-bold" x={cx} y={yOf(d.value) - 6} textAnchor="middle">
                  {valueText}
                </text>
              )}
              {i % labelEvery === 0 && (
                <text className="fill-muted-foreground text-[11px] tabular-nums" x={cx} y={height - 8} textAnchor="middle">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {node}
    </div>
  );
};

// One horizontal bar split into segments (e.g. request outcomes), with a
// legend and direct labels. Segments are separated by a 2px surface gap.
// `colorVar` names a CSS custom property, e.g. '--chart-2'.
export const StackedBar = ({ segments }) => {
  const { containerRef, markProps, node } = useTooltip();
  const total = segments.reduce((s, x) => s + x.value, 0);
  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div className="relative" ref={containerRef}>
      <div className="flex min-h-5 gap-0.5 text-sm font-bold tabular-nums" aria-hidden="true">
        {visible.map((s) => (
          <span key={s.key} className="min-w-0 basis-0 whitespace-nowrap text-center" style={{ flexGrow: s.value }}>
            {pct(s.value) >= 12 ? `${fmtNumber(s.value)}` : ''}
          </span>
        ))}
      </div>
      <div className="flex h-5 gap-0.5" role="list" aria-label="Stacked bar">
        {visible.map((s) => (
          <span
            key={s.key}
            role="listitem"
            className={`h-full min-w-1 basis-0 cursor-default first:rounded-l-[4px] last:rounded-r-[4px] ${MARK}`}
            style={{ flexGrow: s.value, background: `var(${s.colorVar})` }}
            {...markProps(`${fmtNumber(s.value)} (${pct(s.value)}%)`, s.label)}
          />
        ))}
      </div>
      <ul className="mt-3.5 flex list-none flex-wrap gap-x-4.5 gap-y-2 p-0 text-sm">
        {segments.map((s) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span className="size-3 shrink-0 rounded-[3px]" style={{ background: `var(${s.colorVar})` }} aria-hidden="true" />
            <span className="font-medium">{s.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {fmtNumber(s.value)} · {pct(s.value)}%
            </span>
          </li>
        ))}
      </ul>
      {node}
    </div>
  );
};
