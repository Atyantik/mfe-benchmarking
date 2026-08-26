/**
 * @mf-eval/design-svelte — the Svelte rendering of the design system.
 *
 * The TOKENS are not here. Colours, sizes, spacing and the utility layer live in
 * `@mf-eval/design` as plain CSS and are consumed unchanged by both stacks — which is the only
 * way the visual comparison between them means anything. This package is the component layer
 * and nothing else: same DOM, same class names, same test ids, expressed in Svelte.
 */
export { cx, inputClass } from './cx.ts';

export { default as Container } from './primitives/Container.svelte';
export { default as Section } from './primitives/Section.svelte';
export { default as SectionHeader } from './primitives/SectionHeader.svelte';
export { default as Button } from './primitives/Button.svelte';
export { default as ButtonLink } from './primitives/ButtonLink.svelte';
export { default as ImageButton } from './primitives/ImageButton.svelte';
export { default as Card } from './primitives/Card.svelte';
export { default as Badge } from './primitives/Badge.svelte';
export { default as Breadcrumbs } from './primitives/Breadcrumbs.svelte';
export { default as Pagination } from './primitives/Pagination.svelte';
export { default as SpecTable } from './primitives/SpecTable.svelte';
export { default as Disclosure } from './primitives/Disclosure.svelte';
export { default as EmptyState } from './primitives/EmptyState.svelte';
export { default as Field } from './primitives/Field.svelte';
export { default as Checkbox } from './primitives/Checkbox.svelte';
export { default as Select } from './primitives/Select.svelte';

export { default as ProductThumb } from './patterns/ProductThumb.svelte';
export { default as Price } from './patterns/Price.svelte';
export { default as StockStatus } from './patterns/StockStatus.svelte';
export { default as ProductCard } from './patterns/ProductCard.svelte';
export { default as FacetGroup } from './patterns/FacetGroup.svelte';
export { default as FacetOption } from './patterns/FacetOption.svelte';
export * from './patterns/types.ts';

export { default as Picture } from './media/Picture.svelte';
export { default as HeroVideo } from './media/HeroVideo.svelte';
export { default as MediaCredit } from './media/MediaCredit.svelte';
