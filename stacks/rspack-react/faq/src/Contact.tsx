import type { PageProps } from '@mf-eval/contracts';
import { SUPPORT_CHANNELS, CATEGORIES } from '@mf-eval/contracts/fixtures';
import {
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  Container,
  Field,
  inputClass,
} from '@mf-eval/design';

/**
 * Contact — a real form that POSTs.
 *
 * No client validation library, no controlled inputs, no submit handler. Native
 * constraint validation (`required`, `type="email"`, `minLength`) does the work the
 * browser already does well, which means the page is fully usable before — and without —
 * any JavaScript.
 */
export function Component(_props: PageProps<null>) {
  return (
    <Container>
      <Breadcrumbs
        trail={[{ label: 'Home', href: '/' }, { label: 'Support', href: '/faq' }, { label: 'Contact' }]}
      />

      <div className="grid gap-10 py-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <h1 className="text-[length:var(--fs-3xl)] leading-tight">Talk to an engineer</h1>
          <p className="mt-2 max-w-prose text-[length:var(--fs-lg)] text-ink-600">
            Send the duty, the supply characteristics and any enclosure constraints. You will
            get two or three candidate part numbers and the reasoning behind them — not a
            catalogue link.
          </p>

          <Card className="mt-7 p-5 sm:p-6">
            <form method="post" action="/contact" className="flex flex-col gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name">
                  <input name="name" required autoComplete="name" data-testid="contact-name" className={inputClass} />
                </Field>
                <Field label="Work email">
                  <input name="email" type="email" required autoComplete="email" data-testid="contact-email" className={inputClass} />
                </Field>
                <Field label="Company">
                  <input name="company" autoComplete="organization" data-testid="contact-company" className={inputClass} />
                </Field>
                <Field label="Phone" hint="Optional — for complex specifications">
                  <input name="phone" type="tel" autoComplete="tel" data-testid="contact-phone" className={inputClass} />
                </Field>
              </div>

              <Field label="Product area">
                <select name="area" data-testid="contact-area" className={inputClass} defaultValue="">
                  <option value="" disabled>Select an area</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="other">Something else</option>
                </select>
              </Field>

              <Field
                label="What are you specifying?"
                hint="Load, supply voltage, enclosure, environment, and any standards you must meet."
              >
                <textarea
                  name="detail"
                  rows={6}
                  required
                  minLength={20}
                  data-testid="contact-detail"
                  className={inputClass}
                />
              </Field>

              <Checkbox
                name="drawings"
                data-testid="contact-drawings"
                label="I can supply single-line drawings or a panel schedule on request"
              />

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" size="lg">Send enquiry</Button>
                <p className="text-[length:var(--fs-sm)] text-ink-500">
                  Typical response: one working day.
                </p>
              </div>
            </form>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <h2 className="text-[length:var(--fs-sm)] font-semibold uppercase tracking-[0.1em] text-ink-500">
            Direct channels
          </h2>
          {SUPPORT_CHANNELS.map((c) => (
            <Card key={c.name} className="p-4">
              <h3 className="text-[length:var(--fs-md)]">{c.name}</h3>
              <p className="mt-1 text-[length:var(--fs-sm)] text-ink-500">{c.detail}</p>
              <p className="mt-2 font-mono text-[length:var(--fs-sm)] text-brand-700">{c.value}</p>
              <p className="mt-1 text-[length:var(--fs-xs)] text-ink-400">{c.hours}</p>
            </Card>
          ))}
          <Card className="bg-sunken p-4">
            <h3 className="text-[length:var(--fs-md)]">Before you write</h3>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-4 text-[length:var(--fs-sm)] text-ink-600">
              <li>Datasheets and CAD are on every product page under Documents.</li>
              <li>Lead times and stock rules are in <a href="/faq#delivery" className="text-brand-700 hover:underline">Delivery</a>.</li>
              <li>Returns and RMA are in <a href="/faq#warranty" className="text-brand-700 hover:underline">Warranty</a>.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
