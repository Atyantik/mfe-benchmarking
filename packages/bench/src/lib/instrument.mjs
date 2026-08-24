/**
 * Page instrumentation, installed before any application script runs.
 *
 * Everything here has to be in place before the first behaviour attaches, which is why it
 * goes in an init script rather than an evaluate() after load. It observes; it never changes
 * what the page does.
 */
export const INSTRUMENT = () => {
  const bench = {
    listeners: [],
    shifts: [],
    longTasks: [],
    lcp: 0,
    patchedAt: performance.now(),
  };
  window.__mfBench = bench;

  // Every listener the page registers, with whether it carries an abort signal. A behaviour
  // that registers without one cannot be torn down, which is a leak by construction rather
  // than by accident — worth knowing even when nothing has gone wrong yet.
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function patched(type, handler, options) {
    try {
      const signal = options && typeof options === 'object' ? options.signal : undefined;
      const el = this instanceof Element ? this : null;
      bench.listeners.push({
        at: performance.now(),
        type,
        hasSignal: Boolean(signal),
        signal: signal ?? null,
        root: el?.closest?.('[data-behavior]')?.getAttribute('data-behavior') ?? null,
        tag: el ? el.tagName.toLowerCase() : String(this === window ? 'window' : 'other'),
      });
    } catch {
      /* instrumentation must never break the page */
    }
    return add.call(this, type, handler, options);
  };

  const observe = (type, handle) => {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) handle(entry);
      }).observe({ type, buffered: true });
    } catch {
      /* not every browser has every entry type */
    }
  };

  // Layout shifts, attributed to the behaviour root they happened inside — which is the only
  // way to say whether an enhancement cost CLS or merely coincided with something that did.
  observe('layout-shift', (entry) => {
    if (entry.hadRecentInput) return;
    const roots = [];
    for (const source of entry.sources ?? []) {
      const node = source.node instanceof Element ? source.node : source.node?.parentElement;
      const root = node?.closest?.('[data-behavior]');
      roots.push(root ? root.getAttribute('data-behavior') : null);
    }
    bench.shifts.push({ at: entry.startTime, value: entry.value, roots });
  });

  observe('longtask', (entry) => {
    bench.longTasks.push({ at: entry.startTime, duration: entry.duration });
  });

  observe('largest-contentful-paint', (entry) => {
    bench.lcp = entry.startTime;
  });
};

/** Read everything back, plus the behaviour marks the runtime emitted. */
export const COLLECT = () => {
  const bench = window.__mfBench ?? { listeners: [], shifts: [], longTasks: [], lcp: 0 };

  const parse = (name) => {
    const m = /^mf:behavior:(.+)#(\d+):([a-z]+)$/.exec(name);
    return m ? { key: m[1], index: Number(m[2]), phase: m[3] } : null;
  };

  const instances = new Map();
  const at = (key, index) => {
    const id = `${key}#${index}`;
    if (!instances.has(id)) instances.set(id, { key, index, marks: {}, phases: {} });
    return instances.get(id);
  };

  for (const entry of performance.getEntriesByType('mark')) {
    const p = parse(entry.name);
    if (p) at(p.key, p.index).marks[p.phase] = entry.startTime;
  }
  for (const entry of performance.getEntriesByType('measure')) {
    const p = parse(entry.name);
    if (p) at(p.key, p.index).phases[p.phase] = entry.duration;
  }

  // What the DOM says about each root, which is what a visitor would see.
  const roots = [...document.querySelectorAll('[data-behavior]')].map((el) => ({
    key: el.getAttribute('data-behavior'),
    strategy: el.getAttribute('data-behavior-when') ?? 'idle',
    state: el.getAttribute('data-behavior-state'),
    instance: Number(el.getAttribute('data-behavior-instance') ?? -1),
    testid: el.getAttribute('data-testid'),
    hasTeardown: typeof el.__mfTeardown === 'function',
    // A behaviour enhances server markup; an empty root means there was nothing to enhance.
    contentLength: el.textContent.trim().length,
    childCount: el.childElementCount,
  }));

  const nav = performance.getEntriesByType('navigation')[0];
  const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0;

  return {
    instances: [...instances.values()],
    roots,
    listeners: bench.listeners.map((l) => ({
      at: l.at,
      type: l.type,
      hasSignal: l.hasSignal,
      aborted: l.signal ? l.signal.aborted : null,
      root: l.root,
      tag: l.tag,
    })),
    shifts: bench.shifts,
    longTasks: bench.longTasks,
    timings: {
      domContentLoaded: nav?.domContentLoadedEventEnd ?? 0,
      load: nav?.loadEventEnd ?? 0,
      fcp,
      lcp: bench.lcp,
    },
    resources: performance.getEntriesByType('resource').map((r) => ({
      name: r.name,
      start: r.startTime,
      end: r.responseEnd,
      duration: r.duration,
      transfer: r.transferSize,
      encoded: r.encodedBodySize,
      decoded: r.decodedBodySize,
      initiator: r.initiatorType,
    })),
  };
};
