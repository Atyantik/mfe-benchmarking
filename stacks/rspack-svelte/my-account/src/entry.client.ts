// Async boundary — see entry.server.ts. The entry must statically import nothing shared or
// MF's share scope is not initialised when the module executes (spike trap 4).
//
// The CSS import is load-bearing: without it rsbuild emits no stylesheet for this host and the
// server-rendered frame arrives unstyled.
import './styles.css';

void import('./zone.client.ts');
