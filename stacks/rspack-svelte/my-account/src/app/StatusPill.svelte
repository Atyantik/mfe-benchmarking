<script lang="ts">
  import { STATUS_LABEL, type Order } from '../data.ts';
  let { status }: { status: Order['status'] } = $props();

  const tone = $derived(
    status === 'delivered'
      ? 'bg-ok-soft text-ok'
      : status === 'in-transit'
        ? 'bg-info-soft text-info'
        : status === 'processing'
          ? 'bg-warn-soft text-warn'
          : 'bg-sunken text-ink-500',
  );
</script>

<!--
  `data-status`, not a test id. An id that names a CATEGORY matches eight elements on the
  orders page, so any selector using it is ambiguous — which the contract checker caught. Tests
  scope to a row by its order id, then read the state from here.
-->
<span
  data-status={status}
  class={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[length:var(--fs-xs)] font-medium ${tone}`}
>{STATUS_LABEL[status]}</span>
