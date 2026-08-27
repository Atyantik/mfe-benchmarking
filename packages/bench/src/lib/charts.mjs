/**
 * Charts for the research report, as inline SVG.
 *
 * No library: the report is a single self-contained file served under a strict content policy,
 * so a CDN script is not an option and a bundled charting library would be most of the page's
 * weight to draw eight bar charts.
 *
 * The shape each chart has to carry is the point. A Core Web Vital is three things at once — a
 * value, a threshold it is measured against, and a spread across runs — and a bar chart that
 * shows only the first invites exactly the error this repo has already made once, where a
 * single sample was read as a result. Every bar therefore carries a whisker for its min and max
 * across runs, and every chart draws the "good" threshold as a line rather than leaving the
 * reader to remember it.
 */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Grouped horizontal bars: one row per route, one bar per stack.
 *
 * Horizontal because route names are long and legible written out, and because the eye compares
 * bar LENGTHS along a shared baseline far better than it compares heights across a gap.
 *
 * @param {object} options
 * @param {{label: string, series: {stack: string, mean: number, min: number, max: number}[]}[]} options.rows
 * @param {number|null} options.threshold the "good" line, drawn if the scale reaches it
 */
export function groupedBars({ title, subtitle, rows, unit, threshold = null, lowerIsBetter = true }) {
  if (!rows.length) return '';

  const LABEL_W = 132;
  const PLOT_W = 430;
  const BAR_H = 13;
  const GAP = 4;
  const ROW_PAD = 13;
  const TOP = 26;

  const stacks = [...new Set(rows.flatMap((r) => r.series.map((s) => s.stack)))];
  const rowH = stacks.length * (BAR_H + GAP) - GAP + ROW_PAD;
  const height = TOP + rows.length * rowH + 30;
  const width = LABEL_W + PLOT_W + 62;

  const peak = Math.max(
    ...rows.flatMap((r) => r.series.map((s) => s.max)),
    // Only let the threshold stretch the axis when values are near it; a 2500 ms line over a
    // 40 ms metric would flatten every bar to nothing.
    threshold && threshold <= Math.max(...rows.flatMap((r) => r.series.map((s) => s.max))) * 2.5
      ? threshold
      : 0,
  );
  const scale = peak > 0 ? PLOT_W / peak : 0;
  const x = (v) => LABEL_W + v * scale;

  const parts = [];
  parts.push(
    `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}: ` +
      rows
        .map((r) => `${r.label} — ` + r.series.map((s) => `${s.stack} ${s.mean.toFixed(1)} ${unit}`).join(', '))
        .join('; ') +
      `" class="chart">`,
  );

  parts.push(`<text x="0" y="12" class="c-title">${esc(title)}</text>`);
  if (subtitle) parts.push(`<text x="0" y="24" class="c-sub">${esc(subtitle)}</text>`);

  // Threshold line first, so bars draw over it rather than the other way round.
  if (threshold && threshold <= peak) {
    parts.push(
      `<line x1="${x(threshold).toFixed(1)}" y1="${TOP - 4}" x2="${x(threshold).toFixed(1)}" y2="${height - 26}" class="c-threshold"/>`,
      `<text x="${(x(threshold) + 4).toFixed(1)}" y="${height - 14}" class="c-threshold-label">good: ${threshold} ${esc(unit)}</text>`,
    );
  }

  rows.forEach((row, i) => {
    const rowTop = TOP + i * rowH;
    parts.push(
      `<text x="0" y="${rowTop + BAR_H - 2}" class="c-label">${esc(row.label)}</text>`,
    );
    row.series.forEach((s, k) => {
      const y = rowTop + k * (BAR_H + GAP);
      const w = Math.max(1, s.mean * scale);
      const over = threshold ? (lowerIsBetter ? s.mean > threshold : s.mean < threshold) : false;
      parts.push(
        `<rect x="${LABEL_W}" y="${y}" width="${w.toFixed(1)}" height="${BAR_H}" rx="2" class="c-bar c-${k} ${over ? 'c-over' : ''}"/>`,
      );
      // Spread across runs. Drawn even when it is a hairline: an invisible whisker is itself
      // the finding, and a metric with no visible spread is one a reader may trust.
      if (s.max > s.min) {
        const y0 = y + BAR_H / 2;
        parts.push(
          `<line x1="${x(s.min).toFixed(1)}" y1="${y0}" x2="${x(s.max).toFixed(1)}" y2="${y0}" class="c-whisker"/>`,
          `<line x1="${x(s.min).toFixed(1)}" y1="${y0 - 3}" x2="${x(s.min).toFixed(1)}" y2="${y0 + 3}" class="c-whisker"/>`,
          `<line x1="${x(s.max).toFixed(1)}" y1="${y0 - 3}" x2="${x(s.max).toFixed(1)}" y2="${y0 + 3}" class="c-whisker"/>`,
        );
      }
      parts.push(
        `<text x="${(LABEL_W + w + 6).toFixed(1)}" y="${y + BAR_H - 3}" class="c-value">${fmtValue(s.mean, unit)}</text>`,
      );
    });
  });

  // Legend, bottom-left under the labels.
  stacks.forEach((stack, k) => {
    parts.push(
      `<rect x="${k * 118}" y="${height - 22}" width="9" height="9" rx="2" class="c-bar c-${k}"/>`,
      `<text x="${k * 118 + 13}" y="${height - 14}" class="c-legend">${esc(stack)}</text>`,
    );
  });

  parts.push('</svg>');
  return parts.join('');
}

function fmtValue(v, unit) {
  if (unit === 'score') return v.toFixed(4);
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString('en-US');
  if (Math.abs(v) >= 100) return v.toFixed(0);
  if (Math.abs(v) >= 1) return v.toFixed(1);
  return v.toFixed(3);
}

/** The stylesheet the charts need. Injected once by the report. */
export const CHART_STYLE = `
.chart{display:block;width:100%;height:auto;max-width:640px;margin:0 0 .4rem;font-family:Archivo,sans-serif}
.c-title{font-size:11.5px;font-weight:650;fill:var(--ink-900)}
.c-sub{font-size:9.5px;fill:var(--ink-400)}
.c-label{font-size:10px;fill:var(--ink-700)}
.c-value{font-size:9.5px;fill:var(--ink-500);font-family:"IBM Plex Mono",monospace}
.c-legend{font-size:9.5px;fill:var(--ink-500)}
.c-bar{opacity:.9}
.c-0{fill:var(--base)}
.c-1{fill:var(--other)}
.c-over{opacity:1;stroke:var(--stop);stroke-width:1.5}
.c-whisker{stroke:var(--ink-900);stroke-width:1;opacity:.55}
.c-threshold{stroke:var(--stop);stroke-width:1;stroke-dasharray:3 3;opacity:.75}
.c-threshold-label{font-size:9px;fill:var(--stop);font-family:"IBM Plex Mono",monospace}
`;
