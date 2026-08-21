import { Deferred, Full, Inert } from './hydration';
import { FaqContent } from './FaqPage';

declare const __MF_HYDRATION__: 'off' | 'deferred-idle' | 'deferred-visible' | 'full';

/** React Router picks up `Component` from a `lazy()` module. */
export function Component() {
  const mode = __MF_HYDRATION__;
  if (mode === 'off') return <Inert><FaqContent /></Inert>;
  if (mode === 'deferred-idle' || mode === 'deferred-visible') {
    return <Deferred mode={mode} name="faq"><FaqContent /></Deferred>;
  }
  return <Full><FaqContent /></Full>;
}
