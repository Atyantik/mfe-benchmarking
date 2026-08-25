/**
 * The host. It contains no Svelte component of its own — it asks the remote for a mount
 * function and hands it a DOM node.
 *
 * The question this answers is not "does it load". It is whether Svelte 5's runes still work
 * on the far side of a federation boundary: `count` is `$state` and `doubled` is `$derived`,
 * both declared inside the remote, and both must keep updating when the button is clicked in
 * a document the host owns.
 */
const target = document.querySelector('#slot');
const status = document.querySelector('#status');

// Wrapped rather than top-level await: Rspack rejects TLA unless the output is an ES module,
// and turning the whole host into one is a bigger decision than this spike needs to make.
async function main() {
  try {
    const { default: mountBadge } = await import('svelte_remote/mount');
    mountBadge(target, { label: 'Basket' });
    status.textContent = 'mounted';
    status.dataset.testid = 'mount-ok';
  } catch (error) {
    status.textContent = `failed: ${error.message}`;
    status.dataset.testid = 'mount-failed';
  }
}

console.log('[host] entry executed');
main().then(() => console.log('[host] main settled')).catch((e) => console.log('[host] main threw', e));
