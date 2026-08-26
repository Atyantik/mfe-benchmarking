<script lang="ts">
  import { SUPPORT_CHANNELS, CATEGORIES } from '@mf-eval/contracts/fixtures';
  import { SUPPORT } from '@mf-eval/contracts/testids';
  import { Breadcrumbs, Button, Card, Checkbox, Container, Field, inputClass } from '@mf-eval/design-svelte';

  /**
   * Contact — a real form that POSTs.
   *
   * No client validation library, no controlled inputs, no submit handler. Native constraint
   * validation (`required`, `type="email"`, `minlength`) does the work the browser already does
   * well, which means the page is fully usable before — and without — any JavaScript.
   */
</script>

<Container>
  <Breadcrumbs
    trail={[{ label: 'Home', href: '/' }, { label: 'Support', href: '/faq' }, { label: 'Contact' }]}
  />

  <div class="grid gap-10 py-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div>
      <h1 class="text-[length:var(--fs-3xl)] leading-tight">Talk to an engineer</h1>
      <p class="mt-2 max-w-prose text-[length:var(--fs-lg)] text-ink-600">
        Send the duty, the supply characteristics and any enclosure constraints. You will get
        two or three candidate part numbers and the reasoning behind them — not a catalogue link.
      </p>

      <Card class="mt-7 p-5 sm:p-6">
        <form data-testid={SUPPORT.contactForm} method="post" action="/contact" class="flex flex-col gap-5">
          <div class="grid gap-5 sm:grid-cols-2">
            <Field label="Full name">
              <input name="name" required autocomplete="name" data-testid={SUPPORT.contactName} class={inputClass} />
            </Field>
            <Field label="Work email">
              <input name="email" type="email" required autocomplete="email" data-testid={SUPPORT.contactEmail} class={inputClass} />
            </Field>
            <Field label="Company">
              <input name="company" autocomplete="organization" data-testid={SUPPORT.contactCompany} class={inputClass} />
            </Field>
            <Field label="Phone" hint="Optional — for complex specifications">
              <input name="phone" type="tel" autocomplete="tel" data-testid={SUPPORT.contactPhone} class={inputClass} />
            </Field>
          </div>

          <Field label="Product area">
            <select name="area" data-testid={SUPPORT.contactArea} class={inputClass}>
              <option value="" disabled selected>Select an area</option>
              {#each CATEGORIES as c (c.id)}
                <option value={c.id}>{c.name}</option>
              {/each}
              <option value="other">Something else</option>
            </select>
          </Field>

          <Field
            label="What are you specifying?"
            hint="Load, supply voltage, enclosure, environment, and any standards you must meet."
          >
            <textarea name="detail" rows={6} required minlength={20} data-testid={SUPPORT.contactDetail} class={inputClass}
            ></textarea>
          </Field>

          <Checkbox
            name="drawings"
            data-testid={SUPPORT.contactDrawings}
            label="I can supply single-line drawings or a panel schedule on request"
          />

          <div class="flex flex-wrap items-center gap-3">
            <Button type="submit" size="lg">Send enquiry</Button>
            <p class="text-[length:var(--fs-sm)] text-ink-500">Typical response: one working day.</p>
          </div>
        </form>
      </Card>
    </div>

    <aside class="flex flex-col gap-4">
      <h2 class="text-[length:var(--fs-sm)] font-semibold uppercase tracking-[0.1em] text-ink-500">
        Direct channels
      </h2>
      {#each SUPPORT_CHANNELS as c (c.name)}
        <Card class="p-4">
          <h3 class="text-[length:var(--fs-md)]">{c.name}</h3>
          <p class="mt-1 text-[length:var(--fs-sm)] text-ink-500">{c.detail}</p>
          <p class="mt-2 font-mono text-[length:var(--fs-sm)] text-brand-700">{c.value}</p>
          <p class="mt-1 text-[length:var(--fs-xs)] text-ink-500">{c.hours}</p>
        </Card>
      {/each}
      <Card class="bg-sunken p-4">
        <h3 class="text-[length:var(--fs-md)]">Before you write</h3>
        <ul class="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-[length:var(--fs-sm)] text-ink-600">
          <li>Datasheets and CAD are on every product page under Documents.</li>
          <li>Lead times and stock rules are in <a href="/faq#delivery" class="text-brand-700 underline">Delivery</a>.</li>
          <li>Returns and RMA are in <a href="/faq#warranty" class="text-brand-700 underline">Warranty</a>.</li>
        </ul>
      </Card>
    </aside>
  </div>
</Container>
