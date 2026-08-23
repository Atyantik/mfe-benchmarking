/**
 * Reference catalogue — industrial electrical distribution and automation equipment.
 *
 * Deterministic: same seed, same catalogue, byte for byte. Never Math.random(), never a
 * date. Two stacks that render different data cannot be compared, so this file is as much
 * a measurement instrument as it is content.
 *
 * The domain is deliberately specific. Generic "Product 1 / Product 2" fixtures hide the
 * layout problems real catalogues have: long technical names that wrap, SKUs that must
 * stay readable, spec tables of uneven length, and facet values that actually overlap.
 */
import { mulberry32 } from './rng.ts';

export type ProductFamily = 'breaker' | 'controller' | 'ups' | 'sensor' | 'meter';
export type Availability = 'in-stock' | 'low' | 'backorder';

export interface CatalogCategory {
  id: string;
  name: string;
  family: ProductFamily;
  blurb: string;
}

export interface ProductDocument {
  name: string;
  kind: 'Datasheet' | 'Manual' | 'CAD' | 'Certificate';
  sizeKb: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  range: string;
  categoryId: string;
  family: ProductFamily;
  /** Integer cents. */
  price: number;
  availability: Availability;
  leadTimeDays: number;
  summary: string;
  description: string;
  specs: { label: string; value: string }[];
  documents: ProductDocument[];
  applications: string[];
}

export const CATEGORIES: readonly CatalogCategory[] = Object.freeze([
  {
    id: 'circuit-protection',
    name: 'Circuit protection',
    family: 'breaker' as const,
    blurb: 'Miniature and moulded-case circuit breakers, RCDs and surge protection for final distribution.',
  },
  {
    id: 'industrial-automation',
    name: 'Industrial automation',
    family: 'controller' as const,
    blurb: 'Logic controllers, distributed I/O and motion modules for machine and process control.',
  },
  {
    id: 'power-continuity',
    name: 'Power continuity',
    family: 'ups' as const,
    blurb: 'Single- and three-phase UPS for edge, network closet and small data-centre loads.',
  },
  {
    id: 'sensing-measurement',
    name: 'Sensing & measurement',
    family: 'sensor' as const,
    blurb: 'Proximity, photoelectric and pressure sensing for harsh industrial environments.',
  },
  {
    id: 'energy-monitoring',
    name: 'Energy monitoring',
    family: 'meter' as const,
    blurb: 'Panel-mount power meters and revenue-grade metering with Modbus and Ethernet.',
  },
]);

const RANGES: Record<ProductFamily, string[]> = {
  breaker: ['Acti9 iC60', 'Compact NSX', 'Easy9', 'Acti9 iDPN'],
  controller: ['Modicon M241', 'Modicon M580', 'Modicon TM3', 'Modicon M262'],
  ups: ['Galaxy VS', 'Easy UPS 3S', 'Smart-UPS Ultra', 'Galaxy VL'],
  sensor: ['OsiSense XU', 'OsiSense XS', 'OsiSense XM', 'OsiSense XC'],
  meter: ['PowerLogic PM5000', 'PowerLogic ION9000', 'PowerLogic PM8000', 'Acti9 PowerTag'],
};

const DESCRIPTORS: Record<ProductFamily, string[]> = {
  breaker: ['miniature circuit breaker', 'moulded-case circuit breaker', 'residual current device', 'surge protection device'],
  controller: ['logic controller', 'distributed I/O module', 'motion controller', 'safety controller'],
  ups: ['online double-conversion UPS', 'line-interactive UPS', 'modular UPS', 'rack-mount UPS'],
  sensor: ['inductive proximity sensor', 'photoelectric sensor', 'pressure transmitter', 'limit switch'],
  meter: ['panel power meter', 'revenue-grade meter', 'energy sensor', 'branch circuit monitor'],
};

