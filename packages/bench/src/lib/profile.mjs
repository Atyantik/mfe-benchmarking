/**
 * The device and network the browser measurements pretend to be running on.
 *
 * This exists because of a gap the first research dataset made obvious: **on localhost, bytes
 * cost nothing.** `/my-account` transferred 31.6% more in one stack than the other, and both
 * reported the same Largest Contentful Paint to the millisecond — because there is no network
 * between the server and the browser, so a difference in transfer size is never paid for.
 *
 * A benchmark that measures bytes carefully and then measures their consequences on a machine
 * where bytes are free is measuring half a story. Throttling closes it: with a slow connection
 * the byte difference has somewhere to show up.
 *
 * Two profiles, and which one produced a number is recorded with it. Results from different
 * profiles describe different conditions and must never be compared.
 */

/**
 * Lighthouse's mobile defaults, which is the point — the figures should be readable next to a
 * Lighthouse report rather than against a scale only this repo uses.
 *
 *   4x CPU slowdown          mid-tier phone against a modern workstation
 *   1.6 Mbps down / 750 Kbps up, 150 ms RTT     "Slow 4G"
 *
 * `hardwareConcurrency` and the V8 heap cap are additions: Lighthouse does not constrain them,
 * but a phone has neither fourteen cores nor an unbounded heap, and code that adapts to
 * `navigator.hardwareConcurrency` would otherwise adapt to the wrong machine.
 */
const SLOW_4G = {
  // Lighthouse's mobile preset, in the units CDP expects (bytes per second).
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
};

export const PROFILES = {
  desktop: {
    id: 'desktop',
    label: 'Unthrottled, localhost',
    cpuThrottle: 1,
    network: null,
    cores: null,
    heapCapMb: null,
    viewport: null,
    describe:
      'No throttling. Fast, reproducible, and unrepresentative of any real visitor — useful for isolating a change, not for judging an experience.',
  },
  /**
   * The default, and the one the research runs use.
   *
   * Constrains everything that makes a byte or an instruction cost something — processor,
   * connection, cores, heap — and deliberately leaves the VIEWPORT alone.
   *
   * That separation is the point. A narrower viewport changes which markup renders, because the
   * design is responsive: the header's search field is `hidden lg:block`, so at 412 px it is not
   * merely smaller, it is absent. Measuring layout and measuring cost are different questions,
   * and answering them in one profile would mean the DOM-conformance check — the thing that
   * proves both stacks render the same application — was comparing two different documents.
   */
  constrained: {
    id: 'constrained',
    label: 'Constrained device on Slow 4G, reference viewport',
    cpuThrottle: 4,
    network: SLOW_4G,
    cores: 4,
    heapCapMb: 512,
    viewport: null,
    describe:
      'Lighthouse mobile conditions at the reference viewport: 4x CPU slowdown, 1.6 Mbps down, 750 Kbps up, 150 ms RTT, four cores, 512 MB heap cap.',
  },
  /**
   * The same constraints WITH a phone viewport.
   *
   * Renders different markup, so its numbers are not comparable to `constrained` or to each
   * other across a responsive breakpoint. Offered for looking at the mobile layout, not for the
   * stack comparison.
   */
  mobile: {
    id: 'mobile',
    label: 'Mid-tier phone on Slow 4G',
    cpuThrottle: 4,
    network: SLOW_4G,
    cores: 4,
    heapCapMb: 512,
    viewport: { width: 412, height: 823, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true },
    describe:
      'As `constrained`, plus a 412x823 phone viewport. Renders DIFFERENT markup — responsive classes hide and show elements — so it is not comparable to the other profiles.',
  },
};

const requested = process.env.MF_PROFILE ?? 'constrained';
if (!PROFILES[requested]) {
  throw new Error(`MF_PROFILE must be one of ${Object.keys(PROFILES).join(' | ')}, got "${requested}"`);
}

/** Which profile this process is measuring under. */
export const PROFILE = PROFILES[requested];

/**
 * Launch arguments the profile needs.
 *
 * The heap cap is a launch flag rather than a CDP call because V8 reads it at startup; there is
 * no way to shrink the ceiling of a running isolate.
 */
export function launchOptions(extra = {}) {
  const args = [...(extra.args ?? [])];
  if (PROFILE.heapCapMb) args.push(`--js-flags=--max-old-space-size=${PROFILE.heapCapMb}`);
  return { ...extra, args };
}

/** Context options the profile needs — viewport, scale factor, touch. */
export function contextOptions(extra = {}) {
  if (!PROFILE.viewport) return extra;
  const { width, height, ...rest } = PROFILE.viewport;
  return { viewport: { width, height }, ...rest, ...extra };
}

/**
 * Apply everything that has to go through the DevTools Protocol.
 *
 * Called per page rather than per browser: CPU and network emulation are attached to a session,
 * and a page opened later would otherwise measure an unthrottled machine while reporting the
 * profile's name.
 *
 * @returns the CDP session, so a caller that needs it for its own metrics does not open a second
 */
export async function applyProfile(context, page) {
  const cdp = await context.newCDPSession(page);
  if (PROFILE.cpuThrottle > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: PROFILE.cpuThrottle });
  }
  if (PROFILE.network) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, ...PROFILE.network });
  }
  if (PROFILE.cores) {
    // Not supported on every Chromium build; a missing override is worth knowing about but not
    // worth ending a run over.
    await cdp
      .send('Emulation.setHardwareConcurrencyOverride', { hardwareConcurrency: PROFILE.cores })
      .catch(() => {});
  }
  return cdp;
}

/** One line for a suite header, so every report says what it was measured on. */
export const profileBanner = () =>
  `profile: ${PROFILE.id} — ${PROFILE.describe}`;
