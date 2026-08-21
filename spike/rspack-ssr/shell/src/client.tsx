import { hydrateRoot } from 'react-dom/client';
import App from './App';

void import('spike_remote/Widget').then((mod) => {
  const Widget = (mod as { default: React.ComponentType<{ label: string }> }).default;
  performance.mark('mf:shell:hydrate:start');
  hydrateRoot(document.getElementById('root')!, <App Widget={Widget} />);
  performance.mark('mf:shell:hydrate:end');
});
