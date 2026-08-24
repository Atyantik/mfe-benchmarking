import { Card } from '@mf-eval/design';

import type { Profile as ProfileData } from '../data';
import { fetchProfile } from './api';
import { Failed, Panel } from './parts';
import { SKELETONS } from '../skeletons';
import { useData } from './useData';

export const title = () => 'Profile & addresses · My account';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[length:var(--fs-xs)] font-medium uppercase tracking-[0.08em] text-ink-500">
        {label}
      </dt>
      <dd className="text-[length:var(--fs-md)] text-ink-900">{value}</dd>
    </div>
  );
}

export function Page() {
  const result = useData<ProfileData>(fetchProfile, []);
  const Skeleton = SKELETONS['account.profile'];
  if (result.state === 'loading') return Skeleton ? <Skeleton /> : null;
  if (result.state === 'error') return <Failed what="your profile" />;
  const p = result.data;

  return (
    <div className="flex flex-col gap-6" data-testid="page-account.profile">
      <Panel title="Profile">
        <Card className="p-5">
          <dl className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" value={p.name} />
            <Field label="Email" value={p.email} />
            <Field label="Company" value={p.company} />
            <Field label="Account number" value={p.accountNumber} />
            <Field label="Phone" value={p.phone} />
            <Field label="Contact preference" value={p.contactPreference === 'email' ? 'Email' : 'Phone'} />
          </dl>
        </Card>
      </Panel>

      <Panel title="Addresses">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <dl className="flex flex-col gap-1">
              <Field label="Billing" value={p.billingAddress} />
            </dl>
          </Card>
          <Card className="p-5">
            <dl className="flex flex-col gap-1">
              <Field label="Delivery" value={p.deliveryAddress} />
            </dl>
          </Card>
        </div>
      </Panel>
    </div>
  );
}
