import { renderToString } from 'react-dom/server';
import App from './App';

export async function renderApp(): Promise<string> {
  const mod = await import('spike_remote/Widget');
  const Widget = (mod as { default: React.ComponentType<{ label: string }> }).default;
  return renderToString(<App Widget={Widget} />);
}
