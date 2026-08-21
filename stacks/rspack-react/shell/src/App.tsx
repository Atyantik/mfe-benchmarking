import type { ReactNode } from 'react';
import { CartProvider, SlotProvider, type SlotName } from '@mf-eval/react-contracts';
import type { CartStore } from '@mf-eval/contracts';
import type { ComponentType } from 'react';

export function App({
  store,
  slots,
  children,
}: {
  store: CartStore;
  slots: Partial<Record<SlotName, ComponentType>>;
  children: ReactNode;
}) {
  return (
    <CartProvider store={store}>
      <SlotProvider slots={slots}>{children}</SlotProvider>
    </CartProvider>
  );
}
