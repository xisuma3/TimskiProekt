// Small dependency-free charts for the System Analysis page.
// Follows the dataviz rules: one hue per single-series chart (no legend box),
// thin marks with a 4px rounded data end, 1px recessive gridlines, text in text
// tokens (never the data colour), hover + keyboard-focus tooltips, and a table
// view for every chart.
import React, { useLayoutEffect, useRef, useState } from 'react';
import { Button, Card, Table } from 'react-bootstrap';
import { niceTicks } from '../../pages/analytics/analyticsData';

const fmtNumber = (v) => (typeof v === 'number' ? v.toLocaleString() : v);

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
    <div className="chart-tooltip" role="presentation" style={{ left: tip.x, top: tip.y }}>
      <strong>{tip.value}</strong>
      <span>{tip.label}</span>
    </div>
  ) : null;
  return { containerRef, markProps, node };
};

export const DataTable = ({ columns, rows }) => (
  <div className="table-responsive">
    <Table size="sm" className="mb-0 chart-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{fmtNumber(cell)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  </div>
);

// Card wrapper with a Chart/Table toggle. `table` = { columns, rows }.
export const ChartCard = ({ title, subtitle, table, unavailable = false, empty = false, children }) => {
  const [showTable, setShowTable] = useState(false);
  const canToggle = !unavailable && !empty && table;
  return (
    <Card className="h-100 chart-card">
      <Card.Header className="d-flex justify-content-between align-items-start gap-3 py-3">
        <div className="min-w-0">
          <div>{title}</div>
          {subtitle && <small className="text-muted fw-normal">{subtitle}</small>}
        </div>
        {canToggle && (
          <Button
            size="sm"
            variant="light"
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
          >
            <i className={`bi ${showTable ? 'bi-bar-chart' : 'bi-table'} me-1`} aria-hidden="true" />
            {showTable ? 'Chart' : 'Table'}
          </Button>
        )}
      </Card.Header>
      <Card.Body>
        {unavailable && (
          <div className="chart-muted">
            <i className="bi bi-cloud-slash" aria-hidden="true" /> Data unavailable
          </div>
        )}
        {!unavailable && empty && (
          <div className="chart-muted">
            <i className="bi bi-bar-chart" aria-hidden="true" /> No data for this period
          </div>
        )}
        {!unavailable && !empty && (showTable ? <DataTable {...table} /> : children)}
      </Card.Body>
    </Card>
  );
};

// Horizontal bars, one series. Value sits at the bar tip.
export const BarList = ({ data, unit = '' }) => {
  const { containerRef, markProps, node } = useTooltip();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="chart-wrap" ref={containerRef}>
      <ul className="bar-list" aria-label="Bar chart">
        {data.map((d) => {
          const valueText = `${fmtNumber(d.value)}${unit}`;
          return (
            <li key={d.label} className="bar-list-row">
              <span className="bar-list-label" title={d.label}>{d.label}</span>
              <span className="bar-list-track">
                <span
                  className="bar-list-bar chart-mark"
                  style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)}%` }}
                  {...markProps(valueText, d.label)}
                />
                <span className="bar-list-value">{valueText}</span>
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
    <div className="chart-wrap" ref={setRefs}>
      <svg
        className="column-chart"
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Column chart"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={pad.left} x2={width - pad.right} y1={yOf(t)} y2={yOf(t)} />
            <text className="chart-axis" x={pad.left - 6} y={yOf(t)} dy="0.32em" textAnchor="end">
              {fmtNumber(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + band * i + band / 2;
          const h = (d.value / top) * innerH;
          const valueText = `${fmtNumber(d.value)}${unit}`;
          return (
            <g key={d.fullLabel || d.label}>
              <path className="chart-mark chart-column" d={columnPath(cx - colW / 2, yOf(d.value), colW, h)} />
              {/* Hit target: the whole band, bigger than the painted mark. */}
              <rect
                className="chart-hit"
                x={pad.left + band * i}
                y={pad.top}
                width={band}
                height={innerH}
                {...markProps(valueText, d.fullLabel || d.label)}
              />
              {i === maxIndex && (
                <text className="chart-value" x={cx} y={yOf(d.value) - 6} textAnchor="middle">
                  {valueText}
                </text>
              )}
              {i % labelEvery === 0 && (
                <text className="chart-axis" x={cx} y={height - 8} textAnchor="middle">
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
export const StackedBar = ({ segments }) => {
  const { containerRef, markProps, node } = useTooltip();
  const total = segments.reduce((s, x) => s + x.value, 0);
  const pct = (v) => (total ? Math.round((v / total) * 100) : 0);
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div className="chart-wrap" ref={containerRef}>
      <div className="stacked-labels" aria-hidden="true">
        {visible.map((s) => (
          <span key={s.key} style={{ flexGrow: s.value }}>
            {pct(s.value) >= 12 ? `${fmtNumber(s.value)}` : ''}
          </span>
        ))}
      </div>
      <div className="stacked-bar" role="list" aria-label="Stacked bar">
        {visible.map((s) => (
          <span
            key={s.key}
            role="listitem"
            className="stacked-seg chart-mark"
            style={{ flexGrow: s.value, background: `var(${s.colorVar})` }}
            {...markProps(`${fmtNumber(s.value)} (${pct(s.value)}%)`, s.label)}
          />
        ))}
      </div>
      <ul className="chart-legend">
        {segments.map((s) => (
          <li key={s.key}>
            <span className="chart-swatch" style={{ background: `var(${s.colorVar})` }} aria-hidden="true" />
            <span className="fw-semibold">{s.label}</span>
            <span className="text-muted">
              {fmtNumber(s.value)} · {pct(s.value)}%
            </span>
          </li>
        ))}
      </ul>
      {node}
    </div>
  );
};
