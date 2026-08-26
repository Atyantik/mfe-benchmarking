<script lang="ts">
  let { class: klass }: { class: string } = $props();
</script>

<div class={`rounded bg-sunken ${klass}`} aria-hidden="true"></div>
