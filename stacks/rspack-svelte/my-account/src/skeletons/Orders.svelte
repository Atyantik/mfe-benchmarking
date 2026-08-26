<script lang="ts">
  import { ACCOUNT } from '@mf-eval/contracts/testids';
  import Rows from './Rows.svelte';
</script>

<div class="flex flex-col gap-3" data-testid={ACCOUNT.skeleton('account.orders')}>
  <Rows n={8} />
</div>
