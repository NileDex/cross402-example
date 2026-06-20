import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import App from './App';
import Docs from './docs/Docs';
import './index.css';

const isDocs = window.location.pathname === '/docs';

// Suppress Privy's internal React key-prop warning (unfixed upstream bug in @privy-io/react-auth)
const _error = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  const stack = typeof args[1] === 'string' ? args[1] : '';
  if (msg.includes('Each child in a list should have a unique') && stack.includes('privy')) return;
  _error(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID ?? 'cmql2jp1p01ze0claejjia2ac'}
      config={{
        loginMethods: ['wallet', 'google'],
      }}
    >
      {isDocs ? <Docs /> : <App />}
    </PrivyProvider>
  </StrictMode>,
);
