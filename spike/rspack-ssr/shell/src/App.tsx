import type { ComponentType } from 'react';
import { useState } from 'react';

export default function App({ Widget }: { Widget: ComponentType<{ label: string }> }) {
  const [n, setN] = useState(0);
  return (
    <main>
      <h1>Spike shell</h1>
      <button data-testid="counter" onClick={() => setN((v) => v + 1)}>
        clicked {n}
      </button>
      <Widget label="from shell SSR" />
    </main>
  );
}