const APPLICATIONS = [
  'Water treatment',
  'Commercial buildings',
  'Data centres',
  'Food & beverage',
  'Oil & gas',
  'Manufacturing',
  'Marine',
  'Rail infrastructure',
  'Renewables',
  'Pharmaceutical',
];

const pick = <T,>(rng: () => number, list: readonly T[]): T => list[Math.floor(rng() * list.length)] as T;

function specsFor(family: ProductFamily, rng: () => number): { label: string; value: string }[] {
  const common = [
    { label: 'Mounting', value: pick(rng, ['DIN rail', 'Panel mount', 'Rack 19"', 'Wall mount']) },
    { label: 'Operating temperature', value: `${-25 + Math.floor(rng() * 10)}°C to ${55 + Math.floor(rng() * 20)}°C` },
    { label: 'Ingress protection', value: pick(rng, ['IP20', 'IP54', 'IP65', 'IP67']) },
    { label: 'Certifications', value: pick(rng, ['IEC 61439, UL 508A', 'IEC 60947-2, CE', 'UL 61800-5-1, CSA', 'IEC 62443-4-2']) },
    { label: 'Warranty', value: `${2 + Math.floor(rng() * 4)} years` },
  ];
  const byFamily: Record<ProductFamily, { label: string; value: string }[]> = {
    breaker: [
      { label: 'Rated current', value: `${pick(rng, [6, 10, 16, 20, 25, 32, 40, 63, 80, 100])} A` },
      { label: 'Poles', value: pick(rng, ['1P', '1P+N', '2P', '3P', '4P']) },
      { label: 'Breaking capacity', value: `${pick(rng, [6, 10, 15, 25, 36])} kA` },
      { label: 'Curve', value: pick(rng, ['B', 'C', 'D']) },
      { label: 'Rated voltage', value: `${pick(rng, [230, 400, 415, 690])} V AC` },
    ],
    controller: [
      { label: 'Digital I/O', value: `${pick(rng, [14, 24, 40, 64])} channels` },
      { label: 'Analogue inputs', value: `${pick(rng, [2, 4, 8, 16])} channels` },
      { label: 'Programming', value: pick(rng, ['IEC 61131-3', 'IEC 61131-3 + PLCopen']) },
      { label: 'Communication', value: pick(rng, ['Modbus TCP, EtherNet/IP', 'Modbus RTU, CANopen', 'PROFINET, Modbus TCP']) },
      { label: 'Memory', value: `${pick(rng, [8, 16, 32, 64])} MB` },
    ],
    ups: [
      { label: 'Output power', value: `${pick(rng, [1, 2, 3, 5, 8, 10, 15, 20])} kVA` },
      { label: 'Topology', value: pick(rng, ['Online double conversion', 'Line interactive']) },
      { label: 'Input voltage', value: `${pick(rng, [200, 208, 230, 400])} V` },
      { label: 'Runtime at half load', value: `${pick(rng, [8, 12, 18, 25, 40])} min` },
      { label: 'Battery', value: pick(rng, ['VRLA, hot-swap', 'Lithium-ion, hot-swap']) },
    ],
    sensor: [
      { label: 'Sensing distance', value: `${pick(rng, [2, 4, 8, 12, 20, 40])} mm` },
      { label: 'Output', value: pick(rng, ['PNP NO', 'NPN NC', '4–20 mA', '0–10 V']) },
      { label: 'Supply voltage', value: pick(rng, ['12–24 V DC', '24 V DC', '24–240 V AC/DC']) },
      { label: 'Housing', value: pick(rng, ['Stainless steel M12', 'Nickel-plated brass M18', 'PBT M30']) },
      { label: 'Response time', value: `${pick(rng, [1, 2, 5, 10])} ms` },
    ],
    meter: [
      { label: 'Accuracy class', value: pick(rng, ['Class 0.2S', 'Class 0.5S', 'Class 1']) },
      { label: 'Measured parameters', value: pick(rng, ['V, A, kW, kWh, PF', 'V, A, kW, kvar, THD', 'Full harmonics to 63rd']) },
      { label: 'Sampling', value: `${pick(rng, [64, 128, 256, 512])} samples/cycle` },
      { label: 'Protocols', value: pick(rng, ['Modbus TCP, BACnet/IP', 'Modbus RTU, Ethernet', 'IEC 61850, Modbus TCP']) },
      { label: 'Display', value: pick(rng, ['Backlit LCD', 'Colour TFT', 'None — remote only']) },
    ],
  };
  return [...(byFamily[family] as { label: string; value: string }[]), ...common];
}

