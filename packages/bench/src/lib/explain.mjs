/**
 * Plain-language explanations, for a reader who does not already know the vocabulary.
 *
 * Separate from `dictionary.mjs` on purpose. That file is written for someone who knows what
 * `TaskDuration` is and needs to know which CDP call produced it; this one is written for
 * someone deciding whether any of this matters, who has never heard of Interaction to Next
 * Paint and should not have to look it up to read a chart.
 *
 * Three fields, and the third is the one usually missing from technical reports:
 *
 *   what    what the number is, without jargon
 *   why     why anyone should care — in terms of what a person using the site experiences
 *   good    what a good value looks like, so a number has somewhere to sit
 */

export const METRIC_NOTES = {
  LCP: {
    title: 'Largest Contentful Paint',
    plain: 'How long until the biggest thing appears',
    what: 'The moment the largest image or block of text on the page finishes drawing. Not the first pixel — the one that makes the page look like the page.',
    why: 'It is the closest single number to "has this loaded yet" as a person experiences it. Everything before it, the visitor is looking at a mostly empty screen.',
    good: 'Google calls under 2.5 seconds good. Over 4 seconds is poor.',
  },
  FCP: {
    title: 'First Contentful Paint',
    plain: 'How long until anything appears',
    what: 'The first moment any content is drawn — a heading, a line of text, an image. It says the page has started, not that it is ready.',
    why: 'A blank screen feels broken. This is the point at which a visitor knows something is happening.',
    good: 'Under 1.8 seconds is good.',
  },
  CLS: {
    title: 'Cumulative Layout Shift',
    plain: 'How much the page jumps about while loading',
    what: 'A score, not a time. It adds up how far things move after they have already been drawn — the button that slides down as an image loads above it.',
    why: 'This is the metric behind tapping the wrong thing because the page moved underneath your finger. It is the most irritating failure on this list and the most avoidable.',
    good: 'Under 0.1 is good. Zero is achievable and is what both stacks here manage on almost every page.',
  },
  INP: {
    title: 'Interaction to Next Paint',
    plain: 'How long the page takes to react when you touch it',
    what: 'From tapping or clicking to the screen visibly responding. Measured across a real interaction rather than assumed.',
    why: 'It is the difference between a page that feels alive and one that feels stuck. A visitor forgives a slow load far more readily than a slow button.',
    good: 'Under 200 milliseconds is good.',
  },
  TBT: {
    title: 'Total Blocking Time',
    plain: 'How long the page was too busy to respond',
    what: 'While JavaScript runs, the page cannot react to anything. This adds up the time spent in chunks long enough for a person to notice — over 50 milliseconds each.',
    why: 'It is a laboratory stand-in for responsiveness. High blocking time means taps land on a page that cannot answer yet.',
    good: 'Under 300 milliseconds. Both stacks here are at zero, which is as good as it gets.',
  },
  TTFB: {
    title: 'Time to First Byte',
    plain: 'How long the server took to start replying',
    what: 'From asking for the page to the first byte of the answer arriving.',
    why: 'Everything else waits behind it. A slow server pushes every other number out.',
    good: 'Under 800 milliseconds. These measurements are on one machine with no network, so this is server thinking time only — a real connection would add to it.',
  },
  taskMs: {
    title: 'Main-thread busy time',
    plain: 'How much work the browser had to do',
    what: 'Total time the browser spent running code, calculating layout, and painting for one page load. The nearest thing to "how hard did this make the device work".',
    why: 'Work costs battery and heat, and on a cheaper phone it costs time too. Two pages can look identically fast on a good device and feel very different on a bad one.',
    good: 'There is no official threshold. Lower is better, and the comparison between two stacks is the useful part.',
  },
  scriptMs: {
    title: 'JavaScript time',
    plain: 'How long the browser spent running code',
    what: 'The part of the above that is specifically compiling and executing JavaScript.',
    why: 'It is the part most directly under a developer’s control, and the part a framework choice moves most.',
    good: 'No official threshold. Compare the two columns.',
  },
  jsHeapMb: {
    title: 'Memory held',
    plain: 'How much memory the page is using',
    what: 'What the page is still holding in memory once it has settled.',
    why: 'On a phone with several tabs open, a heavy page is the one the system throws away — so returning to it means loading it again.',
    good: 'No official threshold. Lower is better.',
  },
  domElements: {
    title: 'Page structure',
    plain: 'How many elements the page is built from',
    what: 'A count of the boxes, images, links and text blocks the page is made of.',
    why: 'Here it is a fairness check rather than a performance one. Both versions are meant to produce the identical page; if these counts differed, the comparison would be between two different websites and every other number would be meaningless.',
    good: 'Identical between the two stacks. Anything else invalidates the report.',
  },
  totalKbGzip: {
    title: 'Page weight',
    plain: 'How much has to be downloaded',
    what: 'Everything the page fetches — code, styles, photographs, video — compressed, as it travels.',
    why: 'On a slow or metered connection this is the whole experience. It is also the number most easily hidden by testing on a fast machine, where downloads are instant and weight appears free.',
    good: 'No fixed threshold; it depends what the page is for. A page carrying photographs will always be heavier than one carrying text.',
  },
  rps: {
    title: 'Server throughput',
    plain: 'How many visitors one server can answer per second',
    what: 'Requests served per second with the server already warm and under sustained load.',
    why: 'It decides how many machines the site needs, which is a running cost rather than a one-off.',
    good: 'Higher is better. The comparison between the two columns is the point.',
  },
  cpuPerRequestMs: {
    title: 'Server processor time per visitor',
    plain: 'How much processor time each page costs the server',
    what: 'Processor milliseconds spent per request.',
    why: 'The most direct measure of what a page costs to run. Throughput can be helped by other things; this is the work itself.',
    good: 'Lower is better.',
  },
  rssMb: {
    title: 'Server memory',
    plain: 'How much memory the server holds',
    what: 'Total memory the server process occupies while under load.',
    why: 'It sets the size of machine required, and how many copies fit on one.',
    good: 'Lower is better, within reason — memory that is used well is not waste.',
  },
  coldBuildMs: {
    title: 'First build',
    plain: 'How long to build everything from scratch',
    what: 'From a clean checkout with nothing cached to a finished build of every application.',
    why: 'Every new developer waits through this once, and the continuous integration system waits through it on every change.',
    good: 'Lower is better.',
  },
  incrementalMs: {
    title: 'Rebuild after one change',
    plain: 'How long to rebuild after editing one file',
    what: 'Change a single file, rebuild the application that owns it.',
    why: '**The number a developer meets most.** Dozens of times a day, per person, across every team. At scale it is the largest single cost in this report.',
    good: 'Lower is better, and the difference compounds.',
  },
  editToBrowserMs: {
    title: 'Edit to seeing it',
    plain: 'How long from changing code to seeing the change',
    what: 'A real edit, rebuilt, servers restarted, and the change confirmed present in a real browser.',
    why: 'The complete inner loop. Everything else about developer experience is downstream of it.',
    good: 'Lower is better. Neither version here has a live-reload mode, so both pay a full rebuild.',
  },
};

