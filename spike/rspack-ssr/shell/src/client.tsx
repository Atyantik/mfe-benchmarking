import { hydrateRoot } from 'react-dom/client';
import App from './App';

void import('spike_remote/Widget').then((mod) => {
  const Widget = (mod).default;
  performance.mark('mf:shell:hydrate:start');
  const root = document.getElementById('root');
  if (root) hydrateRoot(root, <App Widget={Widget} />);
  performance.mark('mf:shell:hydrate:end');
});
