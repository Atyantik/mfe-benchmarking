import type { ReactNode } from 'react';
import { CartProvider, SlotProvider, type SlotName } from '@mf-eval/react-contracts';
import type { CartStore } from '@mf-eval/contracts';
import type { ComponentType } from 'react';

export function App({
  store,
  slots,
  onSlotUse,
  children,
}: {
  store: CartStore;
  slots: Partial<Record<SlotName, ComponentType>>;
  /** Server-only: records which slots actually rendered, for CSS/JS injection. */
  onSlotUse?: (name: SlotName) => void;
  children: ReactNode;
}) {
  return (
    <CartProvider store={store}>
      <SlotProvider slots={slots} onUse={onSlotUse}>
        {children}
      </SlotProvider>
    </CartProvider>
  );
}
