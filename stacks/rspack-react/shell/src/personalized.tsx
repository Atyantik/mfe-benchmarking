/**
 * The storefront's client entry.
 *
 * Almost every page reaches the end of this file having loaded nothing but the behaviour
 * scanner and the federation runtime. That is deliberate and it is the difference between
 * "we render on the server" and "we render on the server AND the browser knows it":
 *
 *   - Behaviours enhance markup the server already produced. No framework.
 *   - Islands are mounted only when a page actually has one, from a chunk imported
 *     dynamically — so react-dom is absent from every page that does not.
 *
 * The header cart used to be an island, which meant every page carried react-dom to render a
 * number. It is a behaviour now, and only the cart drawer and the cart page remain islands.
 */
import { CART_STATE_GLOBAL, type RegistryResponse } from '@mf-eval/contracts';
import { scanBehaviors } from '@mf-eval/behaviors/runtime';
import { loadRemote } from '@module-federation/enhanced/runtime';
import { primeRegistry, register } from '@mf-eval/shell-kit';

interface Bootstrap {
  registry: RegistryResponse;
  cohort: string;
  personalized: { slot: string }[];
  behaviors: string[];
}

/** `product.gallery` lives at `product/behaviors/gallery`. The name is the address. */
const resolveBehavior = (name: string) => {
  const [remote, file] = name.split('.');
  if (!remote || !file) throw new Error(`Behaviour "${name}" must be named "<remote>.<file>".`);
  return loadRemote(`${remote}/behaviors/${file}`) as Promise<never>;
};

async function start(): Promise<void> {
  const boot = (window as unknown as Partial<Record<string, Bootstrap>>)[CART_STATE_GLOBAL];
  if (!boot) return;

  primeRegistry('web', boot.cohort, boot.registry);

  // Only the remotes this page pulls from — the owners of its behaviours and of its
  // personalized regions. Registering the whole registry would let a stray import reach a
  // remote this page has no business loading.
  const ownerOf = (qualified: string) => qualified.split('.')[0] ?? '';
  const owners = new Set([
    ...boot.behaviors.map(ownerOf),
    ...boot.personalized.map((p) => ownerOf(p.slot)),
  ]);
  register(boot.registry.remotes.filter((r) => owners.has(r.name)));

  // Behaviours first: they enhance markup that is already on screen, and on most pages they
  // are the only client code that runs at all.
  scanBehaviors(document, resolveBehavior);

  if (boot.personalized.length === 0) return;
  // react-dom lives behind this import and nowhere else on the storefront.
  const { mountIslands } = await import('./islands/index');
  await mountIslands(boot);
}

void start();
