/** Loaded before every DOM test. Adds jest-dom matchers and resets the document. */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});
