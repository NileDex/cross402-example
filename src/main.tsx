import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Docs from './docs/Docs';
import './index.css';

const isDocs = window.location.pathname === '/docs';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDocs ? <Docs /> : <App />}
  </StrictMode>,
);