function buildCatalog(): Product[] {
  const rng = mulberry32(0x5eed);
  const out: Product[] = [];
  const perCategory = 12;

  for (const category of CATEGORIES) {
    for (let i = 0; i < perCategory; i += 1) {
      const n = out.length + 1;
      const range = pick(rng, RANGES[category.family]);
      const descriptor = pick(rng, DESCRIPTORS[category.family]);
      const rating = specsFor(category.family, rng);
      const headline = rating[0]?.value ?? '';
      const availabilityRoll = rng();
      const availability: Availability =
        availabilityRoll > 0.72 ? 'in-stock' : availabilityRoll > 0.3 ? 'low' : 'backorder';

      const applications = Array.from(
        new Set(Array.from({ length: 3 }, () => pick(rng, APPLICATIONS))),
      );

      out.push({
        id: `p-${String(n).padStart(4, '0')}`,
        name: `${range} ${headline} ${descriptor}`,
        sku: `${range.split(' ')[0]?.slice(0, 3).toUpperCase()}${String(1000 + n)}-${String.fromCharCode(65 + (n % 26))}${(n * 7) % 100}`,
        range,
        categoryId: category.id,
        family: category.family,
        price: 4900 + Math.floor(rng() * 480000),
        availability,
        leadTimeDays: availability === 'in-stock' ? 1 + Math.floor(rng() * 3) : 5 + Math.floor(rng() * 30),
        summary: `${descriptor.charAt(0).toUpperCase()}${descriptor.slice(1)} rated ${headline}, for ${applications[0]?.toLowerCase()} and comparable duty.`,
        description:
          `The ${range} ${descriptor} is specified for continuous industrial duty in distribution ` +
          `and control assemblies. Rated ${headline}, it is qualified to ${rating.find((r) => r.label === 'Certifications')?.value} ` +
          `and carries a ${rating.find((r) => r.label === 'Warranty')?.value} warranty. Supplied with ` +
          `terminal shrouds and a printed installation sheet; CAD models and the full technical ` +
          `datasheet are available below.`,
        specs: rating,
        documents: [
          { name: `${range} technical datasheet`, kind: 'Datasheet', sizeKb: 180 + Math.floor(rng() * 900) },
          { name: `${range} installation manual`, kind: 'Manual', sizeKb: 400 + Math.floor(rng() * 2600) },
          { name: `${range} 3D model (STEP)`, kind: 'CAD', sizeKb: 900 + Math.floor(rng() * 4000) },
          { name: 'Declaration of conformity', kind: 'Certificate', sizeKb: 60 + Math.floor(rng() * 200) },
        ],
        applications,
      });
    }
  }
  return out;
}

export const PRODUCTS: readonly Product[] = Object.freeze(buildCatalog());

export const RANGE_NAMES: readonly string[] = Object.freeze(
  [...new Set(PRODUCTS.map((p) => p.range))].sort(),
);

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function categoryById(id: string): CatalogCategory | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function productsInCategory(categoryId: string): Product[] {
  return PRODUCTS.filter((p) => p.categoryId === categoryId);
}

/** Cents → a fixed string. Intl would vary by ICU build; this must not. */
export function formatPrice(cents: number): string {
  return `$${Math.floor(cents / 100).toLocaleString('en-US')}.${String(cents % 100).padStart(2, '0')}`;
}
