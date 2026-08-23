/**
 * Editorial content — home page and support centre.
 *
 * Written out rather than generated. Real copy exposes layout problems that lorem hides:
 * headings of unequal length, answers that run to a paragraph, link text that has to stay
 * scannable. It is also the content search engines and answer engines would actually read,
 * which is the whole reason it is server-rendered.
 */

export interface FaqTopic {
  id: string;
  title: string;
  blurb: string;
  entries: { id: string; question: string; answer: string }[];
}

export const FAQ_TOPICS: readonly FaqTopic[] = Object.freeze([
  {
    id: 'ordering',
    title: 'Ordering & accounts',
    blurb: 'Quotes, purchase orders, account terms and order changes.',
    entries: [
      {
        id: 'q-order-01',
        question: 'Can I order without a trade account?',
        answer:
          'Yes. Card checkout is available to any visitor for orders up to $10,000. Trade accounts add 30-day terms, negotiated pricing, and access to order history and scheduled deliveries. Applications are usually reviewed within two business days.',
      },
      {
        id: 'q-order-02',
        question: 'How do I convert a quote into an order?',
        answer:
          'Every quote carries a reference beginning QT-. Enter it at checkout and the lines, pricing and agreed lead times are applied to the order. Quotes are held for 30 days; after that, pricing is re-checked against the current schedule.',
      },
      {
        id: 'q-order-03',
        question: 'Can I amend or cancel an order after placing it?',
        answer:
          'Lines that have not entered picking can be amended or cancelled from the order detail page. Once a line shows Picked, contact support — configured and made-to-order items may already be in production and cannot always be recalled.',
      },
      {
        id: 'q-order-04',
        question: 'Do you supply against blanket purchase orders?',
        answer:
          'Yes. Blanket orders with scheduled call-offs are supported on trade accounts. Your account manager sets the release schedule and the remaining balance is visible on every confirmation.',
      },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery & lead times',
    blurb: 'Despatch cut-offs, freight, and what the stock indicators mean.',
    entries: [
      {
        id: 'q-ship-01',
        question: 'What do the stock indicators mean?',
        answer:
          'In stock means the quantity is on the shelf and will despatch within the stated days. Low stock means fewer than ten units remain and the lead time may move between adding to cart and checkout. Backorder means the item is scheduled from the factory, with the current estimate shown.',
      },
      {
        id: 'q-ship-02',
        question: 'When is the despatch cut-off?',
        answer:
          'Orders confirmed before 15:00 local time on a working day despatch the same day for in-stock lines. Orders placed after the cut-off, at weekends, or on public holidays are processed the next working day.',
      },
      {
        id: 'q-ship-03',
        question: 'Can you ship partial orders?',
        answer:
          'By default an order ships complete. Partial despatch can be enabled per order or as an account default — useful when one backordered line would otherwise hold up an entire panel build.',
      },
      {
        id: 'q-ship-04',
        question: 'Do you ship to site addresses?',
        answer:
          'Yes, including construction sites, provided a contact name and a delivery window are supplied. Kerbside delivery is standard for pallet freight; mechanical offload must be requested when the order is placed.',
      },
    ],
  },
  {
    id: 'technical',
    title: 'Technical support',
    blurb: 'Selection, configuration, and getting equipment commissioned.',
    entries: [
      {
        id: 'q-tech-01',
        question: 'Can you help me select a part for my application?',
        answer:
          'Yes. Send the duty, supply characteristics and enclosure constraints to the applications desk and an engineer will respond with two or three candidate part numbers and the reasoning. Typical response is one working day.',
      },
      {
        id: 'q-tech-02',
        question: 'Are CAD models and BIM objects available?',
        answer:
          'STEP models are attached to every product page under Documents. Revit and IFC objects are available on request for the distribution and UPS ranges.',
      },
      {
        id: 'q-tech-03',
        question: 'Which protocols do the power meters support?',
        answer:
          'The PowerLogic range covers Modbus RTU and Modbus TCP across the line, with BACnet/IP on the PM5000 series and IEC 61850 on ION9000. Protocol support is listed in the specification table on each product page.',
      },
      {
        id: 'q-tech-04',
        question: 'Do you provide commissioning support on site?',
        answer:
          'Site commissioning is available for UPS above 10 kVA and for controller deployments over twenty nodes. It is quoted separately and scheduled once equipment has been delivered and the panel is energised.',
      },
    ],
  },
  {
    id: 'warranty',
    title: 'Warranty & returns',
    blurb: 'Coverage, the returns process, and what happens to a failed unit.',
    entries: [
      {
        id: 'q-war-01',
        question: 'How long is the standard warranty?',
        answer:
          'Between two and five years depending on range; the exact term is in the specification table on every product page. Warranty runs from the delivery date, not the commissioning date.',
      },
      {
        id: 'q-war-02',
        question: 'How do I return an item?',
        answer:
          'Raise a return from the order detail page to receive an RMA number and a labelled despatch note. Unopened stock items can be returned within 30 days. Configured and made-to-order items are non-returnable unless faulty.',
      },
      {
        id: 'q-war-03',
        question: 'What happens to a unit returned as faulty?',
        answer:
          'It is tested on receipt. If the fault is confirmed the unit is replaced or credited, usually within five working days. If no fault is found you receive the test report and the unit is returned carriage paid.',
      },
    ],
  },
]);

export interface HomeCategoryTile {
  categoryId: string;
  label: string;
}

export const HERO = Object.freeze({
  eyebrow: 'Distribution & industrial control',
  title: 'Specify, source and commission electrical infrastructure',
  body:
    'Circuit protection, automation and power continuity from stock, with the datasheets, ' +
    'CAD models and lead times you need to close out a panel schedule — not a call-back.',
  primaryCta: { label: 'Browse the catalogue', href: '/product' },
  secondaryCta: { label: 'Talk to an engineer', href: '/faq/contact' },
  stats: [
    { value: '60', label: 'Stocked ranges' },
    { value: '24h', label: 'Applications response' },
    { value: '5yr', label: 'Warranty to' },
  ],
});

export const INDUSTRIES = Object.freeze([
  { name: 'Water & wastewater', note: 'Pumping stations, telemetry, IP-rated control' },
  { name: 'Data centres', note: 'Power continuity, branch monitoring, thermal' },
  { name: 'Food & beverage', note: 'Washdown-rated sensing and stainless housings' },
  { name: 'Rail & infrastructure', note: 'Trackside distribution and remote monitoring' },
]);

export const RESOURCES = Object.freeze([
  {
    title: 'Selection guide: breaking capacity',
    kind: 'Guide',
    body: 'Choosing between 6 kA and 36 kA devices without over-specifying the board.',
    href: '/faq#technical',
  },
  {
    title: 'Harmonics and metering accuracy',
    kind: 'Technical note',
    body: 'Why Class 0.2S matters once the load is dominated by drives and rectifiers.',
    href: '/faq#technical',
  },
  {
    title: 'Lead times and stock indicators',
    kind: 'Policy',
    body: 'What In stock, Low stock and Backorder commit us to, and when they change.',
    href: '/faq#delivery',
  },
]);

export const SUPPORT_CHANNELS = Object.freeze([
  {
    name: 'Applications desk',
    detail: 'Product selection, sizing and compatibility',
    value: 'applications@example.com',
    hours: 'Mon–Fri, 08:00–18:00',
  },
  {
    name: 'Order support',
    detail: 'Amendments, despatch, returns and credits',
    value: 'orders@example.com',
    hours: 'Mon–Fri, 08:00–18:00',
  },
  {
    name: 'Commissioning',
    detail: 'On-site support for UPS and controller deployments',
    value: '+1 555 0100',
    hours: 'Mon–Fri, 09:00–17:00',
  },
]);
