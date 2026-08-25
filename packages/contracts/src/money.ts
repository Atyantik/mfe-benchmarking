/**
 * Price formatting, deliberately NOT in the fixtures barrel.
 *
 * It lived beside the catalogue, so importing it imported the catalogue: the cart badge
 * behaviour — a component whose whole job is to write two numbers into markup — pulled in
 * 12.7 kB of product data and category definitions to format one of them.
 *
 * Nothing about a formatter belongs with test data. A pure function with no dependencies
 * gets its own module so that importing it costs what it looks like it costs.
 */
/** Cents → a fixed string. Intl would vary by ICU build; this must not. */
export function formatPrice(cents: number): string {
  return `$${Math.floor(cents / 100).toLocaleString('en-US')}.${String(cents % 100).padStart(2, '0')}`;
}
