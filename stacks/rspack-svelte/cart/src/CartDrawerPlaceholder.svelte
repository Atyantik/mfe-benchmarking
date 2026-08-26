<script lang="ts">
  import { CART } from '@mf-eval/contracts/testids';
  import './styles.css';
  /** Reserves the drawer's box. No user data, for the same reasons as MiniCartPlaceholder. */
</script>

<aside
  data-testid={CART.drawerPlaceholder}
  aria-hidden="true"
  class="min-h-[7.5rem] rounded-lg border border-line bg-card p-4 opacity-45 shadow-e1"
>
  <h2 class="text-[length:var(--fs-md)]">Your cart</h2>
  <p class="mt-2 text-[length:var(--fs-sm)]">&nbsp;</p>
</aside>