/** The measurement conditions, explained for someone who has not set them. */
export const PARAMETER_NOTES = [
  {
    key: 'cpuThrottleRate',
    title: 'Slowed-down processor',
    plain: 'We made the browser four times slower than this machine',
    why: 'The computer running these tests is far faster than the phone most visitors use. Measuring on it would make every version look equally fast and hide every difference. Four times slower is what Google’s own tooling uses to stand in for a mid-range phone.',
  },
  {
    key: 'network',
    title: 'Slow connection',
    plain: 'We limited the connection to roughly a poor 4G signal',
    why: 'This matters more than it sounds. Everything here runs on one machine, where downloads are instant — so a page that downloads twice as much appears to cost nothing extra. With a realistic connection, weight turns back into waiting. Before this was added, two versions differing by 31% in download size reported an identical loading time.',
  },
  {
    key: 'hardwareConcurrency',
    title: 'Fewer processor cores',
    plain: 'We told the browser it had four cores instead of fourteen',
    why: 'Some code checks how many cores are available and does more work when there are more. Left alone, it would have adapted to a machine no visitor owns.',
  },
  {
    key: 'v8HeapCapMb',
    title: 'Limited memory',
    plain: 'We capped the memory available to the page at 512 MB',
    why: 'A phone does not have unlimited memory. A page that only works because the test machine had plenty to spare is a page that will fail somewhere real.',
  },
  {
    key: 'runs',
    title: 'Three runs of everything',
    plain: 'Every measurement was taken three times, and we show all three',
    why: 'Measurements wobble. Taken once, a normal wobble looks like a result — which happened here: one run showed a version handling 7–11% more traffic, and the next showed the opposite. Three runs, with the spread shown, is what stops a wobble being reported as a finding.',
  },
];

/** How to read the spread, for someone who has not met a coefficient of variation. */
export const STABILITY_PLAIN = {
  deterministic: 'Identical every time. Any difference between the two versions is real.',
  stable: 'Barely moved between runs. A difference bigger than the wobble is real.',
  variable: 'Moved a little between runs. Useful for direction; small differences are not meaningful.',
  unstable: 'Moved a lot between runs. Not reliable enough to compare — treat these as unknown.',
};
