import { Card } from '@mf-eval/design';
import { SUPPORT_CHANNELS } from '@mf-eval/contracts/fixtures';

/**
 * The support team's contribution to the account overview.
 *
 * Third team, third widget, same page — and the account host still depends on none of them.
 * Adding a fourth is a registry entry and a slot, not a change to anyone's build config.
 */
export default function AccountSupport() {
  return (
    <Card className="flex size-full flex-col overflow-hidden p-5" data-testid="widget-account-support">
      <h3 className="text-[length:var(--fs-md)] font-semibold text-ink-900">Support</h3>
      <p className="mt-2 text-[length:var(--fs-sm)] text-ink-500">
        No open requests on this account.
      </p>
      <ul className="mt-3 flex-1 space-y-2">
        {SUPPORT_CHANNELS.slice(0, 2).map((ch) => (
          <li key={ch.name} className="text-[length:var(--fs-sm)]">
            <span className="font-medium text-ink-800">{ch.name}</span>
            <span className="text-ink-500"> · {ch.detail}</span>
          </li>
        ))}
      </ul>
      <a
        href="/faq/contact"
        data-testid="widget-support-link"
        className="mt-3 text-[length:var(--fs-sm)] font-medium text-brand-700 hover:underline"
      >
        Contact an engineer
      </a>
    </Card>
  );
}
