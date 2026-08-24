import { Button, Card, Container, inputClass } from '@mf-eval/design';

import { DEMO } from './session';

/**
 * The sign-in page — a document, not part of the SPA.
 *
 * This is the one place the two navigation models meet, and the shape is deliberate: the
 * gate is a server-rendered form and the application behind it is client-routed. A login
 * screen is a single-purpose document that a visitor sees once; making it part of the SPA
 * would mean shipping the whole account bundle to someone who has not proved who they are
 * yet, which is both slower and worse.
 *
 * It is a real `<form method="post">`. With JavaScript disabled it still signs you in — the
 * browser posts, the server sets a cookie and redirects. Nothing here needs a script.
 */
export function Login({
  next,
  error,
  email,
}: {
  next: string;
  error?: string | undefined;
  email?: string | undefined;
}) {
  return (
    <Container className="flex justify-center py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-[length:var(--fs-2xl)] leading-tight tracking-tight text-ink-900">
          Sign in
        </h1>
        <p className="mt-2 text-[length:var(--fs-sm)] text-ink-500">
          Trade accounts only. Orders, invoices and delivery tracking.
        </p>

        {error ? (
          <p
            role="alert"
            data-testid="login-error"
            className="mt-5 rounded-md border border-line bg-alert-soft px-3 py-2 text-[length:var(--fs-sm)] text-ink-800"
          >
            {error}
          </p>
        ) : null}

        <form method="post" action="/login" className="mt-6 flex flex-col gap-4" data-testid="login-form">
          {/* Where to go afterwards, carried through the POST. Validated server-side —
              an unchecked value here is an open redirect. */}
          <input type="hidden" name="next" value={next} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[length:var(--fs-sm)] font-medium text-ink-800">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              defaultValue={email ?? DEMO.email}
              data-testid="login-email"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[length:var(--fs-sm)] font-medium text-ink-800">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              data-testid="login-password"
              className={inputClass}
            />
            <p className="text-[length:var(--fs-xs)] text-ink-500">{DEMO.hint}</p>
          </div>

          <Button type="submit" size="lg" data-testid="login-submit" className="mt-2 w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 border-t border-line pt-4 text-[length:var(--fs-xs)] text-ink-500">
          A reference application. Authentication is simulated; no credentials are stored or
          transmitted anywhere.
        </p>
      </Card>
    </Container>
  );
}
