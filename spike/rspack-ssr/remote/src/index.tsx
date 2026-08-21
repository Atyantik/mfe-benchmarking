// Standalone entry for the remote (so it can also run on its own).
import { createRoot } from 'react-dom/client';
import Widget from './Widget';

const el = document.getElementById('root');
if (el) createRoot(el).render(<Widget label="standalone" />);
