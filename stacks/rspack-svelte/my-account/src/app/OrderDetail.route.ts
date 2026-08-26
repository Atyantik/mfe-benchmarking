export { default as Page } from './OrderDetail.svelte';
export const title = (params: Record<string, string>) => `Order ${params.id ?? ''} · My account`;
