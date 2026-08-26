<script lang="ts">
  import { Button, Card, Container, inputClass } from '@mf-eval/design-svelte';
  import { AUTH } from '@mf-eval/contracts/testids';
  import { DEMO } from './session.ts';

  /**
   * The sign-in page — a document, not part of the SPA.
   *
   * This is the one place the two navigation models meet, and the shape is deliberate: the gate
   * is a server-rendered form and the application behind it is client-routed. A login screen is
   * a single-purpose document a visitor sees once; making it part of the SPA would mean
   * shipping the whole account bundle to someone who has not proved who they are yet.
   *
   * It is a real `<form method="post">`. With JavaScript disabled it still signs you in.
   */
  let { next, error, email }: { next: string; error?: string; email?: string } = $props();
</script>

<Container class="flex justify-center py-16">
  <Card class="w-full max-w-md p-8">
    <h1 class="text-[length:var(--fs-2xl)] leading-tight tracking-tight text-ink-900">Sign in</h1>
    <p class="mt-2 text-[length:var(--fs-sm)] text-ink-500">
      Trade accounts only. Orders, invoices and delivery tracking.
    </p>

    {#if error}
      <p
        role="alert"
        data-testid={AUTH.error}
        class="mt-5 rounded-md border border-line bg-alert-soft px-3 py-2 text-[length:var(--fs-sm)] text-ink-800"
      >{error}</p>
    {/if}

    <form method="post" action="/login" class="mt-6 flex flex-col gap-4" data-testid={AUTH.form}>
      <!-- Where to go afterwards, carried through the POST. Validated server-side — an
           unchecked value here is an open redirect. -->
      <input type="hidden" name="next" value={next} />

      <div class="flex flex-col gap-1.5">
        <label for="email" class="text-[length:var(--fs-sm)] font-medium text-ink-800">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autocomplete="username"
          value={email ?? DEMO.email}
          data-testid={AUTH.email}
          class={inputClass}
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="password" class="text-[length:var(--fs-sm)] font-medium text-ink-800">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autocomplete="current-password"
          data-testid={AUTH.password}
          class={inputClass}
        />
        <p class="text-[length:var(--fs-xs)] text-ink-500">{DEMO.hint}</p>
      </div>

      <Button type="submit" size="lg" data-testid={AUTH.submit} class="mt-2 w-full">Sign in</Button>
    </form>

    <p class="mt-6 border-t border-line pt-4 text-[length:var(--fs-xs)] text-ink-500">
      A reference application. Authentication is simulated; no credentials are stored or
      transmitted anywhere.
    </p>
  </Card>
</Container>
