import type { Component } from 'svelte';
import Fallback from './Fallback.svelte';
import Orders from './Orders.svelte';
import Order from './Order.svelte';
import Profile from './Profile.svelte';

export const SKELETONS: Record<string, Component> = {
  'account.overview': Fallback,
  'account.orders': Orders,
  'account.order': Order,
  'account.profile': Profile,
};

/** Anything unrecognised still gets a reserved box rather than a collapsing layout. */
export const FALLBACK_SKELETON = Fallback;
