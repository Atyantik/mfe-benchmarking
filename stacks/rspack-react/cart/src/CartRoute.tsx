import { Slot } from '@mf-eval/react-contracts';

/** The whole page is a personalized slot — see routes.tsx. */
export function Component() {
  return <Slot name="cart.page" />;
}
