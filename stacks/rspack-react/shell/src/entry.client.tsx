// Async boundary — see entry.server.tsx. Loaded only on pages with a personalized region.
//
// The CSS import is deliberate and load-bearing: the client bundle never imports Layout
// or Home (the personalized entry does not need them), so without this the web build
// would emit NO stylesheet and every page would render unstyled. Importing it here makes
// rsbuild emit the file; the server links it directly, so a page with no client JS still
// gets its styles.
import './styles.css';

void import('./personalized');
