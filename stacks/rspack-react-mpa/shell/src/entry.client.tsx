// Async boundary — see entry.server.tsx. Only ever loaded on pages that have islands.
//
// The CSS import is deliberate and load-bearing: the client bundle never imports Layout
// or Home (islands do not need them), so without this the web build emitted NO stylesheet
// at all and every MPA page rendered unstyled. Importing it here makes rsbuild emit the
// file; the server links it directly, so a zero-JS page still gets its styles and still
// loads no script.
import './shell.module.css';

void import('./islands');
