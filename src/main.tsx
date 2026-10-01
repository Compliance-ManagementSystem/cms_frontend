import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Did you forget to add <div id="root"> to index.html?');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
